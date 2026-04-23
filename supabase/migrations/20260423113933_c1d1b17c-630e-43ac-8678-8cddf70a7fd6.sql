ALTER TABLE public.saved_projects DROP CONSTRAINT IF EXISTS saved_projects_status_check;
ALTER TABLE public.saved_projects ADD CONSTRAINT saved_projects_status_check 
  CHECK (status = ANY (ARRAY['draft'::text, 'planning'::text, 'in_progress'::text, 'on_hold'::text, 'completed'::text, 'suspended'::text, 'cancelled'::text]));