-- Create material pricing database table
CREATE TABLE public.material_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Material info
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  
  -- Pricing
  unit TEXT NOT NULL,
  unit_price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'SAR',
  
  -- Source info
  source TEXT, -- 'manual', 'import', 'web_search'
  source_url TEXT,
  supplier_name TEXT,
  supplier_contact TEXT,
  
  -- Location & Date
  location TEXT DEFAULT 'السعودية',
  city TEXT,
  price_date DATE DEFAULT CURRENT_DATE,
  
  -- Validity
  is_verified BOOLEAN DEFAULT false,
  valid_until DATE,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.material_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own material prices"
  ON public.material_prices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own material prices"
  ON public.material_prices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own material prices"
  ON public.material_prices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own material prices"
  ON public.material_prices FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_material_prices_user_id ON public.material_prices(user_id);
CREATE INDEX idx_material_prices_category ON public.material_prices(category);
CREATE INDEX idx_material_prices_name ON public.material_prices(name);

-- Update trigger
CREATE TRIGGER update_material_prices_updated_at
  BEFORE UPDATE ON public.material_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create supplier database table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  name TEXT NOT NULL,
  name_ar TEXT,
  category TEXT,
  
  -- Contact info
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  
  -- Rating
  rating NUMERIC CHECK (rating >= 0 AND rating <= 5),
  notes TEXT,
  
  is_verified BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suppliers
CREATE POLICY "Users can view their own suppliers"
  ON public.suppliers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own suppliers"
  ON public.suppliers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suppliers"
  ON public.suppliers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suppliers"
  ON public.suppliers FOR DELETE
  USING (auth.uid() = user_id);

-- Update trigger for suppliers
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();