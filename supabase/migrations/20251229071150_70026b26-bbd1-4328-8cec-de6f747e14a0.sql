-- Create procurement_items table for AI-powered procurement schedule
CREATE TABLE public.procurement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES project_data(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  boq_item_number TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'General',
  quantity NUMERIC DEFAULT 1,
  unit TEXT,
  estimated_cost NUMERIC DEFAULT 0,
  lead_time_days INTEGER DEFAULT 14,
  suggested_suppliers TEXT[] DEFAULT '{}',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  order_date DATE,
  delivery_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'in_transit', 'delivered', 'delayed')),
  ai_generated BOOLEAN DEFAULT true,
  user_modified BOOLEAN DEFAULT false,
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create resource_items table for AI-powered resource schedule
CREATE TABLE public.resource_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES project_data(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('labor', 'equipment', 'material')),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  quantity NUMERIC DEFAULT 1,
  unit TEXT,
  rate_per_day NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  start_date DATE,
  end_date DATE,
  utilization_percent NUMERIC DEFAULT 80,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'unavailable')),
  productivity_rate NUMERIC,
  ai_generated BOOLEAN DEFAULT true,
  user_modified BOOLEAN DEFAULT false,
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.procurement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for procurement_items
CREATE POLICY "Users can view their own procurement items" 
  ON public.procurement_items FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own procurement items" 
  ON public.procurement_items FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own procurement items" 
  ON public.procurement_items FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own procurement items" 
  ON public.procurement_items FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS policies for resource_items
CREATE POLICY "Users can view their own resource items" 
  ON public.resource_items FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own resource items" 
  ON public.resource_items FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resource items" 
  ON public.resource_items FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resource items" 
  ON public.resource_items FOR DELETE 
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_procurement_items_project_id ON public.procurement_items(project_id);
CREATE INDEX idx_procurement_items_user_id ON public.procurement_items(user_id);
CREATE INDEX idx_resource_items_project_id ON public.resource_items(project_id);
CREATE INDEX idx_resource_items_user_id ON public.resource_items(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_procurement_items_updated_at
  BEFORE UPDATE ON public.procurement_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();