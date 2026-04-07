-- ==========================================
-- Dada（搭搭）完整数据库定义
-- 即时拼局平台 - 所有表、视图、触发器、RLS、Storage
-- 在 Supabase SQL Editor 中执行
-- ==========================================
-- 依赖：activities 和 activity_members 表需先存在
-- （由初始建表 SQL 创建，见下方 §1）
-- ==========================================


-- ==========================================
-- §1  核心业务表
-- ==========================================

-- 1a. profiles 用户表
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1b. friendships 好友关系表
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS friendships_unique_pair
  ON friendships (LEAST(from_user_id, to_user_id), GREATEST(from_user_id, to_user_id))
  WHERE status != 'rejected';

DO $$ BEGIN
  ALTER TABLE friendships ADD CONSTRAINT friendships_no_self CHECK (from_user_id != to_user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their friendships" ON friendships FOR SELECT USING (auth.uid() IN (from_user_id, to_user_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can send friend requests" ON friendships FOR INSERT WITH CHECK (auth.uid() = from_user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update received requests" ON friendships FOR UPDATE USING (auth.uid() = to_user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1c. messages 私信表
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE messages ADD CONSTRAINT messages_no_self CHECK (sender_id != receiver_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS messages_chat_idx
  ON messages (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their messages" ON messages FOR SELECT USING (auth.uid() IN (sender_id, receiver_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1d. notifications 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('join_activity', 'friend_request', 'friend_accepted', 'new_message', 'new_comment')),
  title TEXT NOT NULL,
  content TEXT,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1e. comments 活动评论表
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_activity_idx ON comments (activity_id, created_at);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Activity members can create comments" ON comments;
CREATE POLICY "Activity members can create comments" ON comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1 FROM activities
        WHERE activities.id = comments.activity_id
        AND activities.creator_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM activity_members
        WHERE activity_members.activity_id = comments.activity_id
        AND activity_members.user_id = auth.uid()
        AND activity_members.status = 'approved'
      )
    )
  );

DO $$ BEGIN
  CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1f. activity_photos 活动照片表
CREATE TABLE IF NOT EXISTS activity_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_photos_activity_idx ON activity_photos (activity_id, created_at);

ALTER TABLE activity_photos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Photos are viewable by everyone" ON activity_photos FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can upload photos" ON activity_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "Users can upload photos" ON activity_photos;
DROP POLICY IF EXISTS "Activity members can upload photos" ON activity_photos;
CREATE POLICY "Activity members can upload photos" ON activity_photos
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1 FROM activities
        WHERE activities.id = activity_photos.activity_id
        AND activities.creator_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM activity_members
        WHERE activity_members.activity_id = activity_photos.activity_id
        AND activity_members.user_id = auth.uid()
        AND activity_members.status = 'approved'
      )
    )
  );

DO $$ BEGIN
  CREATE POLICY "Users can delete own photos" ON activity_photos FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ==========================================
-- §2  activities 表扩展字段
-- ==========================================

DO $$ BEGIN
  ALTER TABLE activities ADD COLUMN category TEXT DEFAULT '其他';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE activities ADD COLUMN cover_url TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 积分奖励（参与/组织活动获得积分）
DO $$ BEGIN
  ALTER TABLE activities ADD COLUMN points_reward INT DEFAULT 10;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 活动相册 Storage 桶
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true) ON CONFLICT (id) DO NOTHING;

