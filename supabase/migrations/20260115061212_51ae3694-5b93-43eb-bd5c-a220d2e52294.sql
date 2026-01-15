-- Make quotations bucket private
UPDATE storage.buckets SET public = false WHERE name = 'quotations';

-- Drop public access policy if exists
DROP POLICY IF EXISTS "Public Access to Quotations" ON storage.objects;