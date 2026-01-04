-- Create table for tracking actual progress history
CREATE TABLE public.project_progress_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.saved_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  actual_progress NUMERIC(5,2) DEFAULT 0,
  actual_spent_percentage NUMERIC(5,2) DEFAULT 0,
  actual_cost NUMERIC(15,2) DEFAULT 0,
  planned_progress NUMERIC(5,2) DEFAULT 0,
  spi NUMERIC(5,3),
  cpi NUMERIC(5,3),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, record_date)
);

-- Enable RLS
ALTER TABLE public.project_progress_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own progress history"
ON public.project_progress_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress history"
ON public.project_progress_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress history"
ON public.project_progress_history
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress history"
ON public.project_progress_history
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_project_progress_history_updated_at
BEFORE UPDATE ON public.project_progress_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for EVM alert settings
CREATE TABLE public.evm_alert_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  spi_warning_threshold NUMERIC(3,2) DEFAULT 0.95,
  spi_critical_threshold NUMERIC(3,2) DEFAULT 0.90,
  cpi_warning_threshold NUMERIC(3,2) DEFAULT 0.95,
  cpi_critical_threshold NUMERIC(3,2) DEFAULT 0.90,
  vac_warning_percentage NUMERIC(5,2) DEFAULT 5,
  vac_critical_percentage NUMERIC(5,2) DEFAULT 10,
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.evm_alert_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own alert settings"
ON public.evm_alert_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alert settings"
ON public.evm_alert_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alert settings"
ON public.evm_alert_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_evm_alert_settings_updated_at
BEFORE UPDATE ON public.evm_alert_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();