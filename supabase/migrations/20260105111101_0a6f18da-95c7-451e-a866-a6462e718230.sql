-- Create table for custom folders
CREATE TABLE public.attachment_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NULL REFERENCES public.saved_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'folder',
  parent_id UUID NULL REFERENCES public.attachment_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add folder_id column to project_attachments table
ALTER TABLE public.project_attachments 
ADD COLUMN folder_id UUID NULL REFERENCES public.attachment_folders(id) ON DELETE SET NULL;

-- Enable Row Level Security
ALTER TABLE public.attachment_folders ENABLE ROW LEVEL SECURITY;

-- Create policies for attachment_folders
CREATE POLICY "Users can view their own folders" 
ON public.attachment_folders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders" 
ON public.attachment_folders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" 
ON public.attachment_folders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" 
ON public.attachment_folders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_attachment_folders_updated_at
BEFORE UPDATE ON public.attachment_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();