-- ==========================================
-- Dada: 用户资料增加性别字段
-- 在已有 Supabase 项目中执行一次
-- ==========================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT;

DO $$
BEGIN
  ALTER TABLE public.profiles
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
