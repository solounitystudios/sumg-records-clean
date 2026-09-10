# Proposed migrations — staging area, NOT auto-picked-up

Files in this directory are **proposals**, produced by the Catalog Command Center
Foundation pass (`docs/SUMG_CATALOG_PERSISTENCE_AUDIT.md`). They are deliberately
kept out of `supabase/migrations/` so `supabase db push` and CI cannot apply them
by accident. **As of 2026-09-10, only A3 and A4 remain unapplied** — A0, A0.1, A5,
A2, and A1 (plus a new MasterVault storage migration derived from the A1 pass) have
all been promoted into `supabase/migrations/` and applied to production. The state
vocabulary used below is precise and the states are not interchangeable:

| Term | Meaning |
|---|---|
| CODE-COMPLETE | the SQL / adapter code exists and is reviewed |
| MIGRATION-APPLIED | the migration is in the production migration ledger |
| STRUCTURALLY VERIFIED | tables / RLS / policies / triggers / constraints confirmed present by a read-only query — **no data written** |
| PRODUCTION-PROVEN | an end-to-end run wrote and read back real data through the applied schema |

**A0 and A0.1 — MIGRATION-APPLIED + PRODUCTION-PROVEN** (2026-09-09, staged security
migration promotion pass) — see `supabase/migrations/20260909035504_*.sql`,
`20260909035736_*.sql`, and `20260909040002_*.sql`, and
`docs/SUMG_SECURITY_MIGRATION_HARDENING.md` for the verification record. Their
copies in this directory are kept as historical proposal records (each now
carries a note saying so) — do not re-apply them.

**A5 and A2 — MIGRATION-APPLIED + PRODUCTION-PROVEN** (2026-09-09) — promoted as
SUMG-CAT-P0-001, then the rights audit-trigger actor semantics were corrected by
SUMG-CAT-P0-002. Production migration ledger: `20260909153314` `catalog_audit_log`
(A5), `20260909153452` `catalog_rights_policy` (A2), `20260909233528`
`catalog_rights_audit_actor_fix` (P0-002). Repo files:
`supabase/migrations/20260909100001_catalog_audit_log.sql`,
`20260909100002_catalog_rights_policy.sql`, `20260909160000_catalog_rights_audit_actor_fix.sql`.
Their proposal copies in this directory are historical records — do not re-apply.

**A1 and the new MasterVault storage migration — MIGRATION-APPLIED + STRUCTURALLY
VERIFIED, NOT YET PRODUCTION-PROVEN** (2026-09-10, SUMG-CAT-P0-003). Production
migration ledger: `20260910012021` `catalog_a1_work_recording_version_lineage`,
`20260910012109` `catalog_master_vault_storage`. Repo files:
`supabase/migrations/20260909180000_catalog_a1_work_recording_version_lineage.sql`
(this is the **fixed** version — the `A1_work_recording_version_lineage.sql` copy in
this directory is the pre-fix proposal, kept as a historical record) and
`20260909180100_catalog_master_vault_storage.sql` (a new migration with no proposal
copy here — it was derived during the P0-003 pass). Structurally verified read-only:
all six A1 tables exist with RLS enabled; the required P0-003 triggers and CHECK
constraints are present; `sumg-master-vault` exists, `public=false`,
`file_size_limit=262144000` (250 MB), 8-entry audio MIME allowlist, exactly two
`storage.objects` policies (`master vault cms read`, `master vault cms write`), no
update/delete policy. **There are zero catalog asset rows and zero vault objects** —
the founder-authorized end-to-end proof with one real master file
(`docs/SUMG_CAT_P0_003_MASTERVAULT_A1.md` §8) has **not** been executed. Do not
re-apply either migration.

> **Note on ledger timestamps vs. filenames:** these migrations were applied via
> targeted `apply_migration`, which stamps its own apply-time version — so the
> ledger version (e.g. `20260910012021`) differs from the file's authored-time
> prefix (e.g. `20260909180000`). This is expected and matches how A0/A0.1/A5/A2/
> P0-002 were applied.

**A3 and A4 remain proposals only** — not applied, deferred by design until the
Review Queue / Routing Desk UI is being built against real data.

To promote a slice (applies to A3 / A4 — everything else is already promoted and applied):

1. Review the SQL and the corresponding section of `SUMG_CATALOG_PERSISTENCE_AUDIT.md`.
2. Copy the file into `supabase/migrations/`, renamed with a proper
   `YYYYMMDDHHMMSS_` timestamp prefix per the existing convention.
3. Apply it via targeted `apply_migration` (the A5/A2/P0-002/P0-003 method), not a
   broad `supabase db push`.

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

**Recommended order (historical — steps through A2 are done):**

`A0_rls_hardening.sql` → `A0_1_append_inbox_log_hardening.sql` →
`A1_work_recording_version_lineage.sql` → `A5_audit_log.sql` →
`A2_rights_policy.sql` (moved after A5 — see the dependency note above) →
(`A3_editorial_routing.sql`, `A4_destinations_receipts.sql` deferred until
the Review Queue / Routing Desk UI is actually being built against real
data — see `docs/SUMG_MANUAL_INTAKE_V1_PLAN.md` §2)

As of 2026-09-10 the order above has been followed through A2: A0, A0.1, A5, A2
are applied and PRODUCTION-PROVEN; A1 (plus the MasterVault storage migration) is
applied and STRUCTURALLY VERIFIED but NOT YET PRODUCTION-PROVEN. A5 was applied
before A2, satisfying the runtime-dependency requirement in the note above. Only
A3 → A4 remain. See `docs/SUMG_SECURITY_MIGRATION_HARDENING.md` and
`docs/SUMG_CAT_P0_003_MASTERVAULT_A1.md` for the verification records.
