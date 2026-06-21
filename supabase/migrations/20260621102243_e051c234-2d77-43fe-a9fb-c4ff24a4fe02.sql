REVOKE EXECUTE ON FUNCTION public.is_record_locked(text, uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_record_locked(text, uuid) TO authenticated;