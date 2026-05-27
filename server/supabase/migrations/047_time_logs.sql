-- 047_time_logs.sql
-- Per-task time logs ("Log Time") + sprint-capacity rollup column.
--
-- Model:
--   * Each row = one logged work session by a user against a task.
--   * user_id snapshots task.assigned_to at log time (capacity owner).
--   * sprint_id snapshots task.sprint_id so reassigning a task later does not
--     retro-shift past hours into a different sprint's capacity rollup.
--   * logged_by may differ from user_id when an admin/manager logs on behalf
--     of the assignee.

CREATE TABLE IF NOT EXISTS public.time_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id          UUID        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  logged_by        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  sprint_id        UUID        REFERENCES public.sprints(id) ON DELETE SET NULL,
  duration_minutes INTEGER     NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  description      TEXT,
  logged_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_logs_task_id     ON public.time_logs (task_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_user_id     ON public.time_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_sprint_id   ON public.time_logs (sprint_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_logged_date ON public.time_logs (logged_date);

DROP TRIGGER IF EXISTS trg_time_logs_updated_at ON public.time_logs;
CREATE TRIGGER trg_time_logs_updated_at
  BEFORE UPDATE ON public.time_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------
-- Capacity rollup column: actual logged hours per user per sprint.
-- assigned_hours stays as estimate; logged_hours is recomputed by
-- refreshUserLoggedHours() in the backend service.
-- ---------------------------------------------------------------
ALTER TABLE public.user_sprint_capacity
  ADD COLUMN IF NOT EXISTS logged_hours NUMERIC(6,2) NOT NULL DEFAULT 0;

-- Extend column-level UPDATE grant introduced in 023 so backend rollups
-- (assigned_hours + logged_hours) succeed under the authenticated role.
-- Service role still bypasses, but this keeps behavior consistent across
-- environments where the backend client is not service_role.
REVOKE UPDATE ON public.user_sprint_capacity FROM authenticated;
GRANT  UPDATE (capacity_hours, assigned_hours, logged_hours, updated_at)
  ON public.user_sprint_capacity TO authenticated;

-- ---------------------------------------------------------------
-- RLS: read for any authenticated user; writes via backend (service role).
-- Backend controller enforces "assignee or admin/manager" semantics.
-- ---------------------------------------------------------------
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "time_logs: read for authenticated"  ON public.time_logs;
DROP POLICY IF EXISTS "time_logs: self or admin can write" ON public.time_logs;

CREATE POLICY "time_logs: read for authenticated"
  ON public.time_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "time_logs: self or admin can write"
  ON public.time_logs FOR ALL
  TO authenticated
  USING (
    logged_by = auth.uid()
    OR user_id = auth.uid()
    OR public.is_platform_admin_or_manager()
  )
  WITH CHECK (
    logged_by = auth.uid()
    OR user_id = auth.uid()
    OR public.is_platform_admin_or_manager()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_logs TO authenticated;
