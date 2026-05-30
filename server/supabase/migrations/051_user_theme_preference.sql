-- Per-user theme preference (light / dark / system) for dark mode.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'system'
  CHECK (theme IN ('light', 'dark', 'system'));
