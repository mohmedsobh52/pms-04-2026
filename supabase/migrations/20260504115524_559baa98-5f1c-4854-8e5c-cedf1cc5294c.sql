-- جدول سجل تدقيق محاولات حفظ بنود التحليل المتقدم
CREATE TABLE public.analysis_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID,
  project_item_id UUID,
  item_number TEXT,
  action TEXT NOT NULL, -- 'inline_edit' | 'price_update' | etc
  status TEXT NOT NULL, -- 'success' | 'failure'
  attempts INTEGER NOT NULL DEFAULT 1,
  changed_fields JSONB,
  previous_values JSONB,
  new_values JSONB,
  error_code TEXT,
  error_message TEXT,
  client_ref TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_analysis_audit_logs_user ON public.analysis_audit_logs(user_id, created_at DESC);
CREATE INDEX idx_analysis_audit_logs_project ON public.analysis_audit_logs(project_id, created_at DESC);
CREATE INDEX idx_analysis_audit_logs_status ON public.analysis_audit_logs(status) WHERE status = 'failure';

ALTER TABLE public.analysis_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs"
ON public.analysis_audit_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own audit logs"
ON public.analysis_audit_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- لا نسمح بالتحديث/الحذف لأي مستخدم — السجل غير قابل للتعديل
-- (الإداريون يمكنهم لاحقاً عبر has_role لو رغبنا)
CREATE POLICY "Admins can delete audit logs"
ON public.analysis_audit_logs FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));