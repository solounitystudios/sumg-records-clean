# Proposed migrations — NOT applied, NOT auto-picked-up

Files in this directory are **proposals**, produced by the Catalog Command Center
Foundation pass (`docs/SUMG_CATALOG_PERSISTENCE_AUDIT.md`). They are deliberately
kept out of `supabase/migrations/` so `supabase db push` and CI cannot apply them
by accident.

**A0 and A0.1 have since been promoted and applied** (2026-09-09, staged security
migration promotion pass) — see `supabase/migrations/20260909035504_*.sql`,
`20260909035736_*.sql`, and `20260909040002_*.sql`, and
`docs/SUMG_SECURITY_MIGRATION_HARDENING.md` for the verification record. Their
copies in this directory are kept as historical proposal records (each now
carries a note saying so) — do not re-apply them. A1/A2/A3/A4/A5 remain
proposals only.

To promote a slice:

1. Review the SQL and the corresponding section of `SUMG_CATALOG_PERSISTENCE_AUDIT.md`.
2. Copy the file into `supabase/migrations/`, renamed with a proper
   `YYYYMMDDHHMMSS_` timestamp prefix per the existing convention.
3. Apply it the normal way (`supabase db push` or the project's deploy pipeline).

**UPDATE 2026-09-09 (pre-production hardening pass) — the independence claim
below no longer holds for A2.** A2 was revised to add a trigger
(`catalog_rights_records_audit_trg`) that unconditionally writes to A5's
`catalog_audit_log` on every rights-record insert/update, replacing a weaker
"application code should remember to audit this" convention with a real
DB-enforced guarantee. Postgres does not statically validate table
references inside a function body, so A2's DDL (`CREATE TABLE`/`FUNCTION`/
`TRIGGER`) will still succeed even if A5 hasn't been applied yet — but every
write to `catalog_rights_records` will fail at runtime
(`relation "catalog_audit_log" does not exist`) until A5 also exists.
**Practical order requirement: apply A5 before or together with A2, not
after.** This is exactly the kind of schema-revision-introduces-a-dependency
case this pass's own instructions warned not to assume away — see
`docs/SUMG_CATALOG_PRE_PRODUCTION_HARDENING.md`'s migration rehearsal section
for the full account.

**Originally proven DB-level independence (2026-09-09, security-migration-
hardening pass, before the above trigger existed):** grepping every
`REFERENCES` clause in every file showed none of A0, A0.1, A1, A2, A3, A4, A5
had a foreign-key dependency on another proposal file — that FK-level claim
is still true today (A2's trigger is a function-body reference, not an FK);
only the *practical, runtime* independence claim for A2 has changed.

**Two new tables since that audit, both inside A1's file:**
`catalog_verification_jobs` (worker claim/lease bookkeeping) and
`catalog_review_flags` (multi-reason human review flags) — both reference
only tables defined earlier in A1's own file plus `auth.users`, so they don't
change A1's own independence.

**Recommended order:**

`A0_rls_hardening.sql` → `A0_1_append_inbox_log_hardening.sql` →
`A1_work_recording_version_lineage.sql` → `A5_audit_log.sql` →
`A2_rights_policy.sql` (moved after A5 — see the dependency note above) →
(`A3_editorial_routing.sql`, `A4_destinations_receipts.sql` deferred until
the Review Queue / Routing Desk UI is actually being built against real
data — see `docs/SUMG_MANUAL_INTAKE_V1_PLAN.md` §2)

A0 and A0.1 are already applied and verified in production — see
`docs/SUMG_SECURITY_MIGRATION_HARDENING.md`.
