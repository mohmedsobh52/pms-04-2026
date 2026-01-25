-- Create item_pricing_details table
CREATE TABLE public.item_pricing_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_item_id UUID NOT NULL REFERENCES public.project_items(id) ON DELETE CASCADE,
  pricing_type TEXT NOT NULL CHECK (pricing_type IN ('material', 'labor', 'equipment')),
  resource_id UUID,
  resource_name TEXT NOT NULL,
  unit TEXT,
  unit_price NUMERIC DEFAULT 0,
  quantity NUMERIC DEFAULT 1,
  duration NUMERIC DEFAULT 1,
  total_cost NUMERIC GENERATED ALWAYS AS (unit_price * quantity * duration) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.item_pricing_details ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own pricing details"
ON public.item_pricing_details FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pricing details"
ON public.item_pricing_details FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pricing details"
ON public.item_pricing_details FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pricing details"
ON public.item_pricing_details FOR DELETE
USING (auth.uid() = user_id);

-- Create index for fast lookups
CREATE INDEX idx_item_pricing_details_item ON public.item_pricing_details(project_item_id);

-- Add columns to project_items if they don't exist
ALTER TABLE public.project_items
ADD COLUMN IF NOT EXISTS overhead_percentage NUMERIC DEFAULT 10,
ADD COLUMN IF NOT EXISTS profit_percentage NUMERIC DEFAULT 15,
ADD COLUMN IF NOT EXISTS pricing_notes TEXT,
ADD COLUMN IF NOT EXISTS is_detailed_priced BOOLEAN DEFAULT false;