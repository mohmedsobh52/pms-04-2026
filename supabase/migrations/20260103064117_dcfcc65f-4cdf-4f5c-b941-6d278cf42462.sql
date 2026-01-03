-- Create timeline estimates table for storing manual time adjustments
CREATE TABLE public.timeline_estimates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.project_data(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    task_code TEXT NOT NULL,
    task_title TEXT NOT NULL,
    custom_duration INTEGER,
    custom_start_day INTEGER,
    custom_progress INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(project_id, task_code)
);

-- Enable Row Level Security
ALTER TABLE public.timeline_estimates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own timeline estimates"
ON public.timeline_estimates
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own timeline estimates"
ON public.timeline_estimates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own timeline estimates"
ON public.timeline_estimates
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own timeline estimates"
ON public.timeline_estimates
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_timeline_estimates_updated_at
BEFORE UPDATE ON public.timeline_estimates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();