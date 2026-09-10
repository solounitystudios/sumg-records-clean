-- SUMG-SEC-P0-005 — YouTube OAuth State Integrity
--
-- ADDITIVE / FORWARD-ONLY. Creates one new table (public.yt_oauth_states) and
-- one new SECURITY DEFINER function (public.consume_yt_oauth_state). Touches no
-- existing table, no existing policy, no existing function. Does NOT modify
-- yt_channels, yt_upload_jobs, the cron path, RBAC, or any catalog / master-
-- vault object.
--
-- WHY --------------------------------------------------------------------------
-- Before this migration the YouTube OAuth `state` parameter was the plaintext
-- yt_channels.id (a predictable UUID) and the callback did no authentication,
-- no user binding, no expiry, and no single-use check. Anyone reaching
--   /api/youtube/oauth/callback?state=<channel uuid>&code=<their google code>
-- could bind arbitrary Google credentials to that channel.
--
-- AFTER ----------------------------------------------------------------------
--   * `state` is a 256-bit CSPRNG token; only SHA-256(state) is stored here.
--   * every state row is bound to the initiating auth.users id and to the
--     intended yt_channels id.
--   * every state row expires (10 minutes) and is single-use (consumed_at).
--   * consumption is one atomic UPDATE ... RETURNING (see function below).
--
-- ACCESS MODEL --------------------------------------------------------------
--   RLS is ENABLED and there are DELIBERATELY NO POLICIES on this table. With
--   RLS on and zero policies, anon and every authenticated (CMS) session are
--   default-denied for SELECT/INSERT/UPDATE/DELETE — there is no client path to
--   read a hash, forge a row, or clear consumed_at. The entire lifecycle runs
--   server-side through the service-role client (which bypasses RLS) plus the
--   consume_yt_oauth_state function, whose EXECUTE grant is service_role only.
--
-- NOT APPLIED TO PRODUCTION BY THIS PR.

-- ── Table ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.yt_oauth_states (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- SHA-256 hex of the plaintext state token. There is intentionally NO
  -- plaintext state column — the plaintext lives only in the Google auth URL.
  state_hash   TEXT        NOT NULL UNIQUE,
  -- Intended YouTube channel. CASCADE: a deleted channel cannot leave a
  -- danglingly-consumable state row.
  channel_id   UUID        NOT NULL REFERENCES public.yt_channels(id) ON DELETE CASCADE,
  -- The authenticated admin who started the flow. The callback requires the
  -- current session user to equal this value.
  initiated_by UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Finite lifetime. Enforced (not merely defaulted) by the callers + the
  -- expires_at > now() clause in consume_yt_oauth_state.
  expires_at   TIMESTAMPTZ NOT NULL,
  -- NULL until the state is consumed exactly once.
  consumed_at  TIMESTAMPTZ,
  CONSTRAINT yt_oauth_states_expiry_after_creation CHECK (expires_at > created_at)
);

COMMENT ON TABLE public.yt_oauth_states IS
  'SUMG-SEC-P0-005: single-use, user-bound, channel-bound, expiring YouTube OAuth state. Stores SHA-256(state) only. Server/service-role lifecycle only (RLS on, no policies).';

CREATE INDEX IF NOT EXISTS yt_oauth_states_channel_idx ON public.yt_oauth_states (channel_id);
CREATE INDEX IF NOT EXISTS yt_oauth_states_expiry_idx  ON public.yt_oauth_states (expires_at);

ALTER TABLE public.yt_oauth_states ENABLE ROW LEVEL SECURITY;

-- NO CREATE POLICY statements. This is intentional — see ACCESS MODEL above.

-- ── Atomic single-use consumption ───────────────────────────────────────────
-- One statement. `state_hash` is UNIQUE so this locks at most one row. Under
-- READ COMMITTED, a second concurrent call blocks on that row's write lock,
-- then re-checks its WHERE against the updated row: `consumed_at IS NULL` is
-- now false, it matches zero rows, and returns NULL. Exactly one caller ever
-- receives a channel_id.
--
-- Hardening: `SET search_path = ''` (empty) — the function cannot be tricked by
-- a session-level search_path change. Every object reference is therefore
-- fully schema-qualified: `public.yt_oauth_states`, `pg_catalog.now()`.
CREATE OR REPLACE FUNCTION public.consume_yt_oauth_state(
  p_state_hash   TEXT,
  p_initiated_by UUID
) RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.yt_oauth_states
     SET consumed_at = pg_catalog.now()
   WHERE state_hash   = p_state_hash
     AND initiated_by = p_initiated_by
     AND consumed_at IS NULL
     AND expires_at  > pg_catalog.now()
  RETURNING channel_id;
$$;

COMMENT ON FUNCTION public.consume_yt_oauth_state(text, uuid) IS
  'SUMG-SEC-P0-005: atomically consume a YouTube OAuth state bound to (hash, user) if unconsumed and unexpired; returns the bound channel_id or NULL. service_role EXECUTE only.';

-- Lock down EXECUTE: PostgreSQL grants EXECUTE to PUBLIC on every new function
-- by default (see the append_inbox_log A0.1 findings) — revoke that first,
-- then grant only service_role.
REVOKE EXECUTE ON FUNCTION public.consume_yt_oauth_state(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.consume_yt_oauth_state(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.consume_yt_oauth_state(text, uuid) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.consume_yt_oauth_state(text, uuid) TO service_role;

-- ── Reversal (manual down-path) ─────────────────────────────────────────────
--   DROP FUNCTION IF EXISTS public.consume_yt_oauth_state(text, uuid);
--   DROP TABLE    IF EXISTS public.yt_oauth_states;
-- Safe to drop: no other object references either. Existing yt_channels OAuth
-- credentials are independent of this table and are untouched by a reversal.
