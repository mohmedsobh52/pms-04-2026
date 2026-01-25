-- Create tender_pricing table for storing project pricing data
CREATE TABLE public.tender_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.saved_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Settings
  contract_value NUMERIC DEFAULT 0,
  profit_margin NUMERIC DEFAULT 10,
  contingency NUMERIC DEFAULT 5,
  project_duration INTEGER DEFAULT 12,
  currency TEXT DEFAULT 'SAR',
  start_date DATE,
  end_date DATE,
  
  -- Section data (JSON)
  staff_data JSONB DEFAULT '[]'::jsonb,
  facilities_data JSONB DEFAULT '[]'::jsonb,
  insurance_data JSONB DEFAULT '[]'::jsonb,
  guarantees_data JSONB DEFAULT '[]'::jsonb,
  indirect_costs_data JSONB DEFAULT '[]'::jsonb,
  
  -- Calculated totals
  total_staff_costs NUMERIC DEFAULT 0,
  total_facilities_costs NUMERIC DEFAULT 0,
  total_insurance_costs NUMERIC DEFAULT 0,
  total_guarantees_costs NUMERIC DEFAULT 0,
  total_indirect_costs NUMERIC DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(project_id)
);

-- Enable RLS
ALTER TABLE public.tender_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own tender pricing"
  ON public.tender_pricing FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tender pricing"
  ON public.tender_pricing FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tender pricing"
  ON public.tender_pricing FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tender pricing"
  ON public.tender_pricing FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_tender_pricing_updated_at
  BEFORE UPDATE ON public.tender_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();