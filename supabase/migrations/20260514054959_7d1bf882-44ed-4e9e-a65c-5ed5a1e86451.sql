CREATE TABLE IF NOT EXISTS public.evm_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  name text NOT NULL,
  notes text,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.evm_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own evm scenarios" ON public.evm_scenarios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own evm scenarios" ON public.evm_scenarios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own evm scenarios" ON public.evm_scenarios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users delete own evm scenarios" ON public.evm_scenarios FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_evm_scenarios_updated_at
BEFORE UPDATE ON public.evm_scenarios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_evm_scenarios_user_project ON public.evm_scenarios(user_id, project_id);