CREATE TABLE public.payroll_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  project_id uuid,
  counterparty text NOT NULL,
  entry_type text NOT NULL DEFAULT 'contractor_payment',
  period_month text NOT NULL,
  gross_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  paid_date date,
  currency text NOT NULL DEFAULT 'SAR',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_entries TO authenticated;
GRANT ALL ON public.payroll_entries TO service_role;

ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own payroll entries"
  ON public.payroll_entries FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_payroll_entries_user ON public.payroll_entries (user_id);
CREATE INDEX idx_payroll_entries_project ON public.payroll_entries (project_id);
CREATE INDEX idx_payroll_entries_period ON public.payroll_entries (period_month);

CREATE TRIGGER update_payroll_entries_updated_at
  BEFORE UPDATE ON public.payroll_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();