-- 033_ticket_code_rpc.sql
-- Atomic ticket_code allocation + insert.
-- Prevents the TOCTOU race in which two concurrent createTicket calls
-- compute the same MAX+1 and collide on tickets_project_code_unique.
--
-- Strategy:
--   * pg_advisory_xact_lock keyed by project_id serializes code allocation
--     per project. Lock auto-releases at txn end.
--   * MAX(seq) is computed inside the same txn that performs the INSERT,
--     so no other writer can observe the gap between read and write.
--   * The unique constraint remains as a safety net.

DROP FUNCTION IF EXISTS public.next_ticket_code(uuid);
DROP FUNCTION IF EXISTS public.create_ticket_atomic(uuid, text, text, text, text, text, uuid, timestamptz, uuid, text);

CREATE OR REPLACE FUNCTION public.next_ticket_code(p_project_id uuid)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_key text;
  v_max int;
  v_pattern text;
BEGIN
  SELECT key INTO v_key
  FROM public.projects
  WHERE id = p_project_id;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Project key is missing for project %', p_project_id;
  END IF;

  v_pattern := '^' || v_key || '-[0-9]+$';

  SELECT COALESCE(MAX(
    (regexp_replace(ticket_code, '^' || v_key || '-', ''))::int
  ), 0)
  INTO v_max
  FROM public.tickets
  WHERE project_id = p_project_id
    AND ticket_code ~ v_pattern;

  RETURN v_key || '-' || lpad((v_max + 1)::text, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.create_ticket_atomic(
  p_project_id   uuid,
  p_title        text,
  p_description  text,
  p_type         text,
  p_status       text,
  p_priority     text,
  p_assigned_to  uuid,
  p_due_date     timestamptz,
  p_created_by   uuid,
  p_ticket_code  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lock_key bigint;
  v_code     text;
  v_id       uuid;
BEGIN
  -- Serialize ticket_code allocation per project.
  v_lock_key := hashtextextended('ticket_code:' || p_project_id::text, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);

  IF p_ticket_code IS NOT NULL AND length(btrim(p_ticket_code)) > 0 THEN
    v_code := upper(btrim(p_ticket_code));
  ELSE
    v_code := public.next_ticket_code(p_project_id);
  END IF;

  INSERT INTO public.tickets (
    project_id,
    ticket_code,
    title,
    description,
    type,
    status,
    priority,
    assigned_to,
    due_date,
    created_by
  ) VALUES (
    p_project_id,
    v_code,
    p_title,
    p_description,
    p_type,
    p_status,
    p_priority,
    p_assigned_to,
    p_due_date,
    p_created_by
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.next_ticket_code(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_ticket_atomic(
  uuid, text, text, text, text, text, uuid, timestamptz, uuid, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.next_ticket_code(uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_ticket_atomic(
  uuid, text, text, text, text, text, uuid, timestamptz, uuid, text
) TO authenticated, service_role;
