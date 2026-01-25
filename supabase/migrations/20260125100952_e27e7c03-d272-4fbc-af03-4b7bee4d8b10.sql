-- إضافة أعمدة جديدة لجدول project_items
ALTER TABLE project_items
ADD COLUMN IF NOT EXISTS description_ar TEXT,
ADD COLUMN IF NOT EXISTS subcategory TEXT,
ADD COLUMN IF NOT EXISTS specifications TEXT,
ADD COLUMN IF NOT EXISTS is_section BOOLEAN DEFAULT false;