-- Add status column to saved_projects table for project state tracking
ALTER TABLE saved_projects 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' 
CHECK (status IN ('draft', 'in_progress', 'completed', 'suspended'));