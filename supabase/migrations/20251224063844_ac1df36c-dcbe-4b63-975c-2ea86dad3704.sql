-- Create projects table (enhanced from saved_projects)
CREATE TABLE IF NOT EXISTS public.project_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  file_name TEXT,
  analysis_data JSONB,
  wbs_data JSONB,
  total_value NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  items_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_items table
CREATE TABLE IF NOT EXISTS public.project_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.project_data(id) ON DELETE CASCADE,
  item_number TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  quantity NUMERIC DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create item_costs table for calculated costs
CREATE TABLE IF NOT EXISTS public.item_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_item_id UUID NOT NULL REFERENCES public.project_items(id) ON DELETE CASCADE,
  general_labor NUMERIC DEFAULT 0,
  equipment_operator NUMERIC DEFAULT 0,
  overhead NUMERIC DEFAULT 0,
  admin NUMERIC DEFAULT 0,
  insurance NUMERIC DEFAULT 0,
  contingency NUMERIC DEFAULT 0,
  profit_margin NUMERIC DEFAULT 10,
  materials NUMERIC DEFAULT 0,
  equipment NUMERIC DEFAULT 0,
  subcontractor NUMERIC DEFAULT 0,
  ai_suggested_rate NUMERIC,
  calculated_unit_price NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.project_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_costs ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_data
CREATE POLICY "Users can view their own project data" ON public.project_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own project data" ON public.project_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own project data" ON public.project_data
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own project data" ON public.project_data
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for project_items (inherit from project_data)
CREATE POLICY "Users can view items of their projects" ON public.project_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.project_data WHERE project_data.id = project_items.project_id AND project_data.user_id = auth.uid())
  );

CREATE POLICY "Users can create items for their projects" ON public.project_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.project_data WHERE project_data.id = project_items.project_id AND project_data.user_id = auth.uid())
  );

CREATE POLICY "Users can update items of their projects" ON public.project_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.project_data WHERE project_data.id = project_items.project_id AND project_data.user_id = auth.uid())
  );

CREATE POLICY "Users can delete items of their projects" ON public.project_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.project_data WHERE project_data.id = project_items.project_id AND project_data.user_id = auth.uid())
  );

-- RLS policies for item_costs (inherit from project_items)
CREATE POLICY "Users can view costs of their items" ON public.item_costs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_items pi
      JOIN public.project_data pd ON pd.id = pi.project_id
      WHERE pi.id = item_costs.project_item_id AND pd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create costs for their items" ON public.item_costs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_items pi
      JOIN public.project_data pd ON pd.id = pi.project_id
      WHERE pi.id = item_costs.project_item_id AND pd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update costs of their items" ON public.item_costs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.project_items pi
      JOIN public.project_data pd ON pd.id = pi.project_id
      WHERE pi.id = item_costs.project_item_id AND pd.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete costs of their items" ON public.item_costs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.project_items pi
      JOIN public.project_data pd ON pd.id = pi.project_id
      WHERE pi.id = item_costs.project_item_id AND pd.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_project_items_project_id ON public.project_items(project_id);
CREATE INDEX idx_item_costs_project_item_id ON public.item_costs(project_item_id);
CREATE INDEX idx_project_data_user_id ON public.project_data(user_id);