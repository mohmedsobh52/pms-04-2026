ALTER TABLE public.project_items
ADD COLUMN IF NOT EXISTS translations jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_project_items_translations
ON public.project_items USING gin (translations);