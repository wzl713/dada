-- Fix activity discussion insert policy.
-- Run this in Supabase SQL Editor if joined users cannot send activity comments.

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.notifications'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('join_activity', 'friend_request', 'friend_accepted', 'new_message', 'new_comment'));

DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Activity members can create comments" ON comments;

CREATE POLICY "Activity members can create comments" ON comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1
        FROM activities a
        WHERE a.id = comments.activity_id
        AND a.creator_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM activity_members am
        WHERE am.activity_id = comments.activity_id
        AND am.user_id = auth.uid()
      )
    )
  );

DO $$ BEGIN
  CREATE POLICY "Anyone can view members" ON activity_members
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
