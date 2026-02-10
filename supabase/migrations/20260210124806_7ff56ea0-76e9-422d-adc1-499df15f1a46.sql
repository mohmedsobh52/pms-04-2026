
-- Progress Certificates table
CREATE TABLE public.progress_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.saved_projects(id),
  contract_id UUID REFERENCES public.contracts(id),
  contractor_name TEXT NOT NULL,
  certificate_number INTEGER NOT NULL DEFAULT 1,
  period_from DATE,
  period_to DATE,
  total_work_done NUMERIC DEFAULT 0,
  previous_work_done NUMERIC DEFAULT 0,
  current_work_done NUMERIC DEFAULT 0,
  retention_percentage NUMERIC DEFAULT 10,
  retention_amount NUMERIC DEFAULT 0,
  advance_deduction NUMERIC DEFAULT 0,
  other_deductions NUMERIC DEFAULT 0,
  net_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.progress_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own certificates" ON public.progress_certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own certificates" ON public.progress_certificates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own certificates" ON public.progress_certificates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own certificates" ON public.progress_certificates FOR DELETE USING (auth.uid() = user_id);

-- Progress Certificate Items table
CREATE TABLE public.progress_certificate_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_id UUID NOT NULL REFERENCES public.progress_certificates(id) ON DELETE CASCADE,
  project_item_id UUID REFERENCES public.project_items(id),
  item_number TEXT,
  description TEXT NOT NULL,
  unit TEXT,
  contract_quantity NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  previous_quantity NUMERIC DEFAULT 0,
  current_quantity NUMERIC DEFAULT 0,
  total_quantity NUMERIC DEFAULT 0,
  current_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.progress_certificate_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view certificate items" ON public.progress_certificate_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.progress_certificates WHERE id = certificate_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create certificate items" ON public.progress_certificate_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.progress_certificates WHERE id = certificate_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update certificate items" ON public.progress_certificate_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.progress_certificates WHERE id = certificate_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete certificate items" ON public.progress_certificate_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.progress_certificates WHERE id = certificate_id AND user_id = auth.uid())
);

-- Trigger for updated_at
CREATE TRIGGER update_progress_certificates_updated_at
  BEFORE UPDATE ON public.progress_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
