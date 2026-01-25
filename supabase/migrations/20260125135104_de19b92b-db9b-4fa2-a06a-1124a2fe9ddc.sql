-- Create contract_warranties table for tracking warranty periods
CREATE TABLE public.contract_warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  warranty_type TEXT NOT NULL CHECK (warranty_type IN ('defects_liability', 'performance', 'equipment', 'workmanship', 'materials', 'structural')),
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 12,
  responsible_party TEXT,
  bond_value DECIMAL(15,2),
  bond_type TEXT CHECK (bond_type IN ('bank_guarantee', 'cash_retention', 'insurance', 'corporate_guarantee')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expiring_soon', 'expired', 'released')),
  release_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create maintenance_schedules table for tracking maintenance tasks
CREATE TABLE public.maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id UUID REFERENCES public.contract_warranties(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('inspection', 'repair', 'replacement', 'testing', 'cleaning', 'calibration')),
  description TEXT,
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'overdue', 'cancelled', 'in_progress')),
  assigned_to TEXT,
  cost DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contract_warranties
CREATE POLICY "Users can view their own warranties"
  ON public.contract_warranties FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own warranties"
  ON public.contract_warranties FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own warranties"
  ON public.contract_warranties FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own warranties"
  ON public.contract_warranties FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for maintenance_schedules
CREATE POLICY "Users can view their own maintenance schedules"
  ON public.maintenance_schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own maintenance schedules"
  ON public.maintenance_schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own maintenance schedules"
  ON public.maintenance_schedules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own maintenance schedules"
  ON public.maintenance_schedules FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_warranties_contract_id ON public.contract_warranties(contract_id);
CREATE INDEX idx_warranties_user_id ON public.contract_warranties(user_id);
CREATE INDEX idx_warranties_end_date ON public.contract_warranties(end_date);
CREATE INDEX idx_warranties_status ON public.contract_warranties(status);
CREATE INDEX idx_maintenance_contract_id ON public.maintenance_schedules(contract_id);
CREATE INDEX idx_maintenance_warranty_id ON public.maintenance_schedules(warranty_id);
CREATE INDEX idx_maintenance_scheduled_date ON public.maintenance_schedules(scheduled_date);
CREATE INDEX idx_maintenance_status ON public.maintenance_schedules(status);

-- Create trigger for updating updated_at on warranties
CREATE TRIGGER update_contract_warranties_updated_at
  BEFORE UPDATE ON public.contract_warranties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();