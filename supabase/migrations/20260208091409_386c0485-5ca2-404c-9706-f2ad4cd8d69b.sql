-- Add new columns to external_partners table
ALTER TABLE public.external_partners 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS contact_person TEXT;

-- Create partner_contracts table
CREATE TABLE public.partner_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.external_partners(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.saved_projects(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  contract_file_name TEXT,
  contract_file_url TEXT,
  contract_type TEXT DEFAULT 'fixed',
  contract_value NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create partner_reviews table
CREATE TABLE public.partner_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.external_partners(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reviewer_name TEXT NOT NULL,
  rating NUMERIC DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create partner_performance table
CREATE TABLE public.partner_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.external_partners(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  delivery_time_score NUMERIC DEFAULT 0,
  quality_score NUMERIC DEFAULT 0,
  communication_score NUMERIC DEFAULT 0,
  budget_compliance_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(partner_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.partner_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_performance ENABLE ROW LEVEL SECURITY;

-- RLS policies for partner_contracts
CREATE POLICY "Users can view their own partner contracts" ON public.partner_contracts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own partner contracts" ON public.partner_contracts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own partner contracts" ON public.partner_contracts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own partner contracts" ON public.partner_contracts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for partner_reviews
CREATE POLICY "Users can view their own partner reviews" ON public.partner_reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own partner reviews" ON public.partner_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own partner reviews" ON public.partner_reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own partner reviews" ON public.partner_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for partner_performance
CREATE POLICY "Users can view their own partner performance" ON public.partner_performance
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own partner performance" ON public.partner_performance
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own partner performance" ON public.partner_performance
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own partner performance" ON public.partner_performance
  FOR DELETE USING (auth.uid() = user_id);

-- Function to auto-update partner rating from reviews
CREATE OR REPLACE FUNCTION public.update_partner_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.external_partners
  SET rating = (
    SELECT COALESCE(AVG(rating), 0)
    FROM public.partner_reviews
    WHERE partner_id = COALESCE(NEW.partner_id, OLD.partner_id)
  ),
  updated_at = now()
  WHERE id = COALESCE(NEW.partner_id, OLD.partner_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update rating on review changes
CREATE TRIGGER update_partner_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.partner_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_partner_rating();