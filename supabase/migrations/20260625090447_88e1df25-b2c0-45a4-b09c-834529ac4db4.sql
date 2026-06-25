ALTER TABLE public.technical_proposals
  ADD COLUMN IF NOT EXISTS validity_days integer,
  ADD COLUMN IF NOT EXISTS payment_terms text;