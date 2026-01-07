-- Create table for historical pricing files
CREATE TABLE public.historical_pricing_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  project_location TEXT,
  project_date DATE,
  currency TEXT DEFAULT 'SAR',
  items JSONB NOT NULL DEFAULT '[]',
  items_count INTEGER DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  notes TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.historical_pricing_files ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own historical files" 
ON public.historical_pricing_files 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own historical files" 
ON public.historical_pricing_files 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own historical files" 
ON public.historical_pricing_files 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own historical files" 
ON public.historical_pricing_files 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_historical_pricing_files_updated_at
BEFORE UPDATE ON public.historical_pricing_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();