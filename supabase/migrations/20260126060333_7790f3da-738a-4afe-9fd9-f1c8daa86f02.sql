-- Create pricing_history table for tracking pricing suggestions and accuracy
CREATE TABLE public.pricing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.saved_projects(id) ON DELETE CASCADE,
  item_number TEXT NOT NULL,
  item_description TEXT,
  
  -- Suggested price from system
  suggested_price DECIMAL(12,2) NOT NULL,
  suggested_min DECIMAL(12,2),
  suggested_max DECIMAL(12,2),
  confidence TEXT CHECK (confidence IN ('High', 'Medium', 'Low')),
  source TEXT CHECK (source IN ('library', 'reference', 'ai')),
  
  -- Final approved price from user
  final_price DECIMAL(12,2),
  is_approved BOOLEAN DEFAULT FALSE,
  
  -- Accuracy metrics
  accuracy_score DECIMAL(5,2),
  deviation_percent DECIMAL(5,2),
  
  -- Metadata
  location TEXT,
  region TEXT,
  model_used TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- Create indexes for fast queries
CREATE INDEX idx_pricing_history_project ON public.pricing_history(project_id);
CREATE INDEX idx_pricing_history_user ON public.pricing_history(user_id);
CREATE INDEX idx_pricing_history_item ON public.pricing_history(item_number);
CREATE INDEX idx_pricing_history_source ON public.pricing_history(source);
CREATE INDEX idx_pricing_history_created ON public.pricing_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.pricing_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their pricing history"
  ON public.pricing_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert pricing history"
  ON public.pricing_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their pricing history"
  ON public.pricing_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their pricing history"
  ON public.pricing_history FOR DELETE
  USING (auth.uid() = user_id);