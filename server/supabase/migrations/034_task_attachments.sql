-- ============================================================
-- TABLE: task_attachments
-- Files attached to tasks (images, PDFs, docs, etc.).
-- Stored in the public Supabase Storage bucket `task-attachments`.
-- ============================================================

CREATE TABLE public.task_attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID NOT NULL REFERENCES public.tasks(id)    ON DELETE CASCADE,
  file_url     TEXT NOT NULL,
  file_path    TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  file_size    INTEGER NOT NULL,
  uploaded_by  UUID         REFERENCES public.profiles(id)  ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_attachments_task_id     ON public.task_attachments (task_id);
CREATE INDEX idx_task_attachments_uploaded_by ON public.task_attachments (uploaded_by);

-- ============================================================
-- RLS
-- Access derived from the parent task's project membership.
-- ============================================================

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_attachments: members can read"
  ON public.task_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_attachments.task_id
        AND is_project_member(t.project_id)
    )
  );

CREATE POLICY "task_attachments: members can insert"
  ON public.task_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_attachments.task_id
        AND is_project_member(t.project_id)
    )
  );

CREATE POLICY "task_attachments: members can delete"
  ON public.task_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_attachments.task_id
        AND is_project_member(t.project_id)
    )
  );
