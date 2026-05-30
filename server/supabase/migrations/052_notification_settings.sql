-- Per-user notification preferences.
-- email_enabled gates all emails; email.* are coarse categories (see backend map);
-- system.* gate each in-app notification type at creation time.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_settings jsonb NOT NULL DEFAULT '{
    "email_enabled": false,
    "email": {
      "project_membership": true,
      "task_changes": true
    },
    "system": {
      "project.member_added": true,
      "project.member_removed": true,
      "task.assigned": true,
      "task.updated": true,
      "task.due_soon": true,
      "task.overdue": true,
      "ticket.closed": true,
      "comment.mentioned": true,
      "role.changed": true,
      "sprint.started": true,
      "sprint.ended": true
    }
  }'::jsonb;
