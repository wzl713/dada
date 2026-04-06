-- Harden Storage ownership rules for covers and photos.
-- Run this in Supabase SQL Editor if your database was created
-- before the latest version of supabase-schema.sql.

DROP POLICY IF EXISTS "Authenticated users can upload covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own covers" ON storage.objects;

DO $$ BEGIN
  CREATE POLICY "Users can upload own covers" ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'covers'
      AND auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own covers" ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'covers'
      AND auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own covers" ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'covers'
      AND auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;

DO $$ BEGIN
  CREATE POLICY "Users can upload own photos" ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'photos'
      AND auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own photos" ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'photos'
      AND auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own photos" ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'photos'
      AND auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
