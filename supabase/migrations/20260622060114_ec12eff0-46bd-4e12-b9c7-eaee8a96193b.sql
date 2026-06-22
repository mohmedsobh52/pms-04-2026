
ALTER TABLE public.technical_proposals
  ADD COLUMN IF NOT EXISTS proposal_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS technical_proposals_user_number_uidx
  ON public.technical_proposals(user_id, proposal_number)
  WHERE proposal_number IS NOT NULL;

CREATE OR REPLACE FUNCTION public.next_proposal_number(_user uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text := to_char(now(), 'YYYY');
  v_max  int;
  v_next int;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(proposal_number, '^TP-' || v_year || '-', ''), '')::int), 0)
    INTO v_max
    FROM public.technical_proposals
   WHERE user_id = _user
     AND proposal_number LIKE 'TP-' || v_year || '-%';
  v_next := v_max + 1;
  RETURN 'TP-' || v_year || '-' || lpad(v_next::text, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_proposal_number(uuid) TO authenticated;
