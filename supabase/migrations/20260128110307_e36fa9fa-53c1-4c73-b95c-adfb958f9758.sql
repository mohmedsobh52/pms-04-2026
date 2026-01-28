-- إزالة الـ Foreign Key القديم الذي يشير إلى saved_projects
ALTER TABLE public.project_attachments 
DROP CONSTRAINT IF EXISTS project_attachments_project_id_fkey;

-- إنشاء Foreign Key جديد يشير إلى project_data
ALTER TABLE public.project_attachments
ADD CONSTRAINT project_attachments_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES project_data(id) ON DELETE CASCADE;