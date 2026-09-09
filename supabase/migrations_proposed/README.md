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

Slices are independently applicable, in this order:

`A0_rls_hardening.sql` → `A1_work_recording_version_lineage.sql` →
`A2_rights_policy.sql` → `A3_editorial_routing.sql` →
`A4_destinations_receipts.sql` → `A5_audit_log.sql`

`A0` has no dependency on the others and may ship alone.
