
-- Cost control overrides (saved per project + activity sn)
CREATE TABLE IF NOT EXISTS public.cost_control_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  sn integer NOT NULL,
  activity_code text,
  progress numeric,
  ac numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_id, sn)
);

ALTER TABLE public.cost_control_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own cc overrides" ON public.cost_control_overrides
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own cc overrides" ON public.cost_control_overrides
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own cc overrides" ON public.cost_control_overrides
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own cc overrides" ON public.cost_control_overrides
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER cc_overrides_updated_at
  BEFORE UPDATE ON public.cost_control_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cost control thresholds (per user, optional per project)
CREATE TABLE IF NOT EXISTS public.cost_control_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  cpi_warn numeric NOT NULL DEFAULT 0.95,
  cpi_critical numeric NOT NULL DEFAULT 0.85,
  spi_warn numeric NOT NULL DEFAULT 0.95,
  spi_critical numeric NOT NULL DEFAULT 0.85,
  eac_overrun_pct numeric NOT NULL DEFAULT 10,
  tcpi_warn numeric NOT NULL DEFAULT 1.10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_id)
);

ALTER TABLE public.cost_control_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own cc thresholds" ON public.cost_control_thresholds
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own cc thresholds" ON public.cost_control_thresholds
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own cc thresholds" ON public.cost_control_thresholds
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own cc thresholds" ON public.cost_control_thresholds
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER cc_thresholds_updated_at
  BEFORE UPDATE ON public.cost_control_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
