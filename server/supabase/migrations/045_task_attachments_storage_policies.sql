-- ============================================================
-- RLS for storage.objects on the `task-attachments` bucket.
-- Path shape from server controller: `<projectId>/<taskId>/<ts>-<name>`.
-- Access mirrors public.task_attachments table policies:
-- only project members can read/insert/delete.
-- ============================================================

CREATE POLICY "task-attachments: members can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND is_project_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "task-attachments: members can read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND is_project_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "task-attachments: members can delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'task-attachments'
    AND is_project_member(((storage.foldername(name))[1])::uuid)
  );
