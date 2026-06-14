
-- ============================================
-- SECURITY HARDENING MIGRATION
-- ============================================

-- 1) shared_analyses: restrict broad SELECT, expose access via SECURITY DEFINER RPC
DROP POLICY IF EXISTS "Anyone can view shared analyses with valid code" ON public.shared_analyses;
DROP POLICY IF EXISTS "Authenticated users can create shared analyses" ON public.shared_analyses;

CREATE POLICY "Creators can view their shared analyses"
ON public.shared_analyses
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can create shared analyses"
ON public.shared_analyses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- RPC: fetch a shared analysis by code (requires knowledge of the code), increments viewer_count
CREATE OR REPLACE FUNCTION public.get_shared_analysis(_share_code text)
RETURNS TABLE (
  id uuid,
  share_code varchar,
  analysis_data jsonb,
  wbs_data jsonb,
  file_name text,
  created_at timestamptz,
  expires_at timestamptz,
  viewer_count integer,
  is_active boolean,
  created_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _share_code IS NULL OR length(trim(_share_code)) = 0 THEN
    RETURN;
  END IF;

  UPDATE public.shared_analyses sa
  SET viewer_count = COALESCE(sa.viewer_count, 0) + 1
  WHERE sa.share_code = _share_code
    AND sa.is_active = true
    AND sa.expires_at > now();

  RETURN QUERY
  SELECT sa.id, sa.share_code, sa.analysis_data, sa.wbs_data, sa.file_name,
         sa.created_at, sa.expires_at, sa.viewer_count, sa.is_active, sa.created_by
  FROM public.shared_analyses sa
  WHERE sa.share_code = _share_code
    AND sa.is_active = true
    AND sa.expires_at > now();
END;
$$;

REVOKE ALL ON FUNCTION public.get_shared_analysis(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_analysis(text) TO anon, authenticated;

-- 2) analysis_comments: restrict broad SELECT, expose via SECURITY DEFINER RPCs
DROP POLICY IF EXISTS "Anyone can view comments for active shares" ON public.analysis_comments;
DROP POLICY IF EXISTS "Users can add comments to valid shares" ON public.analysis_comments;

CREATE POLICY "Share creators can view comments on their shares"
ON public.analysis_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shared_analyses sa
    WHERE sa.share_code = analysis_comments.share_code
      AND sa.created_by = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.get_shared_comments(_share_code text)
RETURNS SETOF public.analysis_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _share_code IS NULL OR length(trim(_share_code)) = 0 THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.shared_analyses sa
    WHERE sa.share_code = _share_code
      AND sa.is_active = true
      AND sa.expires_at > now()
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT * FROM public.analysis_comments
  WHERE share_code = _share_code
  ORDER BY created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_shared_comments(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_comments(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.add_shared_comment(
  _share_code text,
  _author_name text,
  _comment_text text,
  _item_id text DEFAULT NULL,
  _comment_type text DEFAULT 'general',
  _parent_id uuid DEFAULT NULL,
  _author_email text DEFAULT NULL
)
RETURNS public.analysis_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.analysis_comments;
BEGIN
  IF _share_code IS NULL OR length(trim(_share_code)) = 0
     OR _author_name IS NULL OR length(trim(_author_name)) = 0
     OR _comment_text IS NULL OR length(trim(_comment_text)) = 0 THEN
    RAISE EXCEPTION 'Missing required fields';
  END IF;

  IF length(_author_name) > 120 OR length(_comment_text) > 4000 THEN
    RAISE EXCEPTION 'Input too long';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.shared_analyses sa
    WHERE sa.share_code = _share_code
      AND sa.is_active = true
      AND sa.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Invalid or expired share code';
  END IF;

  INSERT INTO public.analysis_comments
    (share_code, author_name, comment_text, item_id, comment_type, parent_id, author_email)
  VALUES
    (_share_code, trim(_author_name), trim(_comment_text), _item_id,
     COALESCE(_comment_type, 'general'), _parent_id, _author_email)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.add_shared_comment(text, text, text, text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_shared_comment(text, text, text, text, text, uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.resolve_shared_comment(_comment_id uuid, _share_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.shared_analyses sa
    WHERE sa.share_code = _share_code
      AND sa.is_active = true
      AND sa.expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Invalid or expired share code';
  END IF;

  UPDATE public.analysis_comments
  SET is_resolved = true, updated_at = now()
  WHERE id = _comment_id
    AND share_code = _share_code;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_shared_comment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_shared_comment(uuid, text) TO anon, authenticated;

-- 3) reference_prices: enforce user_id NOT NULL with auth.uid() default
DELETE FROM public.reference_prices WHERE user_id IS NULL;
ALTER TABLE public.reference_prices ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.reference_prices ALTER COLUMN user_id SET NOT NULL;

DROP POLICY IF EXISTS "Users can insert their own reference prices" ON public.reference_prices;
CREATE POLICY "Users can insert their own reference prices"
ON public.reference_prices
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4) contract_alert_settings: add DELETE policy and tighten INSERT
DROP POLICY IF EXISTS "Users can create their own alert settings" ON public.contract_alert_settings;
CREATE POLICY "Users can create their own alert settings"
ON public.contract_alert_settings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alert settings"
ON public.contract_alert_settings
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 5) Lock down SECURITY DEFINER trigger/internal functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.update_partner_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_shared_view(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.save_project_with_items(uuid, text, text, jsonb, jsonb, numeric, text, jsonb, jsonb, boolean) FROM PUBLIC, anon;
-- Keep authenticated EXECUTE for save_project_with_items (used by app)
GRANT EXECUTE ON FUNCTION public.save_project_with_items(uuid, text, text, jsonb, jsonb, numeric, text, jsonb, jsonb, boolean) TO authenticated;
