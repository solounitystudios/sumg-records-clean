# SUMG-CAT-P0-003 — MasterVault + A1 real master asset vertical slice

**Status:** implementation complete on `feat/sumg-cat-p0-003-mastervault-a1`. **No production mutation.** A1 is NOT applied; the `sumg-master-vault` bucket is NOT created. Founder approval required before any production step (see the runbook at the end).

Base main SHA: `0dbeab6f00bb008562ae577bf95b910f4babb91c` (PR #23 merged — P0-002 production-proven).

---

## 1. Phase 1 — inventory (recorded)

| Item | Value |
|---|---|
| main SHA | `0dbeab6f00bb008562ae577bf95b910f4babb91c` |
| Working tree at branch cut | clean |
| Latest merged Catalog PRs | #23 (P0-002 audit fix), #22 (P0-001 A5+A2), #21 (Command Center foundation) |
| Production migration ledger head | `20260909233528` (`catalog_rights_audit_actor_fix`, P0-002) |
| Production catalog tables | `catalog_audit_log`, `catalog_rights_records`, `catalog_policy_flags` only |
| Production Storage buckets | `music` (private, unused), `sumg-assets` (public) |
| A1 / A3 / A4 | UNAPPLIED |
| MasterVault | not implemented in production |

Files read and audited: all of `lib/catalog/*`, `lib/db/catalogRights.ts`, `lib/db/supabase.ts`, `supabase/migrations/20260909100001_catalog_audit_log.sql`, `supabase/migrations/20260909100002_catalog_rights_policy.sql`, `supabase/migrations_proposed/A1_work_recording_version_lineage.sql`, `supabase/migrations_proposed/README.md`, `docs/SUMG_MASTER_VAULT_SECURITY_CONTRACT.md`, `lib/catalog/proposed-schema-rls.security.test.ts`.

---

## 2. Phase 2 — the V1 asset model (from the existing domain, not invented)

The existing domain already defines every concept; nothing here is a parallel model.

| Concept | Object | Owns |
|---|---|---|
| Composition / work | `catalog_works` | title, optional `song_id` pointer, `status` (intake/active/archived), `created_by` provenance |
| Specific recording | `catalog_recordings` | `work_id` (immutable FK), `artist_slug` (loose text) |
| Uploaded master file / version | `catalog_asset_versions` | `version_kind`, **the Storage reference `vault_object_ref`**, hashes, size/mime/duration, `technical_metadata`, `upload_status`, `review_status`, `source`, `uploaded_by`, `is_primary`, `idempotency_key` |
| Storage reference owner | `catalog_asset_versions.vault_object_ref` | opaque bucket-relative key `masters/<recordingId>/<assetVersionId>/original.<ext>` — **never a URL** |
| Integrity identity | `client_sha256` (advisory, browser-submitted) + `verified_sha256` (authoritative, set only after a server-side re-hash) | |
| Provenance | `source` (CHECK-constrained), `uploaded_by` / `created_by` (who, not an access boundary) | |
| Parent/child lineage | `catalog_asset_lineage` (`asset_version_id` → `parent_asset_version_id`, 0-or-1 parent per child, DB cycle guard) | |
| Verification state | `catalog_asset_versions.upload_status` + `catalog_verification_jobs` (worker claim/lease bookkeeping) | |
| Review state | `catalog_asset_versions.review_status` + `catalog_review_flags` (multiple independent reasons, current-state) | |
| Rights attachment | `catalog_rights_records` (A2/P0-002) via `subject_type='recording'` + `subject_id = recording.id` — **loose polymorphic reference, no schema change** | |
| Immutable audit evidence | `catalog_audit_log` (A5) — `intake_created`, `lineage_created` (DB triggers), `upload_completed` / `hash_verified` / `verification_passed` / `verification_failed` / `review_*` (adapter-emitted, actor-aware) | |

### Domain / schema reconciliation (Phase 2 "STOP if they disagree")

They **did** disagree — `lib/catalog/types.ts` had drifted from the A1 proposal after the pre-production hardening pass revised the schema. Narrowest reconciliation applied in this PR (types → schema, since the schema is the newer source of truth):

| `types.ts` before | `types.ts` now (matches applied migration) |
|---|---|
| `CatalogAssetVersion.sha256: string \| null` | `clientSha256` + `verifiedSha256` (two fields) |
| — | `uploadStatus`, `reviewStatus`, `mimeType`, `durationSeconds`, `technicalMetadata`, `source`, `uploadedBy`, `idempotencyKey` added |
| `CatalogWork` had no `status` / `createdBy` | both added (`CatalogWorkStatus` union) |
| `CatalogRecording` had `title`, `isPrimary`, `updatedAt` | replaced with `artistSlug` (schema shape) |
| `CatalogAssetLineageEdge` | optional `createdBy` added |
| — | `CatalogVerificationJob`, `CatalogReviewFlag`, `CatalogAssetState` added |

Blast radius was zero runtime code: those three interfaces had no consumers yet; `lineage.ts` took one optional new param (`createdBy`, defaulted `null`); `classifyDuplicate` keeps its own inline `{ sha256 }` param. All 129 pre-existing tests still pass.

---

## 3. Phase 3 — MasterVault design decision

**Supabase Storage private bucket `sumg-master-vault`** — matches the current architecture (service-role server-side access; the app never ships the service-role key to a browser — `lib/db/supabase.ts` is server-only) and the existing `SUMG_MASTER_VAULT_SECURITY_CONTRACT.md` §1.

Existing Storage conventions inspected: `sumg-assets` (public, wrong for masters — **not reused**), `music` (private, unreferenced), all uploads today go server-proxied through the service-role client with no `storage.objects` policies at all. The vault adds explicit policies (below) so it is strict-by-construction rather than relying only on "no policy = service-role only".

### V1 contract (`lib/catalog/master-vault-key.ts` + the two migrations)

| Property | V1 decision |
|---|---|
| Bucket | `sumg-master-vault`, `public = false` |
| Object key | `masters/<recordingId>/<assetVersionId>/original.<ext>` — every segment a server-generated UUID from a committed row; `<ext>` from the server's MIME→ext map, never the client filename. **Refined from the contract doc's 4-segment key** (dropped the redundant `{work_id}` — `recordingId → workId` is 1:1 and immutable) so the DB `CHECK` can bind a ref *exactly* to its own row. |
| Path traversal | structural — no user text in the key, so nothing to sanitize; `buildMasterVaultKey` rejects any non-UUID segment |
| Overwrite | never — no `FOR UPDATE` storage policy; `upsert: false`; adapter `exists()`-checks first and throws `VaultObjectExistsError`; replacement = a new asset version + lineage edge |
| Deletion | no path — no `FOR DELETE` storage policy; adapter `archive()` throws `MasterVaultOperationNotSupportedError` |
| Max size | 250 MB (`file_size_limit = 262144000`) |
| MIME allowlist | `audio/wav`, `audio/x-wav`, `audio/wave`, `audio/flac`, `audio/x-flac`, `audio/aiff`, `audio/x-aiff`, `audio/mpeg` (mp3 accepted, UI-flag non-master-quality) |
| Read | short-TTL (300s) signed URL, minted server-side by the service-role client; `SELECT` storage policy also gates on `is_cms_role()` for a direct admin client |
| Write | server-proxied `putOriginal` (V1 proof path) or a signed **upload** URL (`createSignedUploadUrl`, 1800s intent) for future direct-browser upload; `INSERT` storage policy gates on `is_cms_role()` |
| Checksum | `sha256Hex` of the bytes the server uploads (server-proxied path makes this authoritative for V1); `verifyObject` re-downloads and re-hashes for an independent check |
| Credentials in metadata | impossible by construction — uploads carry no bearer token into the object store |
| Service-role key client-side | never — adapter is a server-only module using `lib/db/supabase.ts` |

---

## 4. Phase 4 — A1 production-readiness audit

Audited `supabase/migrations_proposed/A1_work_recording_version_lineage.sql` object by object. **Result: ISSUES FOUND — 6 narrow fixes, 0 unsafe/redundant.**

| Object | Classification | Note |
|---|---|---|
| `catalog_works` | **NEEDS NARROW FIX** | add trigger-maintained `updated_at` (FIX #5) |
| `catalog_recordings` | READY AS-IS | `work_id` immutability trigger already present |
| `catalog_asset_versions` | **NEEDS NARROW FIX** | FIX #1 `uploaded_by` delete behavior; FIX #2 `source` CHECK; FIX #3 `vault_object_ref` binding CHECK; FIX #5 `updated_at` trigger |
| `catalog_asset_lineage` | **NEEDS NARROW FIX** | FIX #4 DB-level multi-hop cycle guard; FIX #5b `created_by` for attribution |
| `catalog_verification_jobs` | READY AS-IS | claim primitive documented, not built this pass |
| `catalog_review_flags` | **NEEDS NARROW FIX** | FIX #7 partial unique on `(subject, reason_code) WHERE status='open'` |
| RLS (all 6) | READY AS-IS | single `is_cms_role()` `FOR ALL` policy each, matches A2/A5 |
| Audit integration | **MISSING → ADDED** | FIX #6 — the proposal wired no audit; added `intake_created` + `lineage_created` DB triggers (transition events are adapter-emitted, actor-aware) |

### The 6 fixes (all in `supabase/migrations/20260909180000_catalog_a1_work_recording_version_lineage.sql`, tagged `[P0-003 FIX] #n`)

1. **`uploaded_by`**: proposal had `NOT NULL … ON DELETE RESTRICT` — blocks deleting any user who ever uploaded, and contradicts A5/A2's "provenance survives user deletion". Changed to nullable + `ON DELETE SET NULL`. The immutable `intake_created` audit row is the durable chain-of-custody record.
2. **`source`**: was free `TEXT`. Now `CHECK (source IN ('manual_upload','worker_derivative','system_import','api_upload'))`.
3. **`vault_object_ref`**: was free `TEXT` — a row could point at another version's object. Now `CHECK (vault_object_ref IS NULL OR vault_object_ref ~ ('^masters/' || recording_id::text || '/' || id::text || '/original\.(wav|flac|aiff|aif|mp3)$'))` — a version can only reference its own canonical key.
4. **Lineage cycles**: proposal deferred multi-hop cycle prevention to app code only. Added `catalog_asset_lineage_no_cycle()` `BEFORE INSERT OR UPDATE` trigger (recursive-CTE ancestor walk, mirrors `lib/catalog/lineage.ts::wouldCreateCycle`).
5. **`updated_at`**: shared `catalog_touch_updated_at()` `BEFORE UPDATE` trigger on `catalog_works`, `catalog_asset_versions`, `catalog_verification_jobs` — the reconciliation report keys stale-upload detection off `updated_at`. (5b) added `catalog_asset_lineage.created_by` for derivation attribution.
6. **Audit**: `catalog_asset_versions_intake_audit_trg` (AFTER INSERT → `intake_created`) and `catalog_asset_lineage_created_audit_trg` (AFTER INSERT → `lineage_created`), same DB-enforced style as A2's `rights_changed`. Actor mapping reuses A5's five `actor_type` values, `human` iff the provenance UUID is present, else `system` — satisfies `catalog_audit_log_no_human_spoof` by construction.
7. **Review flags**: `catalog_review_flags_one_open_per_reason` partial unique index.

**Does A1 already support a Storage reference?** Yes — `catalog_asset_versions.vault_object_ref`. No new column needed; FIX #3 only hardens it with a CHECK. No duplicate asset-storage concept was created.

---

## 5. Phase 5 — the P0-003 acceptance test

Encoded as `supabase/tests/sumg-cat-p0-003-vertical-slice.sql` (transactional `BEGIN … ROLLBACK`, nothing persists) — 14 cases:

1. Work created → 2. Recording created (+ `work_id` immutable) → 3. Asset Version created (`pending_upload`/`pending_review`) → 4. `intake_created` audit row, actor = uploader → 5. `vault_object_ref` CHECK accepts the row's own key / rejects a foreign key / rejects a bad extension → 6. verification job + `verified_sha256` + `upload_status='verified'` (+ `recording_id` immutable) → 7. review flag + `review_status='held'` (+ duplicate-open-reason rejected) → 8. lineage edge original→normalized-derivative + `lineage_created` audit → 9. cycle / self-parent / two-parents / two-primaries all rejected → 10. rights record attached via the P0-002 layer on `subject_type='recording'`, `rights_changed` audited → 11. all 6 A1 tables RLS-on, `is_cms_role()` only, no open/anon policy → 12. bucket private + exactly 2 CMS storage policies + no overwrite/delete policy → 13. ≥4 immutable audit rows for the chain → 14. `songs=32`, `releases=32` unchanged.

**Lineage honesty:** a first, sole master cannot truthfully have a parent. The test creates a **second controlled version** (a `worker_derivative`, `version_kind='other'`) and links `original master → normalized derivative` with `derivation_type='normalize'`. This is a metadata-only derivation edge — no lossy/destructive media processing is performed or implied. If the founder wants the production proof to use only ONE object, lineage is proven structurally (cycle/self/one-parent guards) and the second-version edge is created with a tiny synthetic derivative; see the runbook.

---

## 6. Phases 6–12 — what shipped

| Phase | File(s) | Notes |
|---|---|---|
| A. Storage contract | `lib/catalog/master-vault-key.ts` | pure key build/parse, MIME allowlist, constants, `isPublicUrl` guard |
| B. A1 schema | `supabase/migrations/20260909180000_catalog_a1_work_recording_version_lineage.sql` | promoted + 6 fixes; forward-only; reversal notes inline |
| B. Bucket | `supabase/migrations/20260909180100_catalog_master_vault_storage.sql` | private bucket + 2 CMS `storage.objects` policies, no update/delete policy; idempotent |
| C. Persistence adapter | `lib/db/catalogAssets.ts` | `createSupabaseAssetCatalogStore` + `createSupabaseAuditSink` (service-role client) |
| C. Domain store contract | `lib/catalog/asset-store.ts` | `AssetCatalogStore` interface + deterministic in-memory impl + `CatalogAuditSink` + `assertAuditActorShape` |
| D. Upload path | `lib/db/catalogMasterVault.ts` | `createSupabaseMasterVault` — `putOriginal` (V1), `createSignedUploadUrl` (future), `verifyObject` (re-hash), `getSignedReadUrl`, `probeObject`; `archive` explicitly unsupported |
| E. Read-back | `AssetCatalogStore.getAssetState` (both impls) | assembled `CatalogAssetState` a founder reviews |
| F. Rights attachment | reuse `lib/db/catalogRights.ts` unchanged | `subject_type='recording'`, `subject_id = recording.id` — **P0-002 not rewritten, no second rights system** |
| G. Verification/review persistence | `catalogAssets.ts` `recordVerification` / `failVerification` / `setReviewStatus` / `createVerificationJob` / `addReviewFlag` / `resolveReviewFlag` | |
| H. Smoke strategy | `supabase/tests/sumg-cat-p0-003-vertical-slice.sql` + structural tests | see §7 |
| I. Cleanup | runbook §"Cleanup" | temp rows deletable; audit rows retained (append-only) |
| J. Rollback boundaries | each migration's inline reversal block | audit history always survives a schema reversal |

### Audit coverage (Phase 12)

- **DB triggers** (can't happen silently): `intake_created` (asset version INSERT), `lineage_created` (lineage INSERT). Same enforcement model as A2's `rights_changed`.
- **Adapter-emitted** (real actor only the caller knows): `upload_completed`, `hash_verified` / `hash_mismatch`, `verification_passed`, `verification_failed` (all `actor_type='worker'`, `actor=null`, worker label), `review_approved` / `review_rejected` / `review_requested` (`actor_type='human'`, the reviewer UUID).
- `assertAuditActorShape` enforces A5's `no_human_spoof` invariant in the adapter before every write; the DB CHECK is the backstop.
- Reused A5 actor vocabulary exactly (`human`/`service`/`worker`/`ai`/`system`). No fake UUIDs — `actor` is always a real `auth.users` id or `null`.

### Rights subject-model check (Phase 11)

`catalog_rights_records.subject_type` already includes `'recording'` and `'work'` (A2 migration line 48). `subject_id` is `TEXT` (loose polymorphic ref, by design). An A1 recording's UUID drops straight in — **no constraint weakened, no schema change**. Verified in the SQL harness case 10.

---

## 7. Phase 13–15 — tests, gates, diff

### Tests added (all under `lib/catalog/`, run by `npm test`)

| File | Count | Covers |
|---|---|---|
| `master-vault-key.test.ts` | 11 | key build/parse, UUID-only segments, MIME allowlist, traversal rejection, `keyBelongsToVersion`, DB-regex/ext agreement, `isPublicUrl` |
| `asset-store.test.ts` | 20 | full slice, `assertAuditActorShape` (no_human_spoof), intake/upload/verify/review audit semantics, one-primary, no-overwrite, lineage cycle/self-parent, review-flag dedupe + resolve, assembled read-back |
| `a1-schema.security.test.ts` | 15 | every A1 table RLS + `is_cms_role()` only, no open/anon, no backfill, in-scope (no A3/A4/apparel), all 6 fixes present, immutability + unique guards, vault ref is a key not a URL |
| `master-vault-storage.security.test.ts` | 10 | bucket private, id matches constant, 250MB, MIME allowlist master-only, exactly 2 CMS policies, no update/delete policy, no public/anon, doesn't touch other buckets, idempotent |
| `vault.test.ts` (+1) | | `putOriginal` never overwrites |

**`npm test`: 182 pass / 0 fail** (was 129, +53). `npm run pretest` clean. `npx tsc --noEmit` clean. `npm run lint -- --max-warnings 50`: 27 warnings / 0 errors — **identical to the pre-P0-003 baseline** (all 27 pre-existing, in unrelated `components/` and `worker/dist/`). Production build: _[recorded in the PR / final report]_.

**Real DB integration test:** `supabase/tests/sumg-cat-p0-003-vertical-slice.sql` — not run in CI (no Postgres in CI, same constraint as P0-002). Runbook §"Production proof" is the plan to execute it.

### Diff scope (Phase 15)

Touched: `supabase/migrations/2026090918*.sql` (new), `supabase/tests/sumg-cat-p0-003-*.sql` (new), `lib/catalog/{types,lineage,vault,index}.ts`, `lib/catalog/{master-vault-key,asset-store}.ts` (new), `lib/catalog/*.test.ts` (new/1 edit), `lib/db/{catalogMasterVault,catalogAssets}.ts` (new), `docs/SUMG_CAT_P0_003_MASTERVAULT_A1.md` (this file).

**Not touched:** PersonaWorks, A3, A4, routing/destinations, DSP delivery, apparel/business-unit, YouTube OAuth, finance, royalties, `songs`, `releases`, contracts, `lib/db/catalogRights.ts`, any existing migration, any unrelated RLS. The A1 proposal file is unchanged (historical record).

### Security advisors

To be run against production only if/when the founder applies the migrations (nothing is applied now). Expected: the same pre-existing `function_search_path_mutable` advisory class will extend to the new trigger functions — this is a **pre-existing pattern** carried from A2/A5 (their trigger/helper functions have the same property), **not a P0-003 regression**, and out of scope for this slice (hardening every catalog function's `search_path` is its own pass). No new RLS advisory: every new table has a policy; no `USING(true)`; no public grant.

---

## 8. PRODUCTION PROOF PLAN (runbook — execute only after PR approval + merge)

**Goal:** prove `REAL MASTER FILE → PRIVATE MASTERVAULT → WORK → RECORDING → ASSET VERSION → LINEAGE → VERIFICATION/REVIEW → RIGHTS → AUDIT → READ-BACK` with **one** controlled real master. Do **not** touch any of the existing 32 songs / 32 releases. Create a clearly-labeled P0-003 test asset.

### Preflight (read-only)

```
-- via Supabase MCP execute_sql, project yisxnwbsnzxjnmzpstzj
1. ledger head is still 20260909233528; no catalog_works/etc table exists yet
2. songs=32, releases=32, contributors=1, publishing_works=0, contracts=0, documents=0
3. catalog_rights_records=0, catalog_policy_flags=0, catalog_audit_log=3 (P0-002 retained)
4. storage.buckets = {music, sumg-assets} only
5. A1/A3/A4 objects absent; is_cms_role() unchanged
```

### Migrations to apply (targeted `apply_migration`, the A5/A2/P0-002 method — never a broad `db push`)

1. `20260909180000_catalog_a1_work_recording_version_lineage.sql`  (name: `catalog_a1_work_recording_version_lineage`)
2. `20260909180100_catalog_master_vault_storage.sql`  (name: `catalog_master_vault_storage`)

Apply in that order (bucket migration is independent, but keep it second). Both are forward-only and idempotent.

### Immediately verify

```
- ledger has 2 new apply-time entries, nothing else
- 6 A1 tables present; 6 RLS enabled; 6 is_cms_role()-only policies; 0 open/anon
- triggers: catalog_asset_versions_intake_audit_trg, catalog_asset_lineage_created_audit_trg,
  catalog_asset_lineage_no_cycle_trg, *_touch_updated_at_trg, *_immutable_trg all ENABLED
- storage.buckets has sumg-master-vault, public=false, file_size_limit=262144000,
  allowed_mime_types = the 8-entry audio list
- storage.objects policies: exactly "master vault cms read" (SELECT) + "master vault cms write"
  (INSERT) scoped to bucket_id='sumg-master-vault'; NO update/delete policy
- songs=32, releases=32, contributors=1, publishing_works/contracts/documents=0 (unchanged)
- catalog_audit_log still = 3 (no backfill)
```

### Upload one real master

Preferred V1 path — **server-proxied**, service-role, no browser key:

1. Founder provides one real master file (`.wav`/`.flac`/`.aiff`, ≤250MB) and a title. Use a clearly-labeled title, e.g. `__SUMG P0-003 PRODUCTION PROOF__` (or a real work the founder explicitly designates).
2. Server (Node, service-role):
   - `createWork({ title, songId: null, createdBy: <founder auth.users uuid> })`
   - `createRecording({ workId, artistSlug: 'sumg-p0003' })`
   - `createAssetVersion({ recordingId, versionKind: 'master', source: 'manual_upload', uploadedBy: <founder uuid>, clientSha256: <sha256 of the file>, mimeType, sizeBytes, isPrimary: true })`
   - `objectRef = buildMasterVaultKey(recordingId, assetVersionId, mimeType)`
   - `createSupabaseMasterVault().putOriginal(objectRef, { bytes, mimeType })`  → returns `{ sha256, sizeBytes }`
   - `store.attachVaultObject({ assetVersionId, vaultObjectRef: objectRef, clientSha256: sha256, sizeBytes, mimeType, actor: <founder uuid> })`
   - `store.createVerificationJob(assetVersionId)`
   - `verifiedSha256 = ` re-hash via `vault.verifyObject(objectRef, sha256)` (returns bool) then `store.recordVerification({ assetVersionId, verifiedSha256: sha256, workerLabel: 'p0003-manual-verify' })`
   - `store.setReviewStatus({ assetVersionId, status: 'approved', reviewedBy: <founder uuid> })`

### Prove lineage (one extra tiny synthetic derivative — no media processing)

3. `deriv = store.createAssetVersion({ recordingId, versionKind: 'other', source: 'worker_derivative', uploadedBy: null })`
4. `store.addLineageEdge({ childAssetVersionId: deriv.id, parentAssetVersionId: assetVersionId, derivationType: 'normalize', createdBy: <founder uuid> })`
   - (optional) put a small normalized-metadata sidecar object for `deriv` via `putDerivative`; not required for the lineage proof.

### Attach rights (P0-002 layer, unchanged)

5. `createSupabaseRightsRecordStore().setRightsRecord({ subjectType: 'recording', subjectId: recordingId, status: 'under_review', ownerEntity: null, territory: null, evidenceDocumentId: null, contractId: null, permissions: {distribution:false,sync:false,personaworks:false,aiTraining:false}, setBy: <founder uuid>, setBySource: 'founder_assigned', expiresAt: null }, now)`

### DB objects expected after the proof

| Table | Rows |
|---|---|
| `catalog_works` | 1 (`status='intake'`) |
| `catalog_recordings` | 1 |
| `catalog_asset_versions` | 2 (the master `verified`/`approved` with `vault_object_ref` set + `verified_sha256`; the derivative `pending_upload`) |
| `catalog_asset_lineage` | 1 (master → derivative, `normalize`) |
| `catalog_verification_jobs` | 1 (`completed`) |
| `catalog_review_flags` | 0 (or 1 opened+resolved if exercised) |
| `catalog_rights_records` | 1 (`recording`, `under_review`) |
| `storage.objects` in `sumg-master-vault` | 1 (or 2 with the optional sidecar) |

### Audit evidence expected (`catalog_audit_log`, append-only)

| action | object_type | actor_type | actor |
|---|---|---|---|
| `intake_created` | `catalog_asset_versions` (master) | human | founder uuid |
| `upload_completed` | `catalog_asset_versions` (master) | human | founder uuid |
| `hash_verified` | `catalog_asset_versions` (master) | worker | null |
| `verification_passed` | `catalog_asset_versions` (master) | worker | null |
| `review_approved` | `catalog_asset_versions` (master) | human | founder uuid |
| `intake_created` | `catalog_asset_versions` (derivative) | system | null |
| `lineage_created` | `catalog_asset_lineage` | human | founder uuid |
| `rights_changed` | `catalog_rights_records` | human | founder uuid |

Prior 3 P0-002 rows remain → total 11.

### Read-back (production adapter)

`createSupabaseAssetCatalogStore().getAssetState(masterAssetVersionId)` → assert `work` / `recording` / `assetVersion` (`vaultObjectRef` set, `verifiedSha256` set, `uploadStatus='verified'`, `reviewStatus='approved'`) / `lineage` (1 edge) / `verificationJob` (`completed`) present. Mint a 300s signed read URL via `vault.getSignedReadUrl` and confirm it is **not** an `/object/public/` URL and expires.

### Cleanup / non-cleanup rules

- **Delete** the temp `catalog_rights_records` row, `catalog_asset_lineage` row, `catalog_verification_jobs` row, both `catalog_asset_versions` rows, the `catalog_recordings` row, the `catalog_works` row (in FK order — CASCADE from `catalog_works` handles most).
- **Delete** the `storage.objects` entry(ies) in `sumg-master-vault` — via the **service-role client** only (there is deliberately no client delete path). Confirm the bucket is empty afterward.
- **Do NOT delete** `catalog_audit_log` rows — append-only by design. The `__SUMG P0-003 PRODUCTION PROOF__`-labeled `intake_created` / `lineage_created` / etc. rows stay, exactly like the P0-002 retained rows.
- Re-verify: `catalog_works=0`, `catalog_recordings=0`, `catalog_asset_versions=0`, `catalog_asset_lineage=0`, `catalog_verification_jobs=0`, `catalog_review_flags=0`, `catalog_rights_records=0`, `sumg-master-vault` objects = 0; `songs=32`, `releases=32`, others unchanged.

### Rollback boundaries

- If a migration fails mid-apply: Postgres DDL is transactional — a failed `apply_migration` leaves nothing partial. Re-inspect and fix forward.
- If the proof reveals a defect after apply: **do not** `DROP` the tables if any real (non-test) row exists. For a test-only state, the inline reversal blocks in each migration are the down-path (drop A1 tables CASCADE, then the helper functions; drop the 2 storage policies; delete the bucket only if empty). `catalog_audit_log` and its P0-002 rows are never touched by any rollback.
- The bucket is never deleted while it holds objects.

### Human actor

Use one genuine existing `auth.users` UUID (the founder's) for `created_by` / `uploaded_by` / `set_by` / reviewer — **never create a user**, never expose the UUID in a report. If no safe UUID is available at proof time: `HUMAN PRODUCTION WRITE NOT EXERCISED — SAFE SKIP` and run the chain with `uploadedBy: null` (`actor_type='system'` throughout).

---

## 9. Completion assessment

| Area | % | Basis |
|---|---|---|
| Catalog domain / foundation | ~90% | types reconciled to schema; pure logic for provenance/rights/lineage/vault/intake/destinations all present + tested |
| Rights / policy / audit persistence | 100% (production-proven) | P0-002; unchanged and reused here |
| MasterVault readiness | ~80% | contract + key module + private-bucket migration + real Supabase adapter (server-proxied path) all done and tested; **not applied**; direct-browser-upload + reconciliation job + 2nd-copy DR still future |
| A1 readiness | ~85% | audited, 6 fixes, promoted migration + real adapter + in-memory fixture + structural tests + SQL harness; **not applied**; verification *worker* itself not built (job table + claim primitive are) |
| A3 / A4 readiness | 0% | untouched, deferred by design |
| Catalog Command Center overall | ~55–65% | persistence spine (A5+A2 live, A1 ready) + domain layer done; Review Queue / Routing Desk / intake UI + A3/A4 + worker still ahead |

### CATALOG V1 DONE — definition

1. one real private master stored in MasterVault · 2. Work exists · 3. Recording exists · 4. Asset Version exists · 5. provenance recorded · 6. checksum recorded · 7. lineage proven where applicable · 8. verification/review state exists · 9. rights attached · 10. immutable audit evidence exists · 11. founder can retrieve/review the asset · 12. no public master exposure · 13. no A3/A4/DSP requirement.

**A successful P0-003 production proof (runbook §8) satisfies every one of these 13 points.** This PR delivers everything needed to run that proof; it does not itself perform any production mutation.
