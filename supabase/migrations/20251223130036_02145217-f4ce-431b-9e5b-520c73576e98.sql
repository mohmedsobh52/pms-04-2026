-- Create shared_analyses table for real-time collaboration
CREATE TABLE public.shared_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_code VARCHAR(12) NOT NULL UNIQUE,
  analysis_data JSONB NOT NULL,
  wbs_data JSONB,
  file_name VARCHAR(255),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  viewer_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Create index for faster lookups
CREATE INDEX idx_shared_analyses_share_code ON public.shared_analyses(share_code);
CREATE INDEX idx_shared_analyses_expires_at ON public.shared_analyses(expires_at);

-- Enable Row Level Security
ALTER TABLE public.shared_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (view-only sharing)
CREATE POLICY "Anyone can view shared analyses with valid code" 
ON public.shared_analyses 
FOR SELECT 
USING (is_active = true AND expires_at > now());

-- Create policy for inserting new shared analyses
CREATE POLICY "Anyone can create shared analyses" 
ON public.shared_analyses 
FOR INSERT 
WITH CHECK (true);

-- Create policy for updating viewer count
CREATE POLICY "Anyone can update viewer count" 
ON public.shared_analyses 
FOR UPDATE 
USING (is_active = true AND expires_at > now());

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_analyses;