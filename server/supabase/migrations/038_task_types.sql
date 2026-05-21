-- ============================================================
-- UTD TaskHub v2 - Task Types
-- 038_task_types.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.task_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE CHECK (key ~ '^[a-z][a-z0-9_]*$'),
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT NOT NULL DEFAULT '#0058be',
  icon        TEXT NOT NULL DEFAULT 'circle-dot',
  position    INTEGER NOT NULL DEFAULT 0,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_types_position ON public.task_types (position);

DROP TRIGGER IF EXISTS trg_task_types_updated_at ON public.task_types;
CREATE TRIGGER trg_task_types_updated_at
  BEFORE UPDATE ON public.task_types
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed defaults
INSERT INTO public.task_types (key, name, description, color, icon, position, is_default, is_system)
VALUES
  ('task',    'Task',    'A standard unit of work.',          '#0058be', 'circle-dot',     0, TRUE,  TRUE),
  ('bug',     'Bug',     'A defect to fix.',                  '#dc2626', 'bug',            1, FALSE, TRUE),
  ('feature', 'Feature', 'A new feature or capability.',      '#006c49', 'sparkles',       2, FALSE, TRUE),
  ('story',   'Story',   'A user story.',                     '#7c3aed', 'book-open',      3, FALSE, TRUE),
  ('epic',    'Epic',    'A large body of work.',             '#ea580c', 'layers',         4, FALSE, TRUE)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.task_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_types: authenticated can read" ON public.task_types;
CREATE POLICY "task_types: authenticated can read"
  ON public.task_types FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "task_types: admins can insert" ON public.task_types;
CREATE POLICY "task_types: admins can insert"
  ON public.task_types FOR INSERT
  TO authenticated
  WITH CHECK (public.has_global_permission('roles.manage'));

DROP POLICY IF EXISTS "task_types: admins can update" ON public.task_types;
CREATE POLICY "task_types: admins can update"
  ON public.task_types FOR UPDATE
  TO authenticated
  USING (public.has_global_permission('roles.manage'))
  WITH CHECK (public.has_global_permission('roles.manage'));

DROP POLICY IF EXISTS "task_types: admins can delete" ON public.task_types;
CREATE POLICY "task_types: admins can delete"
  ON public.task_types FOR DELETE
  TO authenticated
  USING (public.has_global_permission('roles.manage') AND is_system = FALSE);
