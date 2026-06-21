
-- DMS extensions on project_attachments
ALTER TABLE public.project_attachments
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS version_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_attachment_id uuid REFERENCES public.project_attachments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_latest boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS indexed_text text,
  ADD COLUMN IF NOT EXISTS search_tsv tsvector;

CREATE INDEX IF NOT EXISTS idx_pa_parent ON public.project_attachments(parent_attachment_id);
CREATE INDEX IF NOT EXISTS idx_pa_project_latest ON public.project_attachments(project_id, is_latest);
CREATE INDEX IF NOT EXISTS idx_pa_tags ON public.project_attachments USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_pa_expiry ON public.project_attachments(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pa_search ON public.project_attachments USING gin (search_tsv);

CREATE OR REPLACE FUNCTION public.project_attachments_search_tsv()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.file_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(NEW.tags, ' ')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.indexed_text, '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pa_search_tsv ON public.project_attachments;
CREATE TRIGGER trg_pa_search_tsv
  BEFORE INSERT OR UPDATE OF title, file_name, description, tags, indexed_text
  ON public.project_attachments
  FOR EACH ROW EXECUTE FUNCTION public.project_attachments_search_tsv();

-- Backfill tsv
UPDATE public.project_attachments
   SET search_tsv =
     setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
     setweight(to_tsvector('simple', coalesce(file_name, '')), 'A') ||
     setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
     setweight(to_tsvector('simple', array_to_string(tags, ' ')), 'B') ||
     setweight(to_tsvector('simple', coalesce(indexed_text, '')), 'C')
 WHERE search_tsv IS NULL;

-- New version RPC: clones a "latest" row into a new attachment row pointing to a new storage path
CREATE OR REPLACE FUNCTION public.add_document_version(
  _parent_id uuid,
  _file_name text,
  _file_path text,
  _file_size bigint,
  _file_type text,
  _description text DEFAULT NULL
) RETURNS public.project_attachments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_parent public.project_attachments;
  v_root_id uuid;
  v_next_version integer;
  v_new public.project_attachments;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_parent FROM public.project_attachments WHERE id = _parent_id;
  IF v_parent.id IS NULL THEN RAISE EXCEPTION 'Parent attachment not found'; END IF;

  IF NOT (v_parent.user_id = v_user OR public.user_owns_project(v_parent.project_id) OR public.has_role(v_user, 'admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_root_id := COALESCE(v_parent.parent_attachment_id, v_parent.id);

  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next_version
    FROM public.project_attachments
   WHERE id = v_root_id OR parent_attachment_id = v_root_id;

  -- mark all siblings as not-latest
  UPDATE public.project_attachments
     SET is_latest = false
   WHERE id = v_root_id OR parent_attachment_id = v_root_id;

  INSERT INTO public.project_attachments
    (project_id, user_id, file_name, file_path, file_size, file_type,
     category, description, folder_id, title, version_number,
     parent_attachment_id, is_latest, tags, expiry_date)
  VALUES
    (v_parent.project_id, v_user, _file_name, _file_path, _file_size, _file_type,
     v_parent.category, COALESCE(_description, v_parent.description),
     v_parent.folder_id, v_parent.title, v_next_version,
     v_root_id, true, v_parent.tags, v_parent.expiry_date)
  RETURNING * INTO v_new;

  INSERT INTO public.financial_audit_logs (user_id, action, entity_type, entity_id, after_state)
  VALUES (v_user, 'document_new_version', 'project_attachment', v_new.id,
          jsonb_build_object('root_id', v_root_id, 'version', v_next_version));

  RETURN v_new;
END;
$$;

-- Expiring documents helper (next N days, default 30)
CREATE OR REPLACE FUNCTION public.get_expiring_documents(_days integer DEFAULT 30)
RETURNS SETOF public.project_attachments
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
    FROM public.project_attachments
   WHERE is_latest = true
     AND expiry_date IS NOT NULL
     AND expiry_date <= current_date + (_days || ' days')::interval
     AND (
       user_id = auth.uid()
       OR public.user_owns_project(project_id)
       OR public.has_role(auth.uid(), 'admin')
     )
   ORDER BY expiry_date ASC;
$$;
