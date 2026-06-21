CREATE TABLE public.cost_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cost_codes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cost_codes TO authenticated;
GRANT ALL ON public.cost_codes TO service_role;
ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read cost_codes" ON public.cost_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage cost_codes" ON public.cost_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER cost_codes_updated_at BEFORE UPDATE ON public.cost_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();