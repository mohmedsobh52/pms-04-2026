-- Create reference_prices table for storing market benchmark prices
CREATE TABLE public.reference_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_name_ar TEXT,
  unit TEXT,
  min_price NUMERIC,
  max_price NUMERIC,
  keywords TEXT[],
  location TEXT,
  year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reference_prices ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own reference prices"
  ON public.reference_prices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reference prices"
  ON public.reference_prices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reference prices"
  ON public.reference_prices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reference prices"
  ON public.reference_prices FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_reference_prices_updated_at
  BEFORE UPDATE ON public.reference_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_reference_prices_category ON public.reference_prices(category);
CREATE INDEX idx_reference_prices_user_id ON public.reference_prices(user_id);