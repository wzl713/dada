-- ==========================================
-- Dada: 信用等级、软押金限制与标签强制
-- 在已有 Supabase 项目中执行一次
-- 依赖：2026-04-07-application-confirmation-reliability.sql
-- ==========================================

ALTER TABLE public.activity_members
  ADD COLUMN IF NOT EXISTS no_show_marked_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.get_user_report_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.user_reports
  WHERE reported_user_id = p_user_id
    AND status != 'rejected';
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_user_report_count(UUID) TO authenticated;

-- 统一信用计算：
-- +1：已通过且活动结束后确认出发
-- -1：已通过但活动结束后未确认出发
-- -2：被发起人标记鸽子
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

-- 发起人可在活动开始后标记鸽子，用于信用扣分。
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

-- 不再允许前端直接 insert 报名，统一走 request_join_activity 做新人限制。
DROP POLICY IF EXISTS "Users can request to join activities" ON public.activity_members;
DROP POLICY IF EXISTS "Users must use request join function" ON public.activity_members;
CREATE POLICY "Users must use request join function" ON public.activity_members
  FOR INSERT
  WITH CHECK (false);

-- 低信用不能发起活动，且发布活动必须选择标签。
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
