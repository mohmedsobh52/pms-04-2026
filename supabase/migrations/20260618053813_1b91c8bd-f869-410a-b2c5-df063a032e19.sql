
-- Revoke anon execute on internal SECURITY DEFINER functions that should require authentication
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_owns_project(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.save_project_with_items(uuid, text, text, jsonb, jsonb, numeric, text, jsonb, jsonb, boolean) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_partner_rating() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_contract_milestones_updated_at() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_project_with_items(uuid, text, text, jsonb, jsonb, numeric, text, jsonb, jsonb, boolean) TO authenticated;

-- Shared analysis functions intentionally remain callable by anon (public share links)
-- get_shared_analysis, get_shared_comments, add_shared_comment, resolve_shared_comment, increment_shared_view
