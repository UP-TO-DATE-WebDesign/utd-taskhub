-- ============================================================
-- UTD TaskHub v2 - Align task.status with workflow_stages
-- 040_align_task_status_with_stages.sql
-- ============================================================

-- 1. Re-create seed function to include cancelled (6th system stage)
CREATE OR REPLACE FUNCTION public.seed_default_workflow_stages()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workflow_stages (project_id, key, name, color, position, is_system)
  VALUES
    (NEW.id, 'backlog',     'Backlog',     '#64748b', 0, TRUE),
    (NEW.id, 'todo',        'To Do',       '#0058be', 1, TRUE),
    (NEW.id, 'in-progress', 'In Progress', '#f59e0b', 2, TRUE),
    (NEW.id, 'qa',          'QA',          '#7c3aed', 3, TRUE),
    (NEW.id, 'done',        'Done',        '#006c49', 4, TRUE),
    (NEW.id, 'cancelled',   'Cancelled',   '#94a3b8', 5, TRUE)
  ON CONFLICT (project_id, key) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Backfill cancelled stage for existing projects
INSERT INTO public.workflow_stages (project_id, key, name, color, position, is_system)
SELECT p.id, 'cancelled', 'Cancelled', '#94a3b8', 5, TRUE
FROM public.projects p
ON CONFLICT (project_id, key) DO NOTHING;

-- 3. Drop old CHECK constraint so we can re-key values
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- 4. Re-key existing task rows
UPDATE public.tasks SET status = 'in-progress' WHERE status = 'in_progress';
UPDATE public.tasks SET status = 'qa'          WHERE status = 'review';

-- 5. Validation trigger: tasks.status must exist in this project's workflow_stages
CREATE OR REPLACE FUNCTION public.tasks_validate_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.workflow_stages
    WHERE project_id = NEW.project_id AND key = NEW.status
  ) THEN
    RAISE EXCEPTION 'Invalid task status "%" for project %', NEW.status, NEW.project_id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_validate_status ON public.tasks;
CREATE TRIGGER trg_tasks_validate_status
  BEFORE INSERT OR UPDATE OF status, project_id ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_validate_status();

-- 6. On stage delete (custom only), reassign affected tasks to backlog
CREATE OR REPLACE FUNCTION public.reassign_tasks_on_stage_delete()
RETURNS TRIGGER AS $$
DECLARE
  fallback_key TEXT;
BEGIN
  SELECT key INTO fallback_key
  FROM public.workflow_stages
  WHERE project_id = OLD.project_id AND key = 'backlog'
  LIMIT 1;

  IF fallback_key IS NOT NULL THEN
    UPDATE public.tasks
    SET status = fallback_key
    WHERE project_id = OLD.project_id AND status = OLD.key;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reassign_tasks_on_stage_delete ON public.workflow_stages;
CREATE TRIGGER trg_reassign_tasks_on_stage_delete
  BEFORE DELETE ON public.workflow_stages
  FOR EACH ROW EXECUTE FUNCTION public.reassign_tasks_on_stage_delete();
