-- Add URL-friendly slug and optional app_domain to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS slug text;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS app_domain text;

-- Backfill slug: lowercase name, non-alphanumeric runs -> '-', trim dashes
DO $$
DECLARE
  rec RECORD;
  base text;
  candidate text;
  suffix int;
BEGIN
  FOR rec IN
    SELECT id, name FROM public.projects WHERE slug IS NULL ORDER BY created_at
  LOOP
    base := trim(both '-' from regexp_replace(lower(coalesce(rec.name, '')), '[^a-z0-9]+', '-', 'g'));
    IF length(base) = 0 THEN
      base := 'project';
    END IF;
    candidate := base;
    suffix := 1;
    WHILE EXISTS (SELECT 1 FROM public.projects WHERE slug = candidate) LOOP
      candidate := base || '-' || suffix::text;
      suffix := suffix + 1;
    END LOOP;
    UPDATE public.projects SET slug = candidate WHERE id = rec.id;
  END LOOP;
END$$;

ALTER TABLE public.projects
  ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_slug_unique'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_slug_unique UNIQUE (slug);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_slug_format_check'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_slug_format_check
      CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects (slug);
