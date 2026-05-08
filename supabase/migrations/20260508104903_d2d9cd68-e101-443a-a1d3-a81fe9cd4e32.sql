-- Baselines: snapshots of cost plan for comparison
CREATE TABLE public.cost_control_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID NOT NULL,
  name TEXT NOT NULL,
  notes TEXT,
  snapshot JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cost_control_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own baselines" ON public.cost_control_baselines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own baselines" ON public.cost_control_baselines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own baselines" ON public.cost_control_baselines FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users delete own baselines" ON public.cost_control_baselines FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_cc_baselines_project ON public.cost_control_baselines(project_id, user_id);
CREATE TRIGGER trg_cc_baselines_updated BEFORE UPDATE ON public.cost_control_baselines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Saved Views: filter/sort presets
CREATE TABLE public.cost_control_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID,
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cost_control_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users select own cc views" ON public.cost_control_views FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own cc views" ON public.cost_control_views FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own cc views" ON public.cost_control_views FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users delete own cc views" ON public.cost_control_views FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_cc_views_project ON public.cost_control_views(user_id, project_id);
CREATE TRIGGER trg_cc_views_updated BEFORE UPDATE ON public.cost_control_views
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();