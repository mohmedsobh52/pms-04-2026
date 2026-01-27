-- Update storage bucket to allow larger files (500MB)
UPDATE storage.buckets 
SET file_size_limit = 524288000 
WHERE name = 'project-files';