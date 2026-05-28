-- 050_sprint_reports.sql
-- Stores AI-generated dev summaries per sprint. The markdown content comes
-- from the external Dev Updates & Reports API (generate-report), keyed in
-- TaskHub by sprint so local history is preserved even when the external
-- report (keyed by month/year) gets overwritten.

CREATE TABLE IF NOT EXISTS public.sprint_reports (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id          UUID        NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  month              INTEGER     NOT NULL CHECK (month BETWEEN 1 AND 12),
  year               INTEGER     NOT NULL,
  title              TEXT        NOT NULL,
  content            TEXT        NOT NULL,
  stats              JSONB       NOT NULL DEFAULT '{}'::jsonb,
  external_report_id TEXT,
  created_by         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_sprint_reports_sprint UNIQUE (sprint_id)
);

CREATE INDEX IF NOT EXISTS idx_sprint_reports_sprint_id ON public.sprint_reports (sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_reports_period    ON public.sprint_reports (year, month);

DROP TRIGGER IF EXISTS trg_sprint_reports_updated_at ON public.sprint_reports;
CREATE TRIGGER trg_sprint_reports_updated_at
  BEFORE UPDATE ON public.sprint_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.sprint_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sprint_reports: read for authenticated"
  ON public.sprint_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "sprint_reports: admin or manager can write"
  ON public.sprint_reports FOR ALL
  TO authenticated
  USING (public.is_platform_admin_or_manager())
  WITH CHECK (public.is_platform_admin_or_manager());
