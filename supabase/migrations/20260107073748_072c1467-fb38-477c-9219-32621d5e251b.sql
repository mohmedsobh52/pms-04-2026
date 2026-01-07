-- Create table for storing edited BOQ prices
CREATE TABLE public.edited_boq_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.project_data(id) ON DELETE CASCADE,
  saved_project_id UUID REFERENCES public.saved_projects(id) ON DELETE CASCADE,
  file_name TEXT,
  item_number TEXT NOT NULL,
  edited_unit_price NUMERIC,
  edited_total_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index for the combination
CREATE UNIQUE INDEX edited_boq_prices_unique_idx 
ON public.edited_boq_prices (user_id, COALESCE(project_id::text, ''), COALESCE(saved_project_id::text, ''), COALESCE(file_name, ''), item_number);

-- Enable Row Level Security
ALTER TABLE public.edited_boq_prices ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own edited prices" 
ON public.edited_boq_prices 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own edited prices" 
ON public.edited_boq_prices 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own edited prices" 
ON public.edited_boq_prices 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own edited prices" 
ON public.edited_boq_prices 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_edited_boq_prices_updated_at
BEFORE UPDATE ON public.edited_boq_prices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();