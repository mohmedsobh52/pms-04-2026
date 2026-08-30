ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS assigned_to uuid,
  ADD COLUMN IF NOT EXISTS decision_notes text,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS decided_by uuid,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.claim_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  event_type text NOT NULL DEFAULT 'note',
  from_status text,
  to_status text,
  body text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claim_events TO authenticated;
GRANT ALL ON public.claim_events TO service_role;
ALTER TABLE public.claim_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage events of their claims" ON public.claim_events;
CREATE POLICY "Users manage events of their claims" ON public.claim_events
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.claims c WHERE c.id = claim_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.claims c WHERE c.id = claim_id AND c.user_id = auth.uid()) AND user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_claim_events_claim ON public.claim_events(claim_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.claim_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  file_type text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claim_attachments TO authenticated;
GRANT ALL ON public.claim_attachments TO service_role;
ALTER TABLE public.claim_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage attachments of their claims" ON public.claim_attachments;
CREATE POLICY "Users manage attachments of their claims" ON public.claim_attachments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.claims c WHERE c.id = claim_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.claims c WHERE c.id = claim_id AND c.user_id = auth.uid()) AND user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_claim_attachments_claim ON public.claim_attachments(claim_id);