-- ============================================================
-- UTD TaskHub v2 - Workflow Stages (project-scoped)
-- 039_workflow_stages.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workflow_stages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  key         TEXT NOT NULL CHECK (key ~ '^[a-z][a-z0-9_-]*$'),
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  color       TEXT NOT NULL DEFAULT '#64748b' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  position    INTEGER NOT NULL DEFAULT 0,
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, key)
);

CREATE INDEX IF NOT EXISTS idx_workflow_stages_project
  ON public.workflow_stages (project_id, position);

DROP TRIGGER IF EXISTS trg_workflow_stages_updated_at ON public.workflow_stages;
CREATE TRIGGER trg_workflow_stages_updated_at
  BEFORE UPDATE ON public.workflow_stages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Default seeding: trigger on new project + backfill
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.seed_default_workflow_stages()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workflow_stages (project_id, key, name, color, position, is_system)
  VALUES
    (NEW.id, 'backlog',     'Backlog',     '#64748b', 0, TRUE),
    (NEW.id, 'todo',        'To Do',       '#0058be', 1, TRUE),
    (NEW.id, 'in-progress', 'In Progress', '#f59e0b', 2, TRUE),
    (NEW.id, 'qa',          'QA',          '#7c3aed', 3, TRUE),
    (NEW.id, 'done',        'Done',        '#006c49', 4, TRUE)
  ON CONFLICT (project_id, key) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seed_workflow_stages ON public.projects;
CREATE TRIGGER trg_seed_workflow_stages
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_workflow_stages();

-- Backfill existing projects
INSERT INTO public.workflow_stages (project_id, key, name, color, position, is_system)
SELECT p.id, v.key, v.name, v.color, v.position, TRUE
FROM public.projects p
CROSS JOIN (VALUES
  ('backlog',     'Backlog',     '#64748b', 0),
  ('todo',        'To Do',       '#0058be', 1),
  ('in-progress', 'In Progress', '#f59e0b', 2),
  ('qa',          'QA',          '#7c3aed', 3),
  ('done',        'Done',        '#006c49', 4)
) AS v(key, name, color, position)
ON CONFLICT (project_id, key) DO NOTHING;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_stages: members can read" ON public.workflow_stages;
CREATE POLICY "workflow_stages: members can read"
  ON public.workflow_stages FOR SELECT
  TO authenticated
  USING (public.has_project_permission(project_id, 'project.read'));

DROP POLICY IF EXISTS "workflow_stages: managers can insert" ON public.workflow_stages;
CREATE POLICY "workflow_stages: managers can insert"
  ON public.workflow_stages FOR INSERT
  TO authenticated
  WITH CHECK (public.has_project_permission(project_id, 'columns.manage'));

DROP POLICY IF EXISTS "workflow_stages: managers can update" ON public.workflow_stages;
CREATE POLICY "workflow_stages: managers can update"
  ON public.workflow_stages FOR UPDATE
  TO authenticated
  USING (public.has_project_permission(project_id, 'columns.manage'))
  WITH CHECK (public.has_project_permission(project_id, 'columns.manage'));

DROP POLICY IF EXISTS "workflow_stages: managers can delete" ON public.workflow_stages;
CREATE POLICY "workflow_stages: managers can delete"
  ON public.workflow_stages FOR DELETE
  TO authenticated
  USING (public.has_project_permission(project_id, 'columns.manage') AND is_system = FALSE);
