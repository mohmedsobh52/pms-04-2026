
ALTER TABLE public.progress_certificates
  ADD COLUMN IF NOT EXISTS vat_percentage numeric DEFAULT 15,
  ADD COLUMN IF NOT EXISTS vat_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delay_penalty numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS materials_on_site_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS materials_on_site_percentage numeric DEFAULT 80,
  ADD COLUMN IF NOT EXISTS additional_deductions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approval_history jsonb DEFAULT '[]'::jsonb;
