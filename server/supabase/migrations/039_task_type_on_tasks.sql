-- ============================================================
-- UTD TaskHub v2 - Link tasks to task_types
-- 039_task_type_on_tasks.sql
-- ============================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_type_id UUID
  REFERENCES public.task_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_task_type_id ON public.tasks (task_type_id);

-- Backfill existing rows with the default task type.
UPDATE public.tasks t
SET task_type_id = tt.id
FROM public.task_types tt
WHERE tt.is_default = TRUE
  AND t.task_type_id IS NULL;
