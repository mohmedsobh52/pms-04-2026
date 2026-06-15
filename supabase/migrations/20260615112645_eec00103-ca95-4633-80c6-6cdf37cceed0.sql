
-- Lock down EXECUTE on SECURITY DEFINER functions: revoke from PUBLIC and only grant
-- to the roles that actually need to call each function.

-- Trigger-only functions (called by triggers; no role needs EXECUTE)
REVOKE ALL ON FUNCTION public.update_partner_rating() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_contract_milestones_updated_at() FROM PUBLIC, anon, authenticated;

-- RLS helper functions (referenced inside policies; SECURITY DEFINER runs with owner privs
-- regardless of caller EXECUTE on the function, but they should not be callable via the API)
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.user_owns_project(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_project(uuid) TO authenticated;

-- Authenticated-only RPC
REVOKE ALL ON FUNCTION public.save_project_with_items(uuid, text, text, jsonb, jsonb, numeric, text, jsonb, jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_project_with_items(uuid, text, text, jsonb, jsonb, numeric, text, jsonb, jsonb, boolean) TO authenticated;

-- Public share RPCs (intentionally anon-callable for the public SharedView page)
REVOKE ALL ON FUNCTION public.get_shared_analysis(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_analysis(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_shared_comments(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_comments(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.add_shared_comment(text, text, text, text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_shared_comment(text, text, text, text, text, uuid, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.resolve_shared_comment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_shared_comment(uuid, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.increment_shared_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_shared_view(text) TO anon, authenticated;
