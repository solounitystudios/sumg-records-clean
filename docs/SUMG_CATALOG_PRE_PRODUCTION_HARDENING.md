# SUMG Catalog Pre-Production Hardening Report

**Status:** Design/schema/test pass, 2026-09-09. No migration applied. A1/A2/A5 remain in `supabase/migrations_proposed/` — the actual field-level detail for every decision below lives in those files' own comments and in `lib/catalog/*.ts`'s own comments; this doc is the cross-cutting narrative, not a duplicate of them. Companion docs: `SUMG_MANUAL_INTAKE_STATE_MACHINE.md`, `SUMG_MASTER_VAULT_SECURITY_CONTRACT.md`, `SUMG_RIGHTS_AND_ROUTING_MODEL.md`, `SUMG_REVIEW_AUDIT_AND_DELETION.md`, `SUMG_API_OBSERVABILITY_AND_DATA_CLASSIFICATION.md`.

---

## 1. Live pre-production baseline

Fresh queries against `yisxnwbsnzxjnmzpstzj`, 2026-09-09 — identical to every prior pass, zero drift:

| | |
|---|---|
| Real row counts | `songs`=32, `releases`=32, `artists`=9, `assets`=25, `dna_records`=9, `import_logs`=5, `audio_inbox`=0, `artist_spotify_snapshots`=0 |
| Migration ledger | 4 new migrations only (A0, A0.1×2, Spotify SELECT hardening) — identical to the last verified state |
| `catalog_%` tables | 0 |
| `auth.users.id` | `uuid`, `NOT NULL` — confirmed suitable as the FK target every revised table now uses |
| Schema drift | none |
| Unexpected objects | none new |
| Concerns | none blocking |

## 2. Architectural finding that reshaped several later parts: no tenancy model

This pass's brief repeatedly assumed a multi-tenant "owner_user_id" / cross-owner-isolation model (Parts 3, 10, 25 all ask for "cross-owner" tests). That does not describe this product. SUMG Records is a single label with one shared, CMS-role-gated catalog — every one of the 53 production tables is gated by `is_cms_role()`, never by row-level ownership. `created_by`/`uploaded_by` are **provenance** (who did this), not an access-control boundary. There is no owner boundary to cross, so there's no "cross-owner" RLS case to design for. This is documented explicitly here rather than force-fitting a tenancy model the product doesn't have — see each affected doc for how this reframes the specific "cross-owner" asks.

## 3. A1 relational model — challenged, summary (full field-by-field detail in the file's own header comment)

`supabase/migrations_proposed/A1_work_recording_version_lineage.sql`, revised again:

- **Work**: identity = server UUID; "owner" reframed as provenance (`created_by`), not access control (§2); relationship to `songs` stays a nullable bridge; deletion is `ON DELETE CASCADE` down to `Recording`; a Work is never hard-deleted by this design, only `status='archived'`; risk of duplicate logical Works (two Work rows for the same real composition) is **not** structurally prevented — flagged as an open risk, mitigated only by the Review Queue surfacing it as a human decision, since "is this the same song" has no reliable automatic test at V1's scale.
- **Recording**: relationship to Work is 1-to-many, always was; `work_id` is now immutable after creation (trigger) — closes "asset silently reassigned to an unrelated Work" structurally, not by convention; `artist_slug` stays loose text (§2 of `SUMG_RIGHTS_AND_ROUTING_MODEL.md`... actually see the SQL file's own comment); no "primary recording" concept exists at this level (only asset *versions* have `is_primary`) — a Work with multiple Recordings has no automatic "which one is current" answer, which is fine because V1 never creates more than one Recording per Work.
- **Asset Version**: relationship to Recording is now immutable (`recording_id`, trigger); `client_sha256`/`verified_sha256` split (§ full detail in `SUMG_MANUAL_INTAKE_STATE_MACHINE.md`); `upload_status`/`review_status` stay separate; `is_primary` is now DB-enforced unique per recording (partial unique index); mutable fields: `upload_status`, `review_status`, `verified_sha256`, `technical_metadata`, `is_primary`, `updated_at`; immutable fields: `recording_id` (trigger-enforced), `id`, `uploaded_by`, `client_sha256` (nothing in this design ever updates it — a resubmitted hash would be a new row, not a mutation), `idempotency_key`.
- **Lineage**: parent-child is version-to-version only (both sides FK to `catalog_asset_versions`); self-reference blocked by CHECK; multi-hop cycles blocked at the application layer (`lib/catalog/lineage.ts::addLineageEdge`), classified LOW risk at V1 scale since lineage is only ever written through that one function, never raw SQL; cross-recording lineage is **allowed** (a derivative can legitimately come from a different recording — e.g. an instrumental stem pulled from one recording feeding a remix registered under another) — not blocked, and correctly so; cross-owner lineage is moot (§2); a version now has at most one parent edge (new unique index — the prior revision left this ambiguous).

## 4. Catalog graph integrity — invariants proven

| Concern | Proof |
|---|---|
| Recording reassigned to a different Work | Structurally impossible — `catalog_recordings_work_id_immutable_trg` raises on any `UPDATE ... SET work_id = ...` |
| Asset Version reassigned to a different Recording | Structurally impossible — same pattern, `catalog_asset_versions_recording_id_immutable_trg` |
| Lineage self-loop | `CHECK (parent_asset_version_id IS DISTINCT FROM asset_version_id)` |
| Lineage cycle (A→B→A, longer) | App-level only (`lib/catalog/lineage.ts`), tested in `lineage.test.ts`; DB-level cycle prevention deferred — Postgres has no native DAG constraint short of a recursive trigger walking the full ancestor chain on every insert, judged not worth the write-amplification cost at V1's scale (lineage only ever written through the one function) |
| Duplicate primary recordings/versions | `catalog_asset_versions_one_primary_per_recording` partial unique index — DB-enforced, not app-code discipline |
| Duplicate version numbers | Not applicable — versions are identified by UUID, not a sequence number; `is_primary` is the only "which one is current" concept and is now unique-constrained |
| Deleted parent leaving invalid lineage | `parent_asset_version_id` is `ON DELETE SET NULL` — a child survives as a legitimate orphaned root, not an invalid state; the child row itself is `ON DELETE CASCADE` from its own asset_version, so a deleted version's lineage edges disappear with it |
| Asset linked to unrelated Work | Structurally impossible — see immutability triggers above; the only path from an asset version to a Work is the fixed `asset_version → recording → work` chain |
| Same physical object referenced as two masters unexpectedly | Covered by the duplicate-hash model — see `SUMG_MANUAL_INTAKE_STATE_MACHINE.md` §SHA-256 contract |
| Cross-owner anything | Moot — §2 |

## 5. Migration rehearsal — revised order, exact pre-flight/verification

**Order challenged and changed:** A1 → A2 → A5 no longer holds. A2's new rights-audit trigger (`SUMG_RIGHTS_AND_ROUTING_MODEL.md`) writes to A5's `catalog_audit_log` — Postgres doesn't statically validate that reference at `CREATE FUNCTION` time, so A2's DDL would still succeed applied before A5, but every write to `catalog_rights_records` would fail at runtime until A5 also exists. **Revised order: A1 → A5 → A2** (A3/A4 still deferred). See `supabase/migrations_proposed/README.md` for the full account — this is a genuine instance of exactly the "don't assume the order stays correct if a revision introduces a dependency" risk this pass was asked to check for.

For each of A1, A5, A2 (in the corrected order):

### A1
- **PRE-FLIGHT SQL:** `SELECT count(*) FROM information_schema.tables WHERE table_name LIKE 'catalog_%';` — expect 0.
- **OBJECTS CREATED:** 6 tables (`catalog_works`, `catalog_recordings`, `catalog_asset_versions`, `catalog_asset_lineage`, `catalog_verification_jobs`, `catalog_review_flags`).
- **OBJECTS ALTERED:** 0 existing tables.
- **INDEXES:** 12 explicit + 6 PK implicit.
- **FKs:** to `songs`, `auth.users` (existing, live); internal to the 6 new tables.
- **CHECKs:** version_kind/upload_status/review_status/subject_type/reason_code/severity/status enums; lineage no-self-parent; review-flag resolved-at-consistency.
- **RLS:** 6 policies, `is_cms_role()`, no public policy on any of them.
- **TRIGGERS/FUNCTIONS:** 2 immutability triggers (`work_id`, `recording_id`).
- **ROWS MODIFIED:** 0.
- **BACKFILL:** none, by design — no existing `songs` row is touched.
- **LOCK RISK:** the two FKs to already-live tables (`songs`, `auth.users`) briefly validate against those tables on creation — negligible at current row counts, but real; avoid running during a bulk `songs` write, out of caution.
- **ROLLBACK:** `DROP TABLE IF EXISTS` in reverse dependency order (documented in the file); zero real data destroyed since nothing writes to these tables yet.
- **POST-APPLY VERIFICATION:** table existence, column types (`created_by`/`uploaded_by` are `uuid` not `text`), zero rows, FK validity (`pg_constraint.convalidated = true`), trigger existence.
- **STOP CONDITIONS:** any of the above checks fail; `songs`/`releases` row counts change unexpectedly (would indicate this migration somehow touched them, which nothing in it should).

### A5 (moved ahead of A2)
- **PRE-FLIGHT SQL:** `SELECT count(*) FROM information_schema.tables WHERE table_name = 'catalog_audit_log';` — expect 0.
- **OBJECTS CREATED:** 1 table.
- **INDEXES:** 3 explicit + 1 PK.
- **FKs:** `auth.users` only.
- **CHECKs:** 21-value action taxonomy, actor_type enum, anti-spoof, occurred_at sanity window.
- **RLS:** 2 policies (SELECT + INSERT only — no UPDATE/DELETE policy at all, the actual immutability mechanism).
- **ROWS MODIFIED:** 0.
- **ROLLBACK:** `DROP TABLE IF EXISTS catalog_audit_log` — but see A2's own note: do this only after reversing A2's trigger, or A2 breaks at runtime.
- **POST-APPLY VERIFICATION:** table existence, exactly 2 policies (confirm no UPDATE/DELETE policy was accidentally added), CHECK constraint list matches the 21-action taxonomy.
- **STOP CONDITIONS:** more than 2 policies exist; any UPDATE or DELETE policy exists.

### A2 (now applied after A5)
- **PRE-FLIGHT SQL:** confirm A5 exists (`SELECT to_regclass('public.catalog_audit_log');` — must not be null) before applying, given the new runtime dependency.
- **OBJECTS CREATED:** 2 tables (`catalog_rights_records`, `catalog_policy_flags`), 1 trigger function + trigger.
- **INDEXES:** 2 explicit + 2 PK + 2 backing UNIQUE constraints.
- **CHECKs:** status/set_by_source enums, AI-cannot-clear, permissions-shape (new this pass).
- **RLS:** 2 policies.
- **TRIGGERS/FUNCTIONS:** `catalog_rights_records_audit_trg` — fires on every insert/update, writes to `catalog_audit_log`.
- **ROWS MODIFIED:** 0.
- **ROLLBACK:** drop trigger + function first, then tables (order matters here, unlike A1/A5).
- **POST-APPLY VERIFICATION:** insert a rights record in a rolled-back test transaction (`BEGIN; INSERT ...; SELECT * FROM catalog_audit_log WHERE object_id = ...; ROLLBACK;`) to confirm the trigger actually fires — this is the one migration in this batch where DDL succeeding is not sufficient proof of correctness, since the trigger's real dependency (A5 existing) is a runtime fact, not a DDL-time one.
- **STOP CONDITIONS:** the test-transaction insert doesn't produce an audit row; A5 doesn't exist yet.

## 6. Failure-mode table

| FAILURE | DETECTION | STATE | AUTO RETRY | HUMAN ACTION | AUDIT EVENT | DATA LOSS RISK | SAFE DEFAULT |
|---|---|---|---|---|---|---|---|
| DB row created, upload never happened | Reconciliation: `upload_status='pending_upload'` older than a threshold | stays `pending_upload` | no (client must retry with same or new idempotency key) | review/archive stale intake | `intake_created` only, nothing further | none — no object exists | leave row inert, surface in reconciliation report |
| Upload succeeded, finalize/confirm never called | Reconciliation: object exists in vault (if checkable), row still `pending_upload` | orphan object | no | manual reconciliation | none recorded yet | low — object exists, just unlinked | never auto-delete the object |
| Verification worker crashed mid-job | Lease expiry (`lease_expires_at < now()`) | job re-claimable automatically | yes, via claim query itself | none unless `attempt_count` exhausted | `verification_claimed` (re-emitted on re-claim) | none | self-healing via claim query |
| Worker lease expired, original worker completes late | `claimed_by` guard on completion UPDATE (0 rows affected) | stale completion is a no-op | n/a | none | none from the stale worker | none — new claimant's result stands | never trust a completion that affected 0 rows |
| Hash mismatch | Worker compares `verified` hash to `client_sha256` | `verification_failed` | no (past max attempts) | review required | `hash_mismatch`, `verification_failed` | none — object retained | never auto-delete |
| Unsupported file format | Worker's container/codec check | `verification_failed` | no | review required | `verification_failed` | none | reject early with a clear reason, don't half-process |
| Duplicate hash | Post-verification query against `verified_sha256` index | flagged, not blocked | n/a | admin choice (link/new version/cancel) | `duplicate_detected` | none — never auto-merge/delete | show both, decide manually |
| Review rejected | Human action | `review_status='rejected'` | n/a | none required — terminal | `review_rejected` | none | asset stays in vault, inert |
| Rights expired | Checked at permission-check time, not just stored status | `hasPermission`/`canRouteAsset` return false regardless of stored `status` | n/a | re-clear if still valid | `rights_changed` on the eventual fix | none | deny by default past `expiresAt` |
| Rights unknown | Default state, nothing sets it otherwise | blocks all external/public routing | n/a | rights review | n/a (default, not an event) | none | `unknown` never implies allow or deny |
| Audit write failed | The A2 trigger itself failing (e.g. A5 missing) | the whole rights-record write fails (transactional) | n/a | fix schema order, retry | n/a — nothing was written | none — atomic failure, not partial | fail closed: no rights change without its audit event |
| Storage object missing (row says verified, object gone) | Reconciliation: HEAD check vs. `vault_object_ref` | anomaly, not auto-corrected | n/a | investigate, possibly re-upload as new version | none automatic | **high** — this is the one real data-loss case, and it's detection-only | never silently re-derive or delete the row |
| Orphan storage object (object, no DB row) | Reconciliation: list vault objects, diff against `vault_object_ref`s | anomaly | n/a | investigate before any deletion | none | low (object itself is intact) | never auto-delete — could be a row-creation failure mid-flight |
| Reconciliation detects corruption (hash present but doesn't match a re-check) | Periodic re-verification (not built this pass) | flagged | n/a | investigate, treat as `hash_mismatch` retroactively | manual `hash_mismatch` entry | **high** if the original is gone | never auto-repair |
| Destination routing denied | `canRouteAsset` / policy gate returns false | assignment stays `requested` or becomes `blocked` | n/a | fix rights/policy, retry | `destination_route_blocked`/`destination_route_rejected` | none | deny by default |
| Source deletion requested prematurely | `authorizeSourceDeletion` requires `SAFE_TO_DELETE` stage + human + authority | throws, nothing happens | n/a | complete the remaining gates | `source_delete_requested` only, never `_approved`/`_deleted` | none — this is exactly what the gate prevents | deny by default, always |

## 7. Red team

Attacked conceptually and, where practical, with real pure unit tests (97 catalog domain tests total, up from 66 at the start of this pass).

| Attack | Result | Class |
|---|---|---|
| Idempotency collision (double-click, two tabs, retried timeout) | DB `UNIQUE(uploaded_by, idempotency_key)` + insert-or-select application pattern — proven safe in `SUMG_MANUAL_INTAKE_STATE_MACHINE.md` | resolved |
| Replayed finalize request | Same idempotency mechanism; finalize step itself should be a `WHERE upload_status = 'pending_upload'` guarded UPDATE (idempotent no-op on replay) | resolved (documented, not yet implemented — no production code ships this pass) |
| Cross-user UUID injection | Moot — no tenancy model (§2); `is_cms_role()` gates the table, not row ownership | not applicable |
| Verification worker race | `FOR UPDATE SKIP LOCKED` — proven Postgres-native safe primitive, documented in A1's own comment | resolved |
| Lease theft | `claimed_by` guard on completion — proven in `SUMG_MANUAL_INTAKE_STATE_MACHINE.md` | resolved |
| Forged client SHA-256 | `client_sha256` is explicitly advisory-only; every duplicate/authority decision uses `verified_sha256`, worker-computed | resolved by design |
| MIME spoofing | Declared MIME validated against allow-list before signed URL issuance; actual container re-derived server-side via `music-metadata` post-upload, never trusted from the client alone | resolved by design |
| Wrong extension | Object key extension is derived from the verified MIME, never the client filename | resolved by design |
| Giant file | 250MB cap, enforced before the signed URL is even issued | resolved by design |
| Empty/truncated file | Worker's technical verification (duration/stream validation) catches this — `verification_failed` | resolved by design |
| Duplicate upload race (two identical files, simultaneous) | Both rows exist independently until both verify; confirmed-duplicate flag only fires once both have `verified_sha256`; neither auto-merged/deleted | resolved by design, tested in `lineage.test.ts`/`routing-guard.test.ts` for the underlying primitives |
| Lineage cycle / self-lineage | DB CHECK (self) + app-level cycle detection, both tested (`lineage.test.ts`) | resolved |
| Rights set to `cleared` by AI | DB CHECK (`catalog_rights_records_ai_cannot_clear`) + app-level `assertAiCannotClear`, both tested | resolved |
| Rights permission typo/unknown key | NEW: `catalog_rights_records_permissions_shape` CHECK — rejects unknown keys and non-boolean values at the DB level | **fixed this pass** |
| Expired rights routed anyway | NEW: `hasPermission`/`canRouteAsset` both check `expiresAt` against caller-supplied `now`, never trusting the stored `status` alone — tested exhaustively in `rights.test.ts`/`routing-guard.test.ts` | **fixed this pass** |
| Unknown rights routed | `canRouteAsset` unconditionally blocks `unknown` — tested | resolved |
| Audit row deletion | No DELETE policy exists at all on `catalog_audit_log` for any role via the normal client | resolved by design |
| Actor spoof (automation claiming to be human) | NEW: `catalog_audit_log_no_human_spoof` CHECK — a non-human `actor_type` can never carry a real human `actor` UUID | **fixed this pass** |
| Source deletion before Vault verification | `authorizeSourceDeletion` requires the full `SAFE_TO_DELETE` gate chain, tested in `intake.test.ts` | resolved (pre-existing) |
| PersonaWorks route before rights clearance | `buildPersonaWorksContract` throws without `personaworks` permission specifically — tested; NEW this pass: also throws without `uploadStatus='verified' AND reviewStatus='approved'`, closing the "rights cleared early, asset not actually ready" gap | **hardened this pass** |
| Public Storage access to a master | No bucket exists yet; design mandates private-only — see `SUMG_MASTER_VAULT_SECURITY_CONTRACT.md` | not applicable yet (nothing created) |
| Signed URL over-broad lifetime | 5-minute default documented as a product assumption, not a guarantee | resolved by design |
| Object overwrite | Object keys are derived from fresh UUIDs per version — structurally cannot collide | resolved by design |
| Orphaned storage | Covered by the reconciliation anomaly table (§6, `SUMG_MASTER_VAULT_SECURITY_CONTRACT.md`) | detection-only, by design (no destructive auto-fix) |
| Stale upload indefinitely stuck | Reconciliation report flags it; no automatic state change (would need a human/janitor decision) | detection-only, by design |
| **Hidden clocks in the domain layer** (not in the original attack list, found while implementing) | `destinations.ts::requestDestination`, `lineage.ts::addLineageEdge`, `routing.ts::applyRecipe`/`proposeManualRouting` all used `Date.now()`/`new Date()` directly, inconsistent with `vault.ts`/`source-adapter.ts`'s explicit-clock discipline | **fixed this pass** — all four now take an explicit `now` parameter, tested for determinism |

**BLOCKER: 0. HIGH: 0.** Everything found was either already resolved by the design from earlier passes, or fixed within this pass (permissions shape validation, expiration-at-check-time, actor anti-spoofing, PersonaWorks availability guard, hidden-clock removal). No blocker or high-severity finding was left unresolved.

**MEDIUM:** duplicate logical Works (two Work rows for the same real composition) has no automatic prevention — flagged in §3, mitigated by human review only, not fixed (no reliable automated test for "is this the same song" exists or is being built this pass). **LOW:** none beyond what's already noted inline above.
