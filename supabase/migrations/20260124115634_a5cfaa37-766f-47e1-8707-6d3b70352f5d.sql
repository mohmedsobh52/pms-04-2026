-- Create labor_rates table
CREATE TABLE public.labor_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  unit VARCHAR(50) NOT NULL DEFAULT 'day',
  unit_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime_percentage NUMERIC(5,2) DEFAULT 0,
  category VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipment_rates table
CREATE TABLE public.equipment_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  unit VARCHAR(50) NOT NULL DEFAULT 'day',
  rental_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  operation_rate NUMERIC(12,2) DEFAULT 0,
  supplier_name VARCHAR(255),
  supplier_id UUID,
  category VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add waste_percentage to material_prices if not exists
ALTER TABLE public.material_prices 
ADD COLUMN IF NOT EXISTS waste_percentage NUMERIC(5,2) DEFAULT 0;

-- Enable RLS on labor_rates
ALTER TABLE public.labor_rates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for labor_rates
CREATE POLICY "Users can view their own labor rates"
ON public.labor_rates
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own labor rates"
ON public.labor_rates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own labor rates"
ON public.labor_rates
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own labor rates"
ON public.labor_rates
FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS on equipment_rates
ALTER TABLE public.equipment_rates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for equipment_rates
CREATE POLICY "Users can view their own equipment rates"
ON public.equipment_rates
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own equipment rates"
ON public.equipment_rates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own equipment rates"
ON public.equipment_rates
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own equipment rates"
ON public.equipment_rates
FOR DELETE
USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_labor_rates_updated_at
BEFORE UPDATE ON public.labor_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_rates_updated_at
BEFORE UPDATE ON public.equipment_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();