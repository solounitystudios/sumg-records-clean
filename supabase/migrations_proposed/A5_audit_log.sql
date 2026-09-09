-- PROPOSAL — NOT APPLIED. See supabase/migrations_proposed/README.md.
--
-- A5 — Audit Log. Additive only. Deliberately append-only (no UPDATE
-- policy, no DELETE policy) so the log cannot be edited after the fact by
-- any role, including admin, through the normal client.
--
-- REVISED AGAIN 2026-09-09 (pre-production hardening pass) — see
-- docs/SUMG_REVIEW_AUDIT_AND_DELETION.md for the full reasoning.
--
-- NEW action taxonomy (CHECK-constrained, not free text): 21 event types,
-- every one traceable to a real code path or design decision in this pass
-- (no speculative events with no planned writer). See the doc for the exact
-- mapping from each event to the function/trigger/state-transition that
-- emits it.
--
-- NEW actor model, replacing the single nullable `actor` FK: actor_type
-- (human/service/worker/ai/system) + actor_label (always required — for
-- humans, an identity snapshot captured at insert time; for everything
-- else, the service/worker/system identifier). This resolves a real
-- tension discovered while designing it: a naive "human actor_type
-- requires a non-null actor FK, permanently" CHECK constraint would be
-- violated the moment a human user's auth.users row is deleted (actor gets
-- SET NULL via the FK action, which re-validates the row's CHECK
-- constraints and would then fail) — breaking exactly the "audit survives
-- user deletion" requirement it was meant to serve. Fixed by only
-- constraining the SPOOFING direction permanently (a non-human event may
-- never carry a real human UUID) and requiring actor_label unconditionally
-- so the audit trail stays meaningful even after the FK goes null — "who
-- did this" survives as a label; "click through to their live account" does
-- not, which is the correct, achievable guarantee.
--
-- NEW: occurred_at is now bounded by a CHECK (within a small window of the
-- INSERT's actual wall-clock time), not just DEFAULT now() — a DEFAULT can
-- still be overridden by an explicit value in the INSERT statement, so
-- without this bound a caller could backdate or postdate an event. This
-- closes that gap.
--
-- NEW: correlation_id, distinct from the existing job_id — job_id ties an
-- event to one worker job; correlation_id ties a whole causally-related
-- sequence of events (e.g. one intake attempt's create -> upload ->
-- verify -> review chain) together for tracing, per Part 17's explicit ask.

CREATE TABLE IF NOT EXISTS catalog_audit_log (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action              TEXT        NOT NULL CHECK (action IN (
                         'intake_created', 'upload_started', 'upload_completed',
                         'verification_claimed', 'hash_verified', 'verification_passed',
                         'verification_failed', 'hash_mismatch', 'duplicate_detected',
                         'review_requested', 'review_approved', 'review_rejected',
                         'rights_changed', 'lineage_created',
                         'destination_route_requested', 'destination_route_allowed',
                         'destination_route_blocked', 'destination_route_rejected',
                         'source_delete_requested', 'source_delete_approved', 'source_deleted'
                       )),
  object_type         TEXT        NOT NULL,
  object_id           TEXT        NOT NULL,
  previous_state      JSONB,
  new_state           JSONB,
  occurred_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Actor model — see header comment.
  actor_type          TEXT        NOT NULL CHECK (actor_type IN ('human', 'service', 'worker', 'ai', 'system')),
  actor               UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_label         TEXT        NOT NULL,
  job_id              TEXT,
  correlation_id      TEXT,
  reason              TEXT,
  approval            TEXT,
  automation_rule_id  TEXT,
  source               TEXT,
  destination          TEXT,
  -- Anti-spoofing: a non-human event may never carry a real human actor
  -- UUID. (The reverse — a human event permanently requiring a non-null
  -- actor — is NOT enforced here; see header comment for why.)
  CONSTRAINT catalog_audit_log_no_human_spoof CHECK (actor_type = 'human' OR actor IS NULL),
  -- occurred_at must be approximately "now" at insert time — bounds
  -- backdating/postdating even though the column has a mutable default.
  CONSTRAINT catalog_audit_log_occurred_at_sane CHECK (occurred_at BETWEEN now() - interval '5 minutes' AND now() + interval '5 minutes')
);
CREATE INDEX IF NOT EXISTS catalog_audit_log_object_idx
  ON catalog_audit_log (object_type, object_id);
CREATE INDEX IF NOT EXISTS catalog_audit_log_occurred_idx
  ON catalog_audit_log (occurred_at);
CREATE INDEX IF NOT EXISTS catalog_audit_log_correlation_idx
  ON catalog_audit_log (correlation_id) WHERE correlation_id IS NOT NULL;

ALTER TABLE catalog_audit_log ENABLE ROW LEVEL SECURITY;

-- read: any CMS role. write: insert-only, no update/delete policy exists at
-- all — this is the actual immutability guarantee (no policy = no path
-- through the normal client, for any role including admin). In practice
-- most inserts come from server actions using the service-role client
-- (bypasses RLS entirely) or from the catalog_rights_records audit trigger
-- (A2) — this INSERT policy is defense-in-depth for a hypothetical direct
-- client insert attempt, not the primary write path.
CREATE POLICY "cms read catalog_audit_log"   ON catalog_audit_log FOR SELECT USING (is_cms_role());
CREATE POLICY "cms insert catalog_audit_log" ON catalog_audit_log FOR INSERT WITH CHECK (is_cms_role());

-- Reversal: DROP TABLE IF EXISTS catalog_audit_log.
-- Note: dropping this table before A2 would break A2's audit trigger at
-- runtime (not at DDL time — see A2's header comment) — drop A2's trigger/
-- table first if fully reversing both.
