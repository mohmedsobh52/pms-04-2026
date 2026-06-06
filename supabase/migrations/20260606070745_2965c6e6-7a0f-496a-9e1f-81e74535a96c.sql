
-- 1) shared_analyses: replace broad UPDATE policy with safe viewer-count RPC
DROP POLICY IF EXISTS "Anyone can update viewer count" ON public.shared_analyses;

CREATE OR REPLACE FUNCTION public.increment_shared_view(_share_code text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.shared_analyses
     SET viewer_count = COALESCE(viewer_count, 0) + 1
   WHERE share_code = _share_code
     AND is_active = true
     AND expires_at > now();
$$;

REVOKE ALL ON FUNCTION public.increment_shared_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_shared_view(text) TO anon, authenticated;

-- 2) analysis_comments: drop spoofable session-id policies
DROP POLICY IF EXISTS "Authors can delete own comments" ON public.analysis_comments;
DROP POLICY IF EXISTS "Authors can update own comments" ON public.analysis_comments;

-- 3) storage buckets: explicit UPDATE policies
CREATE POLICY "Users can update their own quotations"
ON storage.objects FOR UPDATE
USING (bucket_id = 'quotations' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'quotations' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own project files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'project-files' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'project-files' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 4) evm_alert_settings: lock email to caller's JWT email
DROP POLICY IF EXISTS "Users can insert their own alert settings" ON public.evm_alert_settings;
DROP POLICY IF EXISTS "Users can update their own alert settings" ON public.evm_alert_settings;

CREATE POLICY "Users can insert their own alert settings"
ON public.evm_alert_settings FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND email = (auth.jwt() ->> 'email')
);

CREATE POLICY "Users can update their own alert settings"
ON public.evm_alert_settings FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND email = (auth.jwt() ->> 'email')
);

-- 5) Revoke EXECUTE on trigger-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_partner_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_contract_milestones_updated_at() FROM PUBLIC, anon, authenticated;
