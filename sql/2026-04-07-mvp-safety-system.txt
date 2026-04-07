-- Dada MVP safety system
-- Goal: traceable, remindable, risk-aware, and lightweight enough for MVP launch.

-- ==========================================
-- 1. Profile trust fields. Never expose real phone numbers.
-- ==========================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_bound BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trust_badge TEXT NOT NULL DEFAULT '未绑定手机号',
  ADD COLUMN IF NOT EXISTS attended_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_show_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_level TEXT NOT NULL DEFAULT '新用户';

UPDATE public.profiles p
SET
  phone_bound = COALESCE(u.phone, '') <> '',
  trust_badge = CASE WHEN COALESCE(u.phone, '') <> '' THEN '已绑定手机号' ELSE '未绑定手机号' END
FROM auth.users u
WHERE u.id = p.id;

CREATE OR REPLACE FUNCTION public.sync_profile_phone_bound()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET
    phone_bound = COALESCE(NEW.phone, '') <> '',
    trust_badge = CASE WHEN COALESCE(NEW.phone, '') <> '' THEN '已绑定手机号' ELSE '未绑定手机号' END
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_phone_updated ON auth.users;
CREATE TRIGGER on_auth_user_phone_updated
  AFTER UPDATE OF phone ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_phone_bound();

