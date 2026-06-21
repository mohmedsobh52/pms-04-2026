
REVOKE EXECUTE ON FUNCTION public.add_document_version(uuid, text, text, bigint, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_expiring_documents(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_document_version(uuid, text, text, bigint, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_expiring_documents(integer) TO authenticated;
