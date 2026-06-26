
-- Internal trigger functions: not meant to be called directly
REVOKE EXECUTE ON FUNCTION public.enforce_record_lock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_partner_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_contract_milestones_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.project_attachments_search_tsv() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_notify_high_risk() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_notify_contract_expiring() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_notify_new_certificate() FROM PUBLIC, anon, authenticated;

-- notify_user is an internal helper invoked by triggers/RPCs only
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, text, text, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;

-- is_record_locked is used by RLS/triggers; signed-in users don't need direct execute
REVOKE EXECUTE ON FUNCTION public.is_record_locked(text, uuid) FROM PUBLIC, anon;

-- Anonymous users should never start/cancel/decide workflows or manage notifications
REVOKE EXECUTE ON FUNCTION public.start_workflow(uuid, text, uuid, uuid, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decide_workflow_step(uuid, workflow_approval_decision, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_workflow(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_notifications_read(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.add_document_version(uuid, text, text, bigint, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_expiring_documents(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.next_proposal_number(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_project_with_items(uuid, text, text, jsonb, jsonb, numeric, text, jsonb, jsonb, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_owns_project(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