-- Keep the existing new-user hook, but make it phone-safe and trust-aware.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    nickname,
    phone_bound,
    trust_badge,
    created_at
  )
  VALUES (
    NEW.id,
    COALESCE(NULLIF(SPLIT_PART(NEW.email, '@', 1), ''), NULLIF(NEW.phone, ''), '新用户'),
    COALESCE(NEW.phone, '') <> '',
    CASE WHEN COALESCE(NEW.phone, '') <> '' THEN '已绑定手机号' ELSE '未绑定手机号' END,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    phone_bound = EXCLUDED.phone_bound,
    trust_badge = EXCLUDED.trust_badge;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==========================================
-- 2. Activity safety fields and publishing constraints.
-- ==========================================

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS meeting_place_detail TEXT,
  ADD COLUMN IF NOT EXISTS public_place_confirm BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cost_type TEXT NOT NULL DEFAULT 'AA',
  ADD COLUMN IF NOT EXISTS participant_limit INT,
  ADD COLUMN IF NOT EXISTS safety_note TEXT;

UPDATE public.activities
SET
  participant_limit = COALESCE(participant_limit, max_members),
  meeting_place_detail = COALESCE(NULLIF(meeting_place_detail, ''), NULLIF(meetup_note, ''), location),
  safety_note = COALESCE(NULLIF(safety_note, ''), NULLIF(safety_notice, ''), '建议首次见面选择公共场所，并提前告知朋友行程。'),
  public_place_confirm = true
WHERE participant_limit IS NULL
  OR meeting_place_detail IS NULL
  OR safety_note IS NULL
  OR public_place_confirm = false;

DO $$ BEGIN
  ALTER TABLE public.activities
    ADD CONSTRAINT activities_cost_type_check
    CHECK (cost_type IN ('AA', '免费', '我请客', '对方请客', '待定'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.activities
    ADD CONSTRAINT activities_participant_limit_check
    CHECK (participant_limit IS NULL OR participant_limit BETWEEN 1 AND 20);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_activity_credit_and_category()
RETURNS TRIGGER AS $$
DECLARE
  v_stats RECORD;
BEGIN
  NEW.category := NULLIF(btrim(COALESCE(NEW.category, '')), '');
  NEW.location := NULLIF(btrim(COALESCE(NEW.location, '')), '');
  NEW.meeting_place_detail := NULLIF(btrim(COALESCE(NEW.meeting_place_detail, '')), '');
  NEW.safety_note := COALESCE(NULLIF(btrim(COALESCE(NEW.safety_note, '')), ''), NULLIF(btrim(COALESCE(NEW.safety_notice, '')), ''));
  NEW.participant_limit := COALESCE(NEW.participant_limit, NEW.max_members);
  NEW.max_members := COALESCE(NEW.max_members, NEW.participant_limit);

  IF NEW.category IS NULL THEN
    RAISE EXCEPTION '发布活动必须选择一个活动标签';
  END IF;

  IF NEW.location IS NULL THEN
    RAISE EXCEPTION '发布活动必须填写明确地点';
  END IF;

  IF NEW.start_time IS NULL THEN
    RAISE EXCEPTION '发布活动必须填写明确时间';
  END IF;

  IF NEW.meeting_place_detail IS NULL THEN
    RAISE EXCEPTION '请填写清楚的见面点说明';
  END IF;

  IF NEW.public_place_confirm IS NOT TRUE THEN
    RAISE EXCEPTION '首次见面建议选择公共场所，请先勾选公共场所确认';
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
  BEFORE INSERT OR UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.enforce_activity_credit_and_category();


-- ==========================================
-- 3. Reports and behavior logs.
-- ==========================================

ALTER TABLE public.user_reports
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.behavior_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'activity_created',
      'join_requested',
      'join_approved',
      'departure_confirmed',
      'activity_completed',
      'user_reported',
      'activity_reported',
      'user_blocked'
    )
  ),
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_activity_id UUID REFERENCES public.activities(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS behavior_logs_actor_idx ON public.behavior_logs (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS behavior_logs_target_user_idx ON public.behavior_logs (target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS behavior_logs_activity_idx ON public.behavior_logs (target_activity_id, created_at DESC);

ALTER TABLE public.behavior_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view related behavior logs" ON public.behavior_logs
    FOR SELECT USING (auth.uid() IN (actor_user_id, target_user_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "No direct behavior log writes" ON public.behavior_logs;
CREATE POLICY "No direct behavior log writes" ON public.behavior_logs
  FOR INSERT WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.log_behavior(
  p_event_type TEXT,
  p_actor_user_id UUID DEFAULT auth.uid(),
  p_target_user_id UUID DEFAULT NULL,
  p_target_activity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.behavior_logs (
    event_type,
    actor_user_id,
    target_user_id,
    target_activity_id,
    metadata
  )
  VALUES (
    p_event_type,
    p_actor_user_id,
    p_target_user_id,
    p_target_activity_id,
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ==========================================
-- 4. Credit, attendance, and no-show stats.
-- ==========================================

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
  v_level_label TEXT := '新用户';
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
    v_level_label := '低信用';
  ELSIF v_completed_count < 3 THEN
    v_level_key := 'newbie';
    v_level_label := '新用户';
  ELSIF v_completed_count >= 5 AND v_credit_score >= 5 THEN
    v_level_key := 'high_credit';
    v_level_label := '高信用用户';
  ELSE
    v_level_key := 'regular';
    v_level_label := '普通用户';
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

CREATE OR REPLACE FUNCTION public.refresh_user_trust_stats(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_stats RECORD;
  v_no_show_total INTEGER := 0;
  v_completion_rate NUMERIC(5,2) := 0;
BEGIN
  SELECT *
  INTO v_stats
  FROM public.calculate_user_credit(p_user_id)
  LIMIT 1;

  v_no_show_total := COALESCE(v_stats.missed_confirm_count, 0) + COALESCE(v_stats.no_show_count, 0);

  IF COALESCE(v_stats.completed_count, 0) + v_no_show_total > 0 THEN
    v_completion_rate := ROUND(
      (COALESCE(v_stats.completed_count, 0)::numeric / (COALESCE(v_stats.completed_count, 0) + v_no_show_total)::numeric) * 100,
      2
    );
  END IF;

  UPDATE public.profiles
  SET
    attended_count = COALESCE(v_stats.completed_count, 0),
    no_show_count = v_no_show_total,
    completion_rate = v_completion_rate,
    credit_level = COALESCE(v_stats.level_label, '新用户')
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.refresh_user_trust_stats(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_member_trust_stats_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.refresh_user_trust_stats(NEW.user_id);
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.refresh_user_trust_stats(OLD.user_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS refresh_member_trust_stats ON public.activity_members;
CREATE TRIGGER refresh_member_trust_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.activity_members
  FOR EACH ROW EXECUTE FUNCTION public.refresh_member_trust_stats_trigger();


-- ==========================================
-- 5. Join/block enforcement and trace logs.
-- ==========================================

CREATE OR REPLACE FUNCTION public.request_join_activity(p_activity_id UUID)
RETURNS VOID AS $$
DECLARE
  v_activity RECORD;
  v_stats RECORD;
  v_approved_count INTEGER := 0;
BEGIN
  SELECT id, creator_id, start_time, max_members, participant_limit
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
    FROM public.blocked_users bu
    WHERE (bu.blocker_id = auth.uid() AND bu.blocked_user_id = v_activity.creator_id)
       OR (bu.blocker_id = v_activity.creator_id AND bu.blocked_user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION '你与发起人存在拉黑关系，无法申请该活动';
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

  IF v_approved_count >= COALESCE(v_activity.participant_limit, v_activity.max_members) THEN
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

  PERFORM public.refresh_user_trust_stats(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.confirm_activity_departure(UUID) TO authenticated;

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

  PERFORM public.refresh_user_trust_stats(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.mark_activity_no_show(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.log_activity_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_behavior('activity_created', NEW.creator_id, NULL, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS log_activity_created_trigger ON public.activities;
CREATE TRIGGER log_activity_created_trigger
  AFTER INSERT ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.log_activity_created();

CREATE OR REPLACE FUNCTION public.log_activity_member_events()
RETURNS TRIGGER AS $$
DECLARE
  v_creator_id UUID;
BEGIN
  SELECT creator_id INTO v_creator_id FROM public.activities WHERE id = COALESCE(NEW.activity_id, OLD.activity_id);

  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_behavior('join_requested', NEW.user_id, v_creator_id, NEW.activity_id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved' THEN
    PERFORM public.log_behavior('join_approved', auth.uid(), NEW.user_id, NEW.activity_id);
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.departure_confirmed_at IS NULL AND NEW.departure_confirmed_at IS NOT NULL THEN
    PERFORM public.log_behavior('departure_confirmed', NEW.user_id, v_creator_id, NEW.activity_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS log_activity_member_events_trigger ON public.activity_members;
CREATE TRIGGER log_activity_member_events_trigger
  AFTER INSERT OR UPDATE ON public.activity_members
  FOR EACH ROW EXECUTE FUNCTION public.log_activity_member_events();

CREATE OR REPLACE FUNCTION public.log_report_events()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_behavior(
    CASE WHEN NEW.report_type = 'activity' THEN 'activity_reported' ELSE 'user_reported' END,
    NEW.reporter_id,
    NEW.reported_user_id,
    NEW.activity_id,
    jsonb_build_object('reason', NEW.reason)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS log_report_events_trigger ON public.user_reports;
CREATE TRIGGER log_report_events_trigger
  AFTER INSERT ON public.user_reports
  FOR EACH ROW EXECUTE FUNCTION public.log_report_events();

CREATE OR REPLACE FUNCTION public.log_block_events()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_behavior(
    'user_blocked',
    NEW.blocker_id,
    NEW.blocked_user_id,
    NULL,
    jsonb_build_object('reason', COALESCE(NEW.reason, ''))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS log_block_events_trigger ON public.blocked_users;
CREATE TRIGGER log_block_events_trigger
  AFTER INSERT ON public.blocked_users
  FOR EACH ROW EXECUTE FUNCTION public.log_block_events();

CREATE OR REPLACE FUNCTION public.log_activity_completed_from_review()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_behavior('activity_completed', NEW.reviewer_id, NEW.reviewee_id, NEW.activity_id);
  PERFORM public.refresh_user_trust_stats(NEW.reviewer_id);
  PERFORM public.refresh_user_trust_stats(NEW.reviewee_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS log_activity_completed_from_review_trigger ON public.activity_reviews;
CREATE TRIGGER log_activity_completed_from_review_trigger
  AFTER INSERT ON public.activity_reviews
  FOR EACH ROW EXECUTE FUNCTION public.log_activity_completed_from_review();


-- ==========================================
-- 6. Public card view. No phone numbers are selected.
-- ==========================================

DROP VIEW IF EXISTS public.activities_with_count;

CREATE OR REPLACE VIEW public.activities_with_count AS
SELECT
  a.*,
  COALESCE(a.participant_limit, a.max_members) AS display_member_limit,
  COALESCE(mc.cnt, 0) AS member_count,
  COALESCE(mc.pending_count, 0) AS pending_count,
  p.nickname AS creator_nickname,
  p.avatar_url AS creator_avatar_url,
  p.phone_bound AS creator_phone_bound,
  p.trust_badge AS creator_trust_badge,
  p.attended_count AS creator_attended_count,
  p.no_show_count AS creator_no_show_count,
  p.completion_rate AS creator_completion_rate,
  p.credit_level AS creator_credit_level,
  CASE
    WHEN auth.uid() IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.blocked_users bu
      WHERE (bu.blocker_id = auth.uid() AND bu.blocked_user_id = a.creator_id)
         OR (bu.blocker_id = a.creator_id AND bu.blocked_user_id = auth.uid())
    )
  END AS is_hidden_by_block
FROM public.activities a
LEFT JOIN public.profiles p ON p.id = a.creator_id
LEFT JOIN (
  SELECT
    activity_id,
    COUNT(*) FILTER (WHERE status = 'approved') AS cnt,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_count
  FROM public.activity_members
  GROUP BY activity_id
) mc ON mc.activity_id = a.id;

DO $$ BEGIN
  ALTER VIEW public.activities_with_count SET (security_invoker = true);
EXCEPTION WHEN others THEN NULL;
END $$;


-- ==========================================
-- 7. Backfill all existing user stats.
-- ==========================================

DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN SELECT id FROM public.profiles LOOP
    PERFORM public.refresh_user_trust_stats(profile_record.id);
  END LOOP;
END $$;
