-- Add subcontractors data columns to tender_pricing
ALTER TABLE public.tender_pricing 
ADD COLUMN IF NOT EXISTS subcontractors_data JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_subcontractors_costs NUMERIC DEFAULT 0;