# SUMG Catalog Persistence Audit

**Status:** Documentation + migration *proposals* only, from repo state on branch `feat/catalog-command-center-foundation` (base `main` @ `2affc03`). Nothing in this document has been applied to any database — no migration in `supabase/migrations_proposed/` has been run against any Supabase project, local or hosted, in this pass. Proposed SQL lives under `supabase/migrations_proposed/` — a directory deliberately outside `supabase/migrations/` so `supabase db push` / CI cannot pick it up by accident. Promoting a slice requires a human to review it, move it into `supabase/migrations/` with a proper timestamp prefix, and apply it explicitly.

See `SUMG_CATALOG_REUSE_AUDIT.md` for the reasoning behind each "new table" decision — this document is the schema-level detail.

---

## 1. Existing tables this pass reuses without modification

`songs`, `releases`, `artists`, `producers`, `brands`, `assets`, `audio_inbox`, `contracts`, `contributors`, `publishing_works`, `documents`, `import_batches`. No `ALTER TABLE` proposed against any of these.

## 2. New tables proposed (additive only, all `CREATE TABLE IF NOT EXISTS`)

Every new table below carries a nullable pointer back to the existing row it augments (`song_id`, `release_id`) so nothing forces a backfill and the existing `songs`/`releases` rows keep working unmodified — per Part 12, "existing Songs/Releases must keep working."

### Slice A1 — Work / Recording / Version / Lineage

```
catalog_works              — canonical work identity. Optional link to songs.id (nullable, ON DELETE SET NULL) for the current 1:1 song≈work case; future works may have zero linked songs (unreleased) or evolve to many recordings.
catalog_recordings         — a recording of a work (work_id FK). Distinct recordings = distinct performances/masters lineage roots, not just file variants.
catalog_asset_versions     — a specific version/variant of a recording (recording_id FK): version_kind (master | clean | explicit | instrumental | acapella | radio_edit | stem_set | other), vault_object_ref (opaque pointer into the Private Master Vault — never a public URL), sha256, is_primary.
catalog_asset_lineage      — derivation edges (asset_version_id → parent_asset_version_id, derivation_type). No cycles (enforced in lib/catalog/lineage.ts, not at the DB level this pass — a DB-level check would need a recursive CTE constraint or trigger, deferred).
```

### Slice A2 — Rights / Policy

```
catalog_rights_records     — subject_type ('work'|'recording'|'song'), subject_id, status (unknown|under_review|cleared|restricted|denied|expired), owner_entity, territory, evidence_document_id (FK → documents.id, nullable), contract_id (FK → contracts.id, nullable), permissions (jsonb: distribution/sync/personaworks/ai_training booleans), set_by, set_at.
catalog_policy_flags       — subject_type, subject_id, flag (DO_NOT_RELEASE | DO_NOT_PROGRAM | DO_NOT_DISTRIBUTE | DO_NOT_SYNC | DO_NOT_TRAIN_AI | DO_NOT_PUBLISH | DO_NOT_DELETE | PRIVATE_PERSONAL | RIGHTS_HOLD), reason, set_by, set_at.
```

### Slice A3 — Editorial / Routing

```
catalog_editorial_decisions — subject_type, subject_id, decision_type, value (jsonb), decided_by, decided_at, provenance fields (source/authority/confidence — mirrors lib/catalog/provenance.ts shape).
catalog_routing_recipes     — name, description, rules (jsonb), created_by. Recipes are read/evaluated by lib/catalog/routing.ts and always produce a *proposal*, never a direct write.
catalog_routing_decisions   — subject_type, subject_id, recipe_id (nullable — manual routing has none), proposed_assignment (jsonb), status (proposed|approved|rejected), decided_by, decided_at.
```

### Slice A4 — Destinations / Receipts

```
catalog_destination_assignments — subject_type, subject_id, destination (sumg_public|sumg_artist_catalog|sumg_project|personaworks|distribution|sync|social|archive), status (requested|approved|rejected|blocked|delivered), approved_by, approved_at, version, destination_asset_id, failure_reason, policy_reason.
catalog_delivery_receipts       — assignment_id FK, delivered_at, receipt (jsonb), checksum.
```

### Slice A5 — Audit Log

```
catalog_audit_log — actor, action, object_type, object_id, previous_state (jsonb), new_state (jsonb), occurred_at, job_id, reason, approval, automation_rule_id, source, destination.
```

### Slice A0 — RLS hardening (proposed, not applied — see security audit §5)

```
Close the four open (`USING(true)`) policies documented in SUMG_CATALOG_SECURITY_AUDIT.md §2:
dna_records (read+write), import_logs (read), the artist_spotify_snapshots/apple_metrics_daily analytics-snapshot tables (read).
Replace with is_cms_role()-gated policies matching the existing pattern used everywhere else.
```

All six slices are in `supabase/migrations_proposed/`, independently applicable in order A0 → A1 → A2 → A3 → A4 → A5 (A0 has no dependency on the others and can ship alone or first).

## 3. Avoided duplicate tables

No new `assets`-like table, no new intake/queue table, no new import/conflict table, no new contract/contributor table, no new role/RBAC table. See reuse audit §9.

## 4. Master Vault mapping onto existing storage

Current storage: one Supabase Storage bucket, `sumg-assets`, public-read, backing the `assets` table (confirmed via `create policy "public read assets" ... using (true)` — `lib/supabase/schema.sql:200`). This is correct for public media and is not touched.

Proposed Private Master Vault (`lib/catalog/vault.ts` interface, this pass — no bucket created, no storage mutation):
- A **separate, private-by-default bucket** (name TBD at implementation time, e.g. `sumg-vault`) with no public-read policy — signed URLs only, generated server-side.
- `catalog_asset_versions.vault_object_ref` stores an opaque object key, never a public URL.
- SHA-256 required on every vault write (`putOriginal`/`putDerivative` in the interface); `verifyObject()` re-hashes on demand.
- No storage credentials reach the client — same posture as today's service-role-only write path, just pointed at a private bucket instead of `sumg-assets`.

This pass ships the **interface and its tests only** (`lib/catalog/vault.ts`) — no bucket is created, no object is written, per Part 33's "no production storage mutation."

## 5. Migration slice ordering and reversibility

Each slice is additive-only (`CREATE TABLE IF NOT EXISTS`, no `ALTER` on existing tables except A0's policy changes, which are `DROP POLICY IF EXISTS` + `CREATE POLICY`, both reversible). Applying zero, some, or all slices leaves `songs`/`releases`/existing admin pages fully functional — nothing in this pass makes any new table's existence a dependency of existing code. Reversibility: `DROP TABLE IF EXISTS <name>` for any slice, in reverse dependency order (A5 → A4 → A3 → A2 → A1 → A0).

## 6. Migrations created vs. applied

**Created:** 6 proposal files under `supabase/migrations_proposed/` (A0–A5). **Applied:** none. No `supabase db push`, no direct SQL execution against any project, was run in this pass.