-- photos 桶策略
DO $$ BEGIN CREATE POLICY "Photos are publicly viewable" ON storage.objects FOR SELECT USING (bucket_id = 'photos'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
DO $$ BEGIN CREATE POLICY "Users can upload own photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own photos" ON storage.objects FOR UPDATE USING (bucket_id = 'photos' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own photos" ON storage.objects FOR DELETE USING (bucket_id = 'photos' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- profiles 扩展：积分和信誉分
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN points INT DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN reputation INT DEFAULT 100;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN school_name TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN bio TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN gender TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles
    ADD CONSTRAINT profiles_gender_check
    CHECK (gender IS NULL OR gender IN ('男', '女'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.require_profile_gender_for_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'activities' THEN
    v_user_id := NEW.creator_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_user_id
      AND p.gender IN ('男', '女')
  ) THEN
    RAISE EXCEPTION '请先在我的资料中填写性别';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS require_creator_gender_trigger ON public.activities;
CREATE TRIGGER require_creator_gender_trigger
  BEFORE INSERT ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.require_profile_gender_for_activity();

DROP TRIGGER IF EXISTS require_member_gender_trigger ON public.activity_members;
CREATE TRIGGER require_member_gender_trigger
  BEFORE INSERT ON public.activity_members
  FOR EACH ROW EXECUTE FUNCTION public.require_profile_gender_for_activity();

DO $$ BEGIN
  ALTER TABLE activities ADD COLUMN gender_requirement TEXT DEFAULT '不限';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE activities ADD COLUMN meetup_note TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE activities ADD COLUMN safety_notice TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE activity_members ADD COLUMN status TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE activity_members ADD COLUMN approved_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE activity_members ADD COLUMN departure_confirmed_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE activity_members ADD COLUMN no_show_marked_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

UPDATE activity_members
SET
  status = 'approved',
  approved_at = COALESCE(approved_at, joined_at, now())
WHERE status IS NULL;

ALTER TABLE activity_members ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE activity_members ALTER COLUMN status SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE activity_members
    ADD CONSTRAINT activity_members_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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

ALTER TABLE activity_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activity members are viewable by everyone" ON activity_members
  FOR SELECT
  USING (true);

CREATE POLICY "Users must use request join function" ON activity_members
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Creators can update activity member status" ON activity_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = activity_members.activity_id
      AND activities.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = activity_members.activity_id
      AND activities.creator_id = auth.uid()
    )
  );

CREATE POLICY "Users and creators can delete activity members" ON activity_members
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM activities
      WHERE activities.id = activity_members.activity_id
      AND activities.creator_id = auth.uid()
    )
  );


-- ==========================================
-- §3  视图：活动 + 参与人数
-- ==========================================

DROP VIEW IF EXISTS activities_with_count;

CREATE OR REPLACE VIEW activities_with_count AS
SELECT
  a.*,
  COALESCE(mc.cnt, 0) AS member_count,
  COALESCE(mc.pending_count, 0) AS pending_count
FROM activities a
LEFT JOIN (
  SELECT
    activity_id,
    COUNT(*) FILTER (WHERE status = 'approved') AS cnt,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_count
  FROM activity_members
  GROUP BY activity_id
) mc ON mc.activity_id = a.id;

DO $$ BEGIN
  ALTER VIEW activities_with_count SET (security_invoker = true);
EXCEPTION WHEN others THEN NULL;
END $$;


-- ==========================================
-- §4  触发器与函数
-- ==========================================

