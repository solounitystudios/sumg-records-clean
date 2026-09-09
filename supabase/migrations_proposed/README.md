# Proposed migrations — NOT applied, NOT auto-picked-up

Files in this directory are **proposals**, produced by the Catalog Command Center
Foundation pass (`docs/SUMG_CATALOG_PERSISTENCE_AUDIT.md`). They are deliberately
kept out of `supabase/migrations/` so `supabase db push` and CI cannot apply them
by accident.

To promote a slice:

1. Review the SQL and the corresponding section of `SUMG_CATALOG_PERSISTENCE_AUDIT.md`.
2. Copy the file into `supabase/migrations/`, renamed with a proper
   `YYYYMMDDHHMMSS_` timestamp prefix per the existing convention.
3. Apply it the normal way (`supabase db push` or the project's deploy pipeline).

**Proven DB-level independence (verified 2026-09-09 by grepping every
`REFERENCES` clause in every file — see `docs/SUMG_SECURITY_MIGRATION_HARDENING.md`
§14):** none of A0, A0.1, A1, A2, A3, A4, A5 has a foreign-key dependency on
another proposal file. A2's `subject_type`/`subject_id` is a loose
polymorphic reference, not an FK to A1's `catalog_works` — so A2 could
technically be applied without A1 ever existing. Every `REFERENCES` clause
across all seven files points either at an already-live table
(`songs`, `documents`, `contracts`, `auth.users`) or at a table defined
within the *same* file. All seven are independently applicable, in any order,
at the database level.

**Recommended order anyway** — not for FK reasons, but because the intake
workflow this schema supports (`docs/SUMG_MANUAL_INTAKE_V1_PLAN.md`) needs
several of them to exist together to do anything useful:

`A0_rls_hardening.sql` → `A0_1_append_inbox_log_hardening.sql` →
`A1_work_recording_version_lineage.sql` → `A2_rights_policy.sql` →
`A5_audit_log.sql` → (`A3_editorial_routing.sql`, `A4_destinations_receipts.sql`
deferred until the Review Queue / Routing Desk UI is actually being built
against real data — see the manual intake plan §2)

A0 and A0.1 are the highest-priority, lowest-risk slices (pure policy/grant
changes on tables that already exist, zero new tables) and should ship first
regardless of when the catalog persistence slices land.
