-- ============================================================
-- TABLE: ticket_attachments
-- Files attached to tickets (images, video, PDFs, docs, etc.).
-- Stored in the public Supabase Storage bucket `ticket-attachments`.
-- ============================================================

CREATE TABLE public.ticket_attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID NOT NULL REFERENCES public.tickets(id)  ON DELETE CASCADE,
  file_url     TEXT NOT NULL,
  file_path    TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  file_size    INTEGER NOT NULL,
  uploaded_by  UUID         REFERENCES public.profiles(id)  ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_attachments_ticket_id   ON public.ticket_attachments (ticket_id);
CREATE INDEX idx_ticket_attachments_uploaded_by ON public.ticket_attachments (uploaded_by);

-- ============================================================
-- RLS
-- Access derived from the parent ticket's project membership.
-- ============================================================

ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_attachments: members can read"
  ON public.ticket_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_attachments.ticket_id
        AND is_project_member(t.project_id)
    )
  );

CREATE POLICY "ticket_attachments: members can insert"
  ON public.ticket_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_attachments.ticket_id
        AND is_project_member(t.project_id)
    )
  );

CREATE POLICY "ticket_attachments: members can delete"
  ON public.ticket_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_attachments.ticket_id
        AND is_project_member(t.project_id)
    )
  );
