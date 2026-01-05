-- Create table for user analysis preferences
CREATE TABLE public.user_analysis_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  preference_name TEXT NOT NULL,
  default_analysis_type TEXT DEFAULT 'extract_data',
  auto_analyze_on_upload BOOLEAN DEFAULT false,
  analysis_language TEXT DEFAULT 'ar',
  include_market_comparison BOOLEAN DEFAULT true,
  include_recommendations BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for scheduled reports
CREATE TABLE public.scheduled_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.saved_projects(id) ON DELETE CASCADE,
  report_name TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'summary',
  schedule_type TEXT NOT NULL DEFAULT 'weekly',
  schedule_day INTEGER DEFAULT 1,
  schedule_hour INTEGER DEFAULT 9,
  recipient_emails TEXT[] NOT NULL,
  include_charts BOOLEAN DEFAULT true,
  include_comparison BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  next_scheduled_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_analysis_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for user_analysis_preferences
CREATE POLICY "Users can view their own preferences" 
ON public.user_analysis_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences" 
ON public.user_analysis_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON public.user_analysis_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences" 
ON public.user_analysis_preferences 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for scheduled_reports
CREATE POLICY "Users can view their own scheduled reports" 
ON public.scheduled_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled reports" 
ON public.scheduled_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled reports" 
ON public.scheduled_reports 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled reports" 
ON public.scheduled_reports 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create triggers for timestamps
CREATE TRIGGER update_user_analysis_preferences_updated_at
BEFORE UPDATE ON public.user_analysis_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_reports_updated_at
BEFORE UPDATE ON public.scheduled_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();