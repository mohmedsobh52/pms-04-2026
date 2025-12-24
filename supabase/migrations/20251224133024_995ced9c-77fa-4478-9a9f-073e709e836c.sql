-- Make quotations bucket public for file access
UPDATE storage.buckets 
SET public = true 
WHERE name = 'quotations';

-- Add public read policy if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Public Access to Quotations' 
    AND tablename = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY "Public Access to Quotations"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = ''quotations'')';
  END IF;
END $$;