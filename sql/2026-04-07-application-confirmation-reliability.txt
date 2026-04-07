-- ==========================================
-- Dada: 申请确认、确认出发与靠谱度基础数据
-- 在已有 Supabase 项目中执行一次
-- ==========================================

ALTER TABLE public.activity_members
  ADD COLUMN IF NOT EXISTS status TEXT;

ALTER TABLE public.activity_members
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE public.activity_members
  ADD COLUMN IF NOT EXISTS departure_confirmed_at TIMESTAMPTZ;

-- 迁移前已经存在的报名，默认视为已通过，避免老数据突然变成待确认。
UPDATE public.activity_members
SET
  status = 'approved',
  approved_at = COALESCE(approved_at, joined_at, now())
WHERE status IS NULL;

ALTER TABLE public.activity_members
  ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE public.activity_members
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE public.activity_members
    ADD CONSTRAINT activity_members_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 清理 activity_members 旧策略，重建为“申请加入 -> 发起人确认”的权限模型。
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'activity_members'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.activity_members', policy_record.policyname);
  END LOOP;
END $$;

ALTER TABLE public.activity_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activity members are viewable by everyone" ON public.activity_members
  FOR SELECT
  USING (true);

CREATE POLICY "Users can request to join activities" ON public.activity_members
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

CREATE POLICY "Creators can update activity member status" ON public.activity_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.activities a
      WHERE a.id = activity_members.activity_id
        AND a.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.activities a
      WHERE a.id = activity_members.activity_id
        AND a.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users and creators can delete activity members" ON public.activity_members
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.activities a
      WHERE a.id = activity_members.activity_id
        AND a.creator_id = auth.uid()
    )
  );

-- 首页人数只统计已通过成员，待确认申请不占名额。
DROP VIEW IF EXISTS public.activities_with_count;

CREATE OR REPLACE VIEW public.activities_with_count AS
SELECT
  a.*,
  COALESCE(mc.cnt, 0) AS member_count,
  COALESCE(mc.pending_count, 0) AS pending_count
FROM public.activities a
LEFT JOIN (
  SELECT
    activity_id,
    COUNT(*) FILTER (WHERE status = 'approved') AS cnt,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_count
  FROM public.activity_members
  GROUP BY activity_id
) mc ON mc.activity_id = a.id;

DO $$
BEGIN
  ALTER VIEW public.activities_with_count SET (security_invoker = true);
EXCEPTION WHEN others THEN NULL;
END $$;

-- 只有发起人或已通过成员可以发活动内讨论。
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Activity members can create comments" ON public.comments;

CREATE POLICY "Activity members can create comments" ON public.comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1
        FROM public.activities a
        WHERE a.id = comments.activity_id
          AND a.creator_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.activity_members am
        WHERE am.activity_id = comments.activity_id
          AND am.user_id = auth.uid()
          AND am.status = 'approved'
      )
    )
  );

-- 只有发起人或已通过成员可以上传活动相册。
DROP POLICY IF EXISTS "Users can upload photos" ON public.activity_photos;
DROP POLICY IF EXISTS "Activity members can upload photos" ON public.activity_photos;

CREATE POLICY "Activity members can upload photos" ON public.activity_photos
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1
        FROM public.activities a
        WHERE a.id = activity_photos.activity_id
          AND a.creator_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.activity_members am
        WHERE am.activity_id = activity_photos.activity_id
          AND am.user_id = auth.uid()
          AND am.status = 'approved'
      )
    )
  );

-- 活动后互评也只面向已通过成员。
DROP POLICY IF EXISTS "Participants can create reviews" ON public.activity_reviews;
DROP POLICY IF EXISTS "Creators can review joined members" ON public.activity_reviews;

CREATE POLICY "Participants can create reviews" ON public.activity_reviews
  FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1
      FROM public.activity_members am
      WHERE am.activity_id = activity_reviews.activity_id
        AND am.user_id = auth.uid()
        AND am.status = 'approved'
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public.activity_members am2
        WHERE am2.activity_id = activity_reviews.activity_id
          AND am2.user_id = reviewee_id
          AND am2.status = 'approved'
      )
      OR EXISTS (
        SELECT 1
        FROM public.activities a2
        WHERE a2.id = activity_reviews.activity_id
          AND a2.creator_id = reviewee_id
      )
    )
  );

CREATE POLICY "Creators can review joined members" ON public.activity_reviews
  FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1
      FROM public.activities a
      WHERE a.id = activity_reviews.activity_id
        AND a.creator_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.activity_members am3
      WHERE am3.activity_id = activity_reviews.activity_id
        AND am3.user_id = reviewee_id
        AND am3.status = 'approved'
    )
  );

-- 普通用户只能通过这个函数确认自己的出发状态，不能直接改报名审核状态。
CREATE OR REPLACE FUNCTION public.confirm_activity_departure(p_activity_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.activity_members am
  SET departure_confirmed_at = now()
  WHERE am.activity_id = p_activity_id
    AND am.user_id = auth.uid()
    AND am.status = 'approved'
    AND am.departure_confirmed_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.activities a
      WHERE a.id = p_activity_id
        AND a.start_time >= now()
        AND a.start_time <= now() + INTERVAL '1 hour'
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION '确认出发仅在活动开始前1小时内开放，且必须先通过申请';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.confirm_activity_departure(UUID) TO authenticated;

-- 只暴露举报数量，不暴露举报内容，用于靠谱度扣分。
CREATE OR REPLACE FUNCTION public.get_user_report_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.user_reports
  WHERE reported_user_id = p_user_id
    AND status != 'rejected';
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_user_report_count(UUID) TO authenticated;

-- 申请加入时通知发起人：这是申请，不再是直接加入。
CREATE OR REPLACE FUNCTION public.notify_on_join()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id != (SELECT creator_id FROM public.activities WHERE id = NEW.activity_id) THEN
    INSERT INTO public.notifications (user_id, type, title, content, activity_id, from_user_id)
    VALUES (
      (SELECT creator_id FROM public.activities WHERE id = NEW.activity_id),
      'join_activity',
      '有人申请加入你的活动',
      COALESCE(
        (SELECT nickname FROM public.profiles WHERE id = NEW.user_id),
        '新用户'
      ) || ' 申请加入你的活动「' ||
      COALESCE(
        (SELECT title FROM public.activities WHERE id = NEW.activity_id),
        '未知活动'
      ) || '」',
      NEW.activity_id,
      NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_activity_join ON public.activity_members;
CREATE TRIGGER on_activity_join
  AFTER INSERT ON public.activity_members
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_join();
