-- 048_workspace_feature_flags.sql
-- Workspace-level toggles for optional features.
-- enable_time_logging: master switch for the Log Time UI on task details.

ALTER TABLE public.workspace_settings
  ADD COLUMN IF NOT EXISTS enable_time_logging BOOLEAN NOT NULL DEFAULT true;
