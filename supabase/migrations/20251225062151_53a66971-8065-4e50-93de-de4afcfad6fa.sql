-- Create comparison_reports table to store saved comparison reports
CREATE TABLE public.comparison_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    project_ids uuid[] NOT NULL,
    comparison_data jsonb NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comparison_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own comparison reports"
ON public.comparison_reports
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own comparison reports"
ON public.comparison_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comparison reports"
ON public.comparison_reports
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comparison reports"
ON public.comparison_reports
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_comparison_reports_updated_at
BEFORE UPDATE ON public.comparison_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();