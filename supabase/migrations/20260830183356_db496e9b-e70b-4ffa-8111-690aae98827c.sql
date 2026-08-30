CREATE TABLE public.claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  claim_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  claim_type TEXT NOT NULL DEFAULT 'cost',
  status TEXT NOT NULL DEFAULT 'draft',
  priority TEXT NOT NULL DEFAULT 'medium',
  claimed_amount NUMERIC NOT NULL DEFAULT 0,
  approved_amount NUMERIC NOT NULL DEFAULT 0,
  time_extension_days INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SAR',
  submitted_date DATE,
  response_due_date DATE,
  resolved_date DATE,
  counterparty TEXT,
  notice_reference TEXT,
  contract_clause TEXT,
  root_cause TEXT,
  evidence_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims TO authenticated;
GRANT ALL ON public.claims TO service_role;

ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own claims" ON public.claims FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own claims" ON public.claims FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own claims" ON public.claims FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own claims" ON public.claims FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_claims_user ON public.claims(user_id);
CREATE INDEX idx_claims_status ON public.claims(status);

CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON public.claims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();