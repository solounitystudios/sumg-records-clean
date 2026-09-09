-- A0.1 — append_inbox_log hardening. Split out from A0 because its
-- remediation shape (function GRANT/REVOKE) is different from A0's
-- (CREATE POLICY on a table). Independent of A0/A1/A2/A5.
--
-- CURRENT LIVE STATE (confirmed via pg_proc + has_function_privilege() on
-- 2026-09-09, re-confirmed immediately before promotion): public.
--   append_inbox_log(p_id text, p_entry jsonb) is SECURITY DEFINER, owned by
--   `postgres`, no search_path pinned, body is an unconditional `UPDATE
--   audio_inbox SET action_log = ... WHERE id = p_id` with no internal
--   auth/role check. EXECUTE granted to anon, authenticated, postgres, and
--   service_role. audio_inbox's own table-level RLS policy
--   (admin_all_audio_inbox, is_cms_role()) is correct — this function was a
--   complete bypass of it.
--
-- INTENDED CALLER, TRACED: app/actions/audioInbox.ts:173 is the only call
--   site in the repo, using the service-role client — confirmed by reading
--   the import statement. That grant is untouched by this migration.
--
-- CHOSEN: REVOKE EXECUTE FROM anon/authenticated, keep service_role/postgres
--   — smallest possible change, zero app-code change required.
--
-- EXPECTED AFTER STATE: only service_role/postgres can call
--   append_inbox_log; anon/authenticated get a permission-denied error.
-- ROLLBACK: GRANT EXECUTE ON FUNCTION public.append_inbox_log(text, jsonb)
--   TO anon, authenticated; (re-opens the bypass — emergency only.)
-- DEPENDENCY / BLAST RADIUS: single call site in the entire repo, already
--   using service_role. Zero legitimate functionality depends on
--   anon/authenticated EXECUTE.
--
-- Promoted from supabase/migrations_proposed/A0_1_append_inbox_log_hardening.sql,
-- copied verbatim after a fresh live pre-flight query confirmed zero drift.

REVOKE EXECUTE ON FUNCTION public.append_inbox_log(text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.append_inbox_log(text, jsonb) FROM authenticated;

-- Secondary fix, same function, same Advisor finding category
-- (function_search_path_mutable): pin search_path so the function can't be
-- tricked by a session-level search_path change. Zero behavior change for
-- the legitimate caller.
ALTER FUNCTION public.append_inbox_log(text, jsonb) SET search_path = public;
