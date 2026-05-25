-- ============================================================
-- UTD TaskHub v2 - External API keys
-- 042_api_keys.sql
-- ============================================================
-- Lets a user generate an API key bound to a single project so an
-- external app can create/read/update tickets and tasks on their
-- behalf. Plaintext token shown once; only SHA-256 hash persisted.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.api_keys (
	id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	key_hash         TEXT NOT NULL UNIQUE,
	key_prefix       TEXT NOT NULL,
	name             TEXT NOT NULL,
	owner_user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
	project_id       UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
	scopes           TEXT[] NOT NULL DEFAULT '{}',
	expires_at       TIMESTAMPTZ,
	last_used_at     TIMESTAMPTZ,
	last_used_ip     TEXT,
	revoked_at       TIMESTAMPTZ,
	created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_owner ON public.api_keys (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_project ON public.api_keys (project_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash_active
	ON public.api_keys (key_hash)
	WHERE revoked_at IS NULL;

-- Provenance on tickets
ALTER TABLE public.tickets
	ADD COLUMN IF NOT EXISTS created_via_api_key_id UUID
		REFERENCES public.api_keys(id) ON DELETE SET NULL,
	ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'web';

-- Provenance on tasks
ALTER TABLE public.tasks
	ADD COLUMN IF NOT EXISTS created_via_api_key_id UUID
		REFERENCES public.api_keys(id) ON DELETE SET NULL,
	ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'web';

-- RLS: owner-only access; server uses service role so policies are
-- mostly informational here, but kept consistent with other tables.
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS api_keys_owner_select ON public.api_keys;
CREATE POLICY api_keys_owner_select
	ON public.api_keys
	FOR SELECT
	USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS api_keys_owner_insert ON public.api_keys;
CREATE POLICY api_keys_owner_insert
	ON public.api_keys
	FOR INSERT
	WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS api_keys_owner_update ON public.api_keys;
CREATE POLICY api_keys_owner_update
	ON public.api_keys
	FOR UPDATE
	USING (owner_user_id = auth.uid())
	WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS api_keys_owner_delete ON public.api_keys;
CREATE POLICY api_keys_owner_delete
	ON public.api_keys
	FOR DELETE
	USING (owner_user_id = auth.uid());