-- 4a. 新用户注册自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, created_at)
  VALUES (
    NEW.id,
    COALESCE(SPLIT_PART(NEW.email, '@', 1), '新用户'),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4b. 加入活动时通知创建者
CREATE OR REPLACE FUNCTION public.notify_on_join()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id != (SELECT creator_id FROM activities WHERE id = NEW.activity_id) THEN
    INSERT INTO public.notifications (user_id, type, title, content, activity_id, from_user_id)
    VALUES (
      (SELECT creator_id FROM activities WHERE id = NEW.activity_id),
      'join_activity',
      '有人申请加入你的活动',
      COALESCE(
        (SELECT nickname FROM profiles WHERE id = NEW.user_id),
        '新用户'
      ) || ' 申请加入你的活动「' ||
      COALESCE(
        (SELECT title FROM activities WHERE id = NEW.activity_id),
        '未知活动'
      ) || '」',
      NEW.activity_id,
      NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_activity_join ON activity_members;
CREATE TRIGGER on_activity_join
  AFTER INSERT ON activity_members
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_join();

-- 4c. 好友申请时通知对方
CREATE OR REPLACE FUNCTION public.notify_on_friend_request()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, content, from_user_id)
  VALUES (
    NEW.to_user_id,
    'friend_request',
    '收到好友申请',
    COALESCE(
      (SELECT nickname FROM profiles WHERE id = NEW.from_user_id),
      '新用户'
    ) || ' 申请添加你为好友',
    NEW.from_user_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_friend_request ON friendships;
CREATE TRIGGER on_friend_request
  AFTER INSERT ON friendships
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_friend_request();

-- 4d. 好友通过时通知申请人
CREATE OR REPLACE FUNCTION public.notify_on_friend_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, type, title, content, from_user_id)
    VALUES (
      NEW.from_user_id,
      'friend_accepted',
      '好友申请已通过',
      COALESCE(
        (SELECT nickname FROM profiles WHERE id = NEW.to_user_id),
        '新用户'
      ) || ' 同意了你的好友申请',
      NEW.to_user_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_friend_accepted ON friendships;
CREATE TRIGGER on_friend_accepted
  AFTER UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_friend_accepted();

-- 4e. 评论活动时通知创建者
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id != (SELECT creator_id FROM activities WHERE id = NEW.activity_id) THEN
    INSERT INTO public.notifications (user_id, type, title, content, activity_id, from_user_id)
    VALUES (
      (SELECT creator_id FROM activities WHERE id = NEW.activity_id),
      'new_comment',
      '活动收到新评论',
      LEFT(NEW.content, 50),
      NEW.activity_id,
      NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_activity_comment ON comments;
CREATE TRIGGER on_activity_comment
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- 4f. 加入活动获得积分
CREATE OR REPLACE FUNCTION public.award_join_points()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles SET points = COALESCE(points, 0) + 5 WHERE id = NEW.user_id;
  UPDATE public.profiles SET points = COALESCE(points, 0) + 2 WHERE id = (SELECT creator_id FROM activities WHERE id = NEW.activity_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_join_points ON activity_members;
CREATE TRIGGER on_join_points
  AFTER INSERT ON activity_members
  FOR EACH ROW EXECUTE FUNCTION public.award_join_points();

-- 4g. 确认出发：仅允许已通过成员在活动前 1 小时内确认
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

-- 4h. 安全聚合：只返回某用户被举报数量，不暴露举报内容
CREATE OR REPLACE FUNCTION public.get_user_report_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.user_reports
  WHERE reported_user_id = p_user_id
    AND status != 'rejected';
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_user_report_count(UUID) TO authenticated;

-- 4i. 信用等级与软押金限制
CREATE OR REPLACE FUNCTION public.calculate_user_credit(p_user_id UUID)
RETURNS TABLE (
  credit_score INTEGER,
  completed_count INTEGER,
  missed_confirm_count INTEGER,
  no_show_count INTEGER,
  hosted_count INTEGER,
  active_application_count INTEGER,
  level_key TEXT,
  level_label TEXT,
  can_create_activity BOOLEAN
) AS $$
DECLARE
  v_credit_score INTEGER := 0;
  v_completed_count INTEGER := 0;
  v_missed_confirm_count INTEGER := 0;
  v_no_show_count INTEGER := 0;
  v_hosted_count INTEGER := 0;
  v_active_application_count INTEGER := 0;
  v_level_key TEXT := 'newbie';
  v_level_label TEXT := '🟢 新人';
BEGIN
  SELECT
    COUNT(*) FILTER (
      WHERE am.status = 'approved'
        AND a.start_time < now()
        AND am.departure_confirmed_at IS NOT NULL
        AND am.no_show_marked_at IS NULL
    )::INTEGER,
    COUNT(*) FILTER (
      WHERE am.status = 'approved'
        AND a.start_time < now()
        AND am.departure_confirmed_at IS NULL
        AND am.no_show_marked_at IS NULL
    )::INTEGER,
    COUNT(*) FILTER (
      WHERE am.status = 'approved'
        AND a.start_time < now()
        AND am.no_show_marked_at IS NOT NULL
    )::INTEGER,
    COUNT(*) FILTER (
      WHERE am.status IN ('pending', 'approved')
        AND a.start_time >= now()
    )::INTEGER
  INTO
    v_completed_count,
    v_missed_confirm_count,
    v_no_show_count,
    v_active_application_count
  FROM public.activity_members am
  JOIN public.activities a ON a.id = am.activity_id
  WHERE am.user_id = p_user_id;

  SELECT COUNT(*)::INTEGER
  INTO v_hosted_count
  FROM public.activities a
  WHERE a.creator_id = p_user_id
    AND a.start_time < now();

  v_credit_score := v_completed_count - v_missed_confirm_count - (v_no_show_count * 2);

  IF v_credit_score < 0 THEN
    v_level_key := 'low_credit';
    v_level_label := '🔴 低信用';
  ELSIF v_completed_count <= 2 THEN
    v_level_key := 'newbie';
    v_level_label := '🟢 新人';
  ELSIF v_hosted_count >= 3 AND v_credit_score >= 6 THEN
    v_level_key := 'quality_creator';
    v_level_label := '🟡 优质发起人';
  ELSIF v_credit_score >= 6 THEN
    v_level_key := 'high_credit';
    v_level_label := '🟣 高信用用户';
  ELSE
    v_level_key := 'regular';
    v_level_label := '🔵 普通用户';
  END IF;

  RETURN QUERY SELECT
    v_credit_score,
    v_completed_count,
    v_missed_confirm_count,
    v_no_show_count,
    v_hosted_count,
    v_active_application_count,
    v_level_key,
    v_level_label,
    v_credit_score >= 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.calculate_user_credit(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_join_activity(p_activity_id UUID)
RETURNS VOID AS $$
DECLARE
  v_activity RECORD;
  v_stats RECORD;
  v_approved_count INTEGER := 0;
BEGIN
  SELECT id, creator_id, start_time, max_members
  INTO v_activity
  FROM public.activities
  WHERE id = p_activity_id;

  IF v_activity.id IS NULL THEN
    RAISE EXCEPTION '活动不存在';
  END IF;

  IF v_activity.creator_id = auth.uid() THEN
    RAISE EXCEPTION '不能申请加入自己发起的活动';
  END IF;

  IF v_activity.start_time < now() THEN
    RAISE EXCEPTION '活动已结束，不能再申请';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.activity_members
    WHERE activity_id = p_activity_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION '你已经申请过这个活动';
  END IF;

  SELECT *
  INTO v_stats
  FROM public.calculate_user_credit(auth.uid())
  LIMIT 1;

  IF v_stats.level_key = 'newbie' AND v_stats.active_application_count >= 1 THEN
    RAISE EXCEPTION '新人一次只能报名或申请 1 个未结束活动';
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_approved_count
  FROM public.activity_members
  WHERE activity_id = p_activity_id
    AND status = 'approved';

  IF v_approved_count >= v_activity.max_members THEN
    RAISE EXCEPTION '活动名额已满';
  END IF;

  INSERT INTO public.activity_members (activity_id, user_id, status)
  VALUES (p_activity_id, auth.uid(), 'pending');
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION '你已经申请过这个活动';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.request_join_activity(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_activity_no_show(p_activity_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.activity_members am
  SET no_show_marked_at = now()
  WHERE am.activity_id = p_activity_id
    AND am.user_id = p_user_id
    AND am.status = 'approved'
    AND EXISTS (
      SELECT 1
      FROM public.activities a
      WHERE a.id = p_activity_id
        AND a.creator_id = auth.uid()
        AND a.start_time <= now()
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION '只有发起人可以在活动开始后标记鸽子';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.mark_activity_no_show(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_activity_credit_and_category()
RETURNS TRIGGER AS $$
DECLARE
  v_stats RECORD;
BEGIN
  IF NEW.category IS NULL OR btrim(NEW.category) = '' THEN
    RAISE EXCEPTION '发布活动必须选择一个活动标签';
  END IF;

  SELECT *
  INTO v_stats
  FROM public.calculate_user_credit(NEW.creator_id)
  LIMIT 1;

  IF v_stats.level_key = 'low_credit' THEN
    RAISE EXCEPTION '当前账号信用较低，暂时不能发起活动';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_activity_credit_and_category_trigger ON public.activities;
CREATE TRIGGER enforce_activity_credit_and_category_trigger
  BEFORE INSERT OR UPDATE OF category ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.enforce_activity_credit_and_category();

-- 4j. 修复函数（一次性使用，SECURITY DEFINER 绕过 RLS）
CREATE OR REPLACE FUNCTION public.fix_missing_profiles()
RETURNS void AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, created_at)
  SELECT
    u.id,
    COALESCE(SPLIT_PART(u.email, '@', 1), '用户' || LEFT(u.id::text, 6)),
    u.created_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.fix_empty_nicknames()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET nickname = COALESCE(
    SPLIT_PART((SELECT email FROM auth.users WHERE id = profiles.id), '@', 1),
    '用户' || LEFT(profiles.id::text, 6)
  )
  WHERE nickname IS NULL OR nickname = '' OR nickname LIKE '用户%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- §5  Storage 配置
-- ==========================================

-- 5a. 创建存储桶
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true) ON CONFLICT (id) DO NOTHING;

-- 5b. avatars 桶策略
DO $$ BEGIN CREATE POLICY "Avatars are publicly viewable" ON storage.objects FOR SELECT USING (bucket_id = 'avatars'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5c. covers 桶策略
DO $$ BEGIN CREATE POLICY "Covers are publicly viewable" ON storage.objects FOR SELECT USING (bucket_id = 'covers'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP POLICY IF EXISTS "Authenticated users can upload covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own covers" ON storage.objects;
DO $$ BEGIN CREATE POLICY "Users can upload own covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can update own covers" ON storage.objects FOR UPDATE USING (bucket_id = 'covers' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users can delete own covers" ON storage.objects FOR DELETE USING (bucket_id = 'covers' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ==========================================
-- §6  安全与互评
-- ==========================================

CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blocker_id, blocked_user_id)
);

DO $$ BEGIN
  ALTER TABLE blocked_users ADD CONSTRAINT blocked_users_no_self CHECK (blocker_id != blocked_user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view related block relations" ON blocked_users
    FOR SELECT USING (auth.uid() IN (blocker_id, blocked_user_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create own blocks" ON blocked_users
    FOR INSERT WITH CHECK (auth.uid() = blocker_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own blocks" ON blocked_users
    FOR DELETE USING (auth.uid() = blocker_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('user', 'activity')),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_reports_reporter_idx ON user_reports (reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_reports_target_user_idx ON user_reports (reported_user_id, created_at DESC);

ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can create reports" ON user_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view own reports" ON user_reports
    FOR SELECT USING (auth.uid() = reporter_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS activity_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  tags TEXT[] DEFAULT '{}',
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS activity_reviews_unique_pair
  ON activity_reviews (activity_id, reviewer_id, reviewee_id);

CREATE INDEX IF NOT EXISTS activity_reviews_reviewee_idx
  ON activity_reviews (reviewee_id, created_at DESC);

DO $$ BEGIN
  ALTER TABLE activity_reviews ADD CONSTRAINT activity_reviews_no_self CHECK (reviewer_id != reviewee_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE activity_reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Reviews are viewable by everyone" ON activity_reviews
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Participants can create reviews" ON activity_reviews
    FOR INSERT WITH CHECK (
      auth.uid() = reviewer_id
      AND EXISTS (
        SELECT 1 FROM activity_members am
        WHERE am.activity_id = activity_reviews.activity_id
        AND am.user_id = auth.uid()
        AND am.status = 'approved'
      )
      AND (
        EXISTS (
          SELECT 1 FROM activity_members am2
          WHERE am2.activity_id = activity_reviews.activity_id
          AND am2.user_id = reviewee_id
          AND am2.status = 'approved'
        )
        OR EXISTS (
          SELECT 1 FROM activities a2
          WHERE a2.id = activity_reviews.activity_id
          AND a2.creator_id = reviewee_id
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Creators can review joined members" ON activity_reviews
    FOR INSERT WITH CHECK (
      auth.uid() = reviewer_id
      AND EXISTS (
        SELECT 1 FROM activities a
        WHERE a.id = activity_reviews.activity_id
        AND a.creator_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM activity_members am3
        WHERE am3.activity_id = activity_reviews.activity_id
        AND am3.user_id = reviewee_id
        AND am3.status = 'approved'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own reviews" ON activity_reviews
    FOR UPDATE USING (auth.uid() = reviewer_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own reviews" ON activity_reviews
    FOR DELETE USING (auth.uid() = reviewer_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ==========================================
-- 完成！
-- 表：profiles, friendships, messages, notifications, comments, activity_photos, blocked_users, user_reports, activity_reviews
-- 视图：activities_with_count
-- 触发器：handle_new_user, notify_on_join, notify_on_friend_request, notify_on_friend_accepted, notify_on_comment, award_join_points
-- 修复函数：fix_missing_profiles, fix_empty_nicknames
-- Storage：avatars, covers, photos
-- ==========================================
