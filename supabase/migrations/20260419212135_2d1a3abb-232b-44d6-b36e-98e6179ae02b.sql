-- Performance indexes on heavily-queried columns
CREATE INDEX IF NOT EXISTS idx_saved_projects_user_id ON public.saved_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_projects_user_updated ON public.saved_projects(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON public.contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON public.contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);

CREATE INDEX IF NOT EXISTS idx_contract_milestones_contract_id ON public.contract_milestones(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_milestones_user_id ON public.contract_milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_milestones_due_date ON public.contract_milestones(due_date);

CREATE INDEX IF NOT EXISTS idx_contract_payments_contract_id ON public.contract_payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_payments_user_id ON public.contract_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_payments_due_date ON public.contract_payments(due_date);

CREATE INDEX IF NOT EXISTS idx_contract_warranties_contract_id ON public.contract_warranties(contract_id);

CREATE INDEX IF NOT EXISTS idx_cost_analysis_user_id ON public.cost_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_cost_analysis_project_id ON public.cost_analysis(project_id);

CREATE INDEX IF NOT EXISTS idx_edited_boq_prices_user_id ON public.edited_boq_prices(user_id);
CREATE INDEX IF NOT EXISTS idx_edited_boq_prices_saved_project_id ON public.edited_boq_prices(saved_project_id);

CREATE INDEX IF NOT EXISTS idx_external_partners_user_id ON public.external_partners(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_contracts_user_id ON public.partner_contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_contracts_partner_id ON public.partner_contracts(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_reviews_partner_id ON public.partner_reviews(partner_id);

CREATE INDEX IF NOT EXISTS idx_material_prices_user_id ON public.material_prices(user_id);
CREATE INDEX IF NOT EXISTS idx_material_prices_category ON public.material_prices(category);

CREATE INDEX IF NOT EXISTS idx_labor_rates_user_id ON public.labor_rates(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_rates_user_id ON public.equipment_rates(user_id);

CREATE INDEX IF NOT EXISTS idx_historical_pricing_files_user_id ON public.historical_pricing_files(user_id);
CREATE INDEX IF NOT EXISTS idx_pricing_history_user_id ON public.pricing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_pricing_history_item_number ON public.pricing_history(item_number);

CREATE INDEX IF NOT EXISTS idx_offer_requests_user_id ON public.offer_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_price_quotations_user_id ON public.price_quotations(user_id);
CREATE INDEX IF NOT EXISTS idx_price_quotations_project_id ON public.price_quotations(project_id);
CREATE INDEX IF NOT EXISTS idx_ocr_extracted_texts_quotation_id ON public.ocr_extracted_texts(quotation_id);

CREATE INDEX IF NOT EXISTS idx_attachment_folders_user_id ON public.attachment_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_attachment_folders_project_id ON public.attachment_folders(project_id);

CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_id ON public.analysis_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON public.analysis_jobs(status);

CREATE INDEX IF NOT EXISTS idx_analysis_comments_share_code ON public.analysis_comments(share_code);
