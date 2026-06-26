
CREATE INDEX IF NOT EXISTS idx_project_items_project_sort ON public.project_items (project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_project_items_project_section ON public.project_items (project_id, is_section);
CREATE INDEX IF NOT EXISTS idx_progress_certificates_project_created ON public.progress_certificates (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_user_end_date ON public.contracts (user_id, end_date);
CREATE INDEX IF NOT EXISTS idx_contract_milestones_user_due ON public.contract_milestones (user_id, due_date) WHERE status <> 'completed';
CREATE INDEX IF NOT EXISTS idx_project_data_user_created ON public.project_data (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risks_project_score ON public.risks (project_id, risk_score DESC);
