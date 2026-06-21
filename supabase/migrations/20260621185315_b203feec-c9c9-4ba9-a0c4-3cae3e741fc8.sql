CREATE TABLE IF NOT EXISTS public.technical_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  project_id uuid REFERENCES public.saved_projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  client_name text,
  project_scope text,
  duration_months numeric,
  budget numeric,
  currency text DEFAULT 'SAR',
  language text DEFAULT 'ar',
  sections jsonb DEFAULT '[]'::jsonb,
  inputs jsonb DEFAULT '{}'::jsonb,
  content text,
  model text,
  status text DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.technical_proposals TO authenticated;
GRANT ALL ON public.technical_proposals TO service_role;

ALTER TABLE public.technical_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tp_select_own" ON public.technical_proposals
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "tp_insert_own" ON public.technical_proposals
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "tp_update_own" ON public.technical_proposals
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "tp_delete_own" ON public.technical_proposals
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_tp_updated_at
  BEFORE UPDATE ON public.technical_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_tp_user ON public.technical_proposals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tp_project ON public.technical_proposals(project_id);