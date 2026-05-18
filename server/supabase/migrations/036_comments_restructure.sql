-- 036_comments_restructure.sql
-- Restructure comments: replace parent_type+parent_id with task_id/ticket_id,
-- and add parent_comment_id for 1-layer replies.
BEGIN;

-- 1. Add new columns
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS task_id           UUID REFERENCES public.tasks(id)    ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS ticket_id         UUID REFERENCES public.tickets(id)  ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- 2. Backfill from legacy parent_type / parent_id if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'parent_type'
  ) THEN
    EXECUTE $sql$
      UPDATE public.comments
      SET task_id = parent_id
      WHERE parent_type = 'task' AND task_id IS NULL
    $sql$;
    EXECUTE $sql$
      UPDATE public.comments
      SET ticket_id = parent_id
      WHERE parent_type = 'ticket' AND ticket_id IS NULL
    $sql$;
  END IF;
END $$;

-- 3. Drop legacy policies that reference parent_type / parent_id
DROP POLICY IF EXISTS "comments: permitted users can read"          ON public.comments;
DROP POLICY IF EXISTS "comments: permitted users can insert"        ON public.comments;
DROP POLICY IF EXISTS "comments: permitted users can update"        ON public.comments;
DROP POLICY IF EXISTS "comments: permitted users can delete"        ON public.comments;
DROP POLICY IF EXISTS "comments: members can read"                  ON public.comments;
DROP POLICY IF EXISTS "comments: members can insert"                ON public.comments;
DROP POLICY IF EXISTS "comments: creator can update"                ON public.comments;
DROP POLICY IF EXISTS "comments: creator or manager can delete"     ON public.comments;

-- 4. Drop legacy index and columns
DROP INDEX IF EXISTS idx_comments_parent;

ALTER TABLE public.comments
  DROP COLUMN IF EXISTS parent_type,
  DROP COLUMN IF EXISTS parent_id;

-- 5. Constraint: exactly one of task_id / ticket_id
ALTER TABLE public.comments
  DROP CONSTRAINT IF EXISTS comments_parent_xor;
ALTER TABLE public.comments
  ADD CONSTRAINT comments_parent_xor
  CHECK (
    ((task_id IS NOT NULL)::int + (ticket_id IS NOT NULL)::int) = 1
  );

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_comments_task_id           ON public.comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_ticket_id         ON public.comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON public.comments(parent_comment_id);

-- 7. New RLS policies
CREATE POLICY "comments: permitted users can read"
  ON public.comments FOR SELECT
  USING (
    (task_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.has_project_permission(t.project_id, 'comments.read')
    ))
    OR
    (ticket_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tickets tk
      WHERE tk.id = ticket_id AND public.has_project_permission(tk.project_id, 'comments.read')
    ))
  );

CREATE POLICY "comments: permitted users can insert"
  ON public.comments FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (
      (task_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND public.has_project_permission(t.project_id, 'comments.create')
      ))
      OR
      (ticket_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.tickets tk
        WHERE tk.id = ticket_id AND public.has_project_permission(tk.project_id, 'comments.create')
      ))
    )
  );

CREATE POLICY "comments: permitted users can update"
  ON public.comments FOR UPDATE
  USING (
    created_by = auth.uid()
    AND (
      (task_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_id AND public.has_project_permission(t.project_id, 'comments.update_own')
      ))
      OR
      (ticket_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.tickets tk
        WHERE tk.id = ticket_id AND public.has_project_permission(tk.project_id, 'comments.update_own')
      ))
    )
  )
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "comments: permitted users can delete"
  ON public.comments FOR DELETE
  USING (
    (
      created_by = auth.uid()
      AND (
        (task_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.tasks t
          WHERE t.id = task_id AND public.has_project_permission(t.project_id, 'comments.delete_own')
        ))
        OR
        (ticket_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.tickets tk
          WHERE tk.id = ticket_id AND public.has_project_permission(tk.project_id, 'comments.delete_own')
        ))
      )
    )
    OR
    (task_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.has_project_permission(t.project_id, 'comments.moderate')
    ))
    OR
    (ticket_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tickets tk
      WHERE tk.id = ticket_id AND public.has_project_permission(tk.project_id, 'comments.moderate')
    ))
  );

COMMIT;
