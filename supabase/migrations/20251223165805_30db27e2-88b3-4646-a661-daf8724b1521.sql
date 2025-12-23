-- Create analysis_comments table for collaborative commenting
CREATE TABLE public.analysis_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_code VARCHAR NOT NULL,
  author_name VARCHAR(100) NOT NULL,
  author_email VARCHAR(255),
  item_id VARCHAR(50),
  comment_text TEXT NOT NULL,
  comment_type VARCHAR(20) DEFAULT 'general',
  is_resolved BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES public.analysis_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_analysis_comments_share_code ON public.analysis_comments(share_code);
CREATE INDEX idx_analysis_comments_parent_id ON public.analysis_comments(parent_id);

-- Enable RLS
ALTER TABLE public.analysis_comments ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view comments for active shared analyses
CREATE POLICY "Anyone can view comments for active shares"
ON public.analysis_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shared_analyses
    WHERE share_code = analysis_comments.share_code
    AND is_active = true
    AND expires_at > now()
  )
);

-- Allow anyone to insert comments
CREATE POLICY "Anyone can add comments"
ON public.analysis_comments
FOR INSERT
WITH CHECK (true);

-- Allow authors to update their own comments
CREATE POLICY "Authors can update own comments"
ON public.analysis_comments
FOR UPDATE
USING (true);

-- Allow authors to delete their own comments
CREATE POLICY "Authors can delete own comments"
ON public.analysis_comments
FOR DELETE
USING (true);

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_comments;

-- Create trigger for updated_at
CREATE TRIGGER update_analysis_comments_updated_at
BEFORE UPDATE ON public.analysis_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();