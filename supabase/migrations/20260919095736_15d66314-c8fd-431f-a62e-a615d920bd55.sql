REVOKE EXECUTE ON FUNCTION public.notify_overdue_claims() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.notify_overdue_claims() TO service_role;