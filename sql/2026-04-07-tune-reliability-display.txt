-- Tune reliability display and credit defaults.
-- New users start with 5 credit points. Punctuality is only meaningful after records exist.

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
  v_credit_score INTEGER := 5;
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

  v_credit_score := 5 + v_completed_count - v_missed_confirm_count - (v_no_show_count * 2);

  IF v_credit_score < 3 THEN
    v_level_key := 'low_credit';
    v_level_label := '低信用';
  ELSIF v_completed_count < 3 THEN
    v_level_key := 'newbie';
    v_level_label := '新用户';
  ELSIF v_completed_count >= 5 AND v_credit_score >= 8 THEN
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
    v_credit_score >= 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.calculate_user_credit(UUID) TO authenticated;

DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN SELECT id FROM public.profiles LOOP
    PERFORM public.refresh_user_trust_stats(profile_record.id);
  END LOOP;
END $$;

