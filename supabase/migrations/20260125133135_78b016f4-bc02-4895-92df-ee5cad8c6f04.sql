-- Create contract milestones table
CREATE TABLE public.contract_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  milestone_name TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  payment_percentage DECIMAL(5,2),
  payment_amount DECIMAL(15,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  completion_date DATE,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create contract payments table
CREATE TABLE public.contract_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  milestone_id UUID REFERENCES public.contract_milestones(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  payment_number INTEGER NOT NULL,
  description TEXT,
  amount DECIMAL(15,2) NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create contract alert settings table
CREATE TABLE public.contract_alert_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  expiry_alerts_enabled BOOLEAN DEFAULT true,
  expiry_days_before INTEGER[] DEFAULT '{7,14,30,60}',
  payment_alerts_enabled BOOLEAN DEFAULT true,
  payment_days_before INTEGER[] DEFAULT '{3,7,14}',
  milestone_alerts_enabled BOOLEAN DEFAULT true,
  milestone_days_before INTEGER[] DEFAULT '{3,7}',
  email_notifications BOOLEAN DEFAULT false,
  in_app_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.contract_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_alert_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for contract_milestones
CREATE POLICY "Users can view their own milestones" ON public.contract_milestones
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own milestones" ON public.contract_milestones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own milestones" ON public.contract_milestones
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own milestones" ON public.contract_milestones
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for contract_payments
CREATE POLICY "Users can view their own payments" ON public.contract_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments" ON public.contract_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments" ON public.contract_payments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payments" ON public.contract_payments
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for contract_alert_settings
CREATE POLICY "Users can view their own alert settings" ON public.contract_alert_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alert settings" ON public.contract_alert_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alert settings" ON public.contract_alert_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_contract_milestones_contract_id ON public.contract_milestones(contract_id);
CREATE INDEX idx_contract_milestones_user_id ON public.contract_milestones(user_id);
CREATE INDEX idx_contract_milestones_due_date ON public.contract_milestones(due_date);
CREATE INDEX idx_contract_payments_contract_id ON public.contract_payments(contract_id);
CREATE INDEX idx_contract_payments_user_id ON public.contract_payments(user_id);
CREATE INDEX idx_contract_payments_due_date ON public.contract_payments(due_date);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_contract_milestones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_contract_milestones_updated_at
  BEFORE UPDATE ON public.contract_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contract_milestones_updated_at();