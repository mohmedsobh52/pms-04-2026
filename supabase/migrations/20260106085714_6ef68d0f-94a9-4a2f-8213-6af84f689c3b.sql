-- Create analysis_jobs table for Job Queue system
CREATE TABLE public.analysis_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  job_type TEXT NOT NULL CHECK (job_type IN ('extract_items', 'create_wbs', 'full_analysis')),
  
  -- Input data (compressed)
  input_text_compressed TEXT,
  input_text_length INTEGER,
  file_name TEXT,
  
  -- Chunked processing
  total_chunks INTEGER DEFAULT 1,
  processed_chunks INTEGER DEFAULT 0,
  chunk_results JSONB DEFAULT '[]'::jsonb,
  
  -- Final results
  result_data JSONB,
  error_message TEXT,
  
  -- Progress tracking
  progress_percentage INTEGER DEFAULT 0,
  current_step TEXT,
  
  -- Timing
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own jobs"
ON public.analysis_jobs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs"
ON public.analysis_jobs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs"
ON public.analysis_jobs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs"
ON public.analysis_jobs
FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for polling
ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_jobs;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_analysis_jobs_updated_at
BEFORE UPDATE ON public.analysis_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_analysis_jobs_user_status ON public.analysis_jobs(user_id, status);
CREATE INDEX idx_analysis_jobs_created_at ON public.analysis_jobs(created_at DESC);