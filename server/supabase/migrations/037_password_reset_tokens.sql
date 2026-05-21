-- 037_password_reset_tokens.sql
-- One-shot tokens for password reset links emailed via Gmail SMTP.

CREATE TABLE public.password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  token      TEXT NOT NULL UNIQUE
             DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL
             DEFAULT (NOW() + INTERVAL '7 days'),
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_token   ON public.password_reset_tokens (token);
CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens (user_id);
CREATE INDEX idx_password_reset_tokens_email   ON public.password_reset_tokens (email);

-- Service role only; no client RLS policies needed (server uses supabaseAdmin).
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
