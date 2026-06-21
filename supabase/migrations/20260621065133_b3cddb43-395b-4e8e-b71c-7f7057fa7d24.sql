
-- Financial audit logs
CREATE TABLE public.financial_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  project_id uuid,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  before jsonb,
  after jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fin_audit_entity ON public.financial_audit_logs(entity_type, entity_id);
CREATE INDEX idx_fin_audit_project ON public.financial_audit_logs(project_id, created_at DESC);
GRANT SELECT, INSERT ON public.financial_audit_logs TO authenticated;
GRANT ALL ON public.financial_audit_logs TO service_role;
ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select_own" ON public.financial_audit_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (project_id IS NOT NULL AND public.user_owns_project(project_id)));
CREATE POLICY "audit_insert_own" ON public.financial_audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Record locks
CREATE TABLE public.record_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  locked_by uuid NOT NULL DEFAULT auth.uid(),
  locked_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  UNIQUE (entity_type, entity_id)
);
GRANT SELECT, INSERT, DELETE ON public.record_locks TO authenticated;
GRANT ALL ON public.record_locks TO service_role;
ALTER TABLE public.record_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "locks_select_all_auth" ON public.record_locks FOR SELECT TO authenticated USING (true);
CREATE POLICY "locks_insert_own" ON public.record_locks FOR INSERT TO authenticated WITH CHECK (locked_by = auth.uid());
CREATE POLICY "locks_delete_admin" ON public.record_locks FOR DELETE TO authenticated
  USING (locked_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.is_record_locked(_type text, _id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.record_locks WHERE entity_type = _type AND entity_id = _id);
$$;

-- Contract variations
CREATE TABLE public.contract_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  variation_number text NOT NULL,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_variations_contract ON public.contract_variations(contract_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_variations TO authenticated;
GRANT ALL ON public.contract_variations TO service_role;
ALTER TABLE public.contract_variations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variations_own" ON public.contract_variations FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_variations_updated_at BEFORE UPDATE ON public.contract_variations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Currency rates
CREATE TABLE public.currency_rates (
  code text PRIMARY KEY,
  rate_to_usd numeric NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.currency_rates TO anon, authenticated;
GRANT ALL ON public.currency_rates TO service_role;
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rates_public_read" ON public.currency_rates FOR SELECT USING (true);
CREATE POLICY "rates_admin_write" ON public.currency_rates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.currency_rates (code, rate_to_usd) VALUES
  ('USD',1),('EUR',1.08),('SAR',0.27),('AED',0.27),('EGP',0.020),('GBP',1.27),('KWD',3.25),('QAR',0.27)
  ON CONFLICT DO NOTHING;

-- Extend risks with numeric scores (additive)
ALTER TABLE public.risks
  ADD COLUMN IF NOT EXISTS probability_score smallint CHECK (probability_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS impact_score smallint CHECK (impact_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS last_alerted_at timestamptz;

-- Lock enforcement trigger (generic — blocks UPDATE/DELETE on locked rows)
CREATE OR REPLACE FUNCTION public.enforce_record_lock()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF public.is_record_locked(TG_ARGV[0], OLD.id) THEN
    RAISE EXCEPTION 'Record % is locked and cannot be modified', OLD.id USING ERRCODE = 'check_violation';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER trg_lock_progress_certificates BEFORE UPDATE OR DELETE ON public.progress_certificates
  FOR EACH ROW EXECUTE FUNCTION public.enforce_record_lock('progress_certificate');
CREATE TRIGGER trg_lock_contract_payments BEFORE UPDATE OR DELETE ON public.contract_payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_record_lock('contract_payment');
CREATE TRIGGER trg_lock_procurement_items BEFORE UPDATE OR DELETE ON public.procurement_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_record_lock('procurement_item');
