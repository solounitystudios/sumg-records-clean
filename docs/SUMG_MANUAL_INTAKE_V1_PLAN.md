# SUMG Manual Intake V1 — Plan

**Status:** Design only. No route, server action, or UI in this document has been implemented in this pass — everything below is a plan grounded in verified production reality (`SUMG_PRODUCTION_SCHEMA_DRIFT_AUDIT.md`, `SUMG_MASTER_VAULT_PRODUCTION_READINESS.md`) and the revised `supabase/migrations_proposed/A1` schema. Target milestone: real master upload → private vault → SHA-256 verified → Work/Recording/Version created → review queue → founder routing. No public publish, no distribution, no PersonaWorks, no source deletion, no AI requirement.

---

## 1. Rights on first ingest (Part 9)

A manually ingested master **never** automatically becomes cleared, distributed, PersonaWorks-approved, or published. The intake workflow (§3 below) creates exactly one `catalog_rights_records` row per new `catalog_works` row, at creation time, in the same transaction:

```
status: 'unknown'   (A2's column default — no override, no inference)
permissions: { distribution: false, sync: false, personaworks: false, aiTraining: false }
set_by: the uploading admin's identity
```

`unknown` is not `denied` and not `cleared` — this is enforced today in `lib/catalog/rights.ts` (`isUnknown`/`isDenied`/`isCleared` are mutually exclusive; `hasPermission()` only returns true for `status === 'cleared'` AND the specific flag). No PersonaWorks `commercial_safe` boolean semantics are used anywhere here — SUMG's rights model is the six-state enum, full stop; PersonaWorks' own vocabulary is PersonaWorks' concern, never imported into this schema. `lib/catalog/rights.ts::assertAiCannotClear()` already prevents an AI-sourced write from ever setting `cleared`, and V1's ingest flow never calls anything AI-driven in the first place (Part 12 explicitly requires no AI, no fabricated BPM/key/genre/mood).

## 2. First real persistence slice (Part 8) — what changed from PR #21's A1

Audited `supabase/migrations_proposed/A1` and `A2` against the verified production schema (§2/§4 of the drift audit). Neither table name collides with anything live; `documents`/`contracts` (A2's evidence FKs) exist in production with matching shapes, so A2 needed no revision. **A1 was revised** to the smallest shape that supports one real ingested master — see the file's own changelog comment for the itemized diff. Summary:

| Entity | V1 fields (this revision) | Dropped from the original A1 reviewed in PR #21 | Why |
|---|---|---|---|
| `catalog_works` | id, title, song_id (nullable), **created_by**, **status**, created_at, updated_at | — (additive only) | Need to know who started the intake and whether it's still mid-intake vs. active |
| `catalog_recordings` | id, work_id, **artist_reference** (nullable text), created_at | `title`, `is_primary` | A work's title covers V1 (one recording per work); primacy is meaningless with exactly one recording |
| `catalog_asset_versions` | id, recording_id, version_kind, vault_object_ref, sha256, size_bytes, **mime_type**, **duration_seconds**, **technical_metadata** (jsonb), **review_status**, **source**, **uploaded_by**, is_primary, created_at, updated_at | — (additive only) | Part 12's technical facts need somewhere to live; Part 13's review queue needs a state field |
| `catalog_asset_lineage` | unchanged | — | Already minimal |

No backfill of any existing `songs` row — `catalog_works.song_id` stays null for every row created by this flow; nothing forces the ~0 existing production songs into the new model. **Production migration applied: NO.**

## 3. Manual intake V1 — exact workflow (Part 10)

```
ADMIN → /admin/catalog/intake (already exists as a stub page, PR #21)
  → "Upload Master" action
  → client requests a signed upload URL for the private vault bucket
  → client uploads directly to Supabase Storage using that signed URL
  → server verifies the upload (HEAD request via service role: confirms object
    exists, reads size/mime from storage.objects — does not re-read the bytes)
  → server computes/receives SHA-256 (see below), inserts:
      catalog_works (status='intake')
      catalog_recordings
      catalog_asset_versions (review_status='pending_review')
      catalog_rights_records (status='unknown') — same transaction
      catalog_audit_log row(s) — same transaction, see §6
  → redirect to /admin/catalog/review/[assetVersionId]
```

- **Route:** `/admin/catalog/intake` (existing stub, gets a real form) → posts to a new Server Action `app/actions/catalogIntake.ts::uploadMaster(formData)`.
- **Direct-to-storage vs. server proxy:** direct signed upload, not proxied through the Next.js server action. Part 10 explicitly says "do not send huge master files through Next.js unnecessarily" — a 200MB WAV through a Vercel/Next.js server action risks request body limits and ties up server compute for the whole upload duration for no benefit. The server action's job is: (1) issue a short-lived signed **upload** URL (Supabase Storage supports `createSignedUploadUrl()`, the write-side counterpart to `getSignedReadUrl` already designed in `lib/catalog/vault.ts` — that interface would need one more method, `putOriginal`/`putDerivative` already model the write, so this is an implementation detail of a real `MasterVault`, not an interface change), (2) after the client confirms upload completion, verify via a metadata-only HEAD-style query and create the DB rows.
- **SHA-256:** computed **client-side before upload starts** (Web Crypto `crypto.subtle.digest`, streamed) so the value the server trusts is known before the bytes leave the browser, then **re-verified server-side** after upload via `MasterVault.verifyObject()` (re-hashes the stored object using the service-role client, never trusts the client-reported hash alone) — this is exactly `vault.ts`'s existing `verifyObject(objectRef, expectedSha256)` contract, unchanged.
- **DB transaction boundary:** the four inserts (work, recording, asset version, rights record) plus the audit log rows happen in one Postgres transaction (a single RPC/function call via the service-role client, or sequential inserts wrapped in a Supabase `rpc()` — matching the existing `append_inbox_log`-style single-purpose RPC pattern already used in this codebase, minus that function's security gap: this one must NOT be `SECURITY DEFINER` callable by `anon`). Partial failure must not leave an orphan vault object referenced by nothing, or a `catalog_works` row with no rights record — either everything commits or nothing does.
- **Max size:** 250MB (per the vault readiness doc).
- **Allowed formats:** `audio/wav`, `audio/x-wav`, `audio/flac`, `audio/aiff` for masters; `audio/mpeg` accepted but flagged as non-master-quality in the UI (a compressed reference, not a master).
- **Failure handling:** signed-upload-URL request failure → no DB row created at all (nothing to clean up). Upload-to-storage failure → same, client just retries against a fresh signed URL. Post-upload verification failure (hash mismatch, object missing) → the object is left in the vault (never silently deleted — Part 31's "never auto-delete" applies even to a bad upload; a human decides), no catalog rows are created, and a single `catalog_audit_log` entry records the failed verification attempt.
- **Idempotency:** re-running the same upload (same file) computes the same SHA-256. Before creating new catalog rows, the flow checks `catalog_asset_versions` for an existing row with the same `sha256` — see §4.
- **Retry:** upload retry is a plain re-attempt of the signed-upload step (new signed URL, same client-computed hash) — no partial-upload resume in V1, files are small enough (≤250MB) that a clean retry is acceptable.
- **Review state:** every new asset version starts `review_status = 'pending_review'`.
- **Audit event:** see §6.

## 4. Duplicate handling (Part 11)

Exactly the two-bucket model `lib/catalog/lineage.ts::classifyDuplicate()` already implements (revised this pass to stop implying similarity evidence that doesn't exist — see PR #21's correctness pass):

- **Same SHA-256** → `exact_duplicate`. The intake flow queries `catalog_asset_versions where sha256 = $1` before inserting. If a match is found, the upload is **not** silently turned into a second catalog record — the admin is shown the existing record and asked to confirm (link to existing / upload anyway as a deliberate new version / cancel). Neither copy is auto-deleted.
- **Different SHA-256** → `unknown` relationship. No version-relationship or acoustic-similarity inference is attempted — Part 11 explicitly defers both to future evidence (fingerprinting/embeddings don't exist in this codebase yet).
- Nothing in this flow ever calls `DELETE` on a vault object or a catalog row as a side effect of duplicate detection.

## 5. Technical metadata V1 (Part 12)

Extracted server-side (after verified upload, before the transaction commits) using `music-metadata` — already a repo dependency, already the exact tool `app/actions/audioInbox.ts::scoreAudioAsset()` uses for the same purpose today. Captured into `catalog_asset_versions.duration_seconds` (top-level column) and `.technical_metadata` (jsonb: `sample_rate`, `channels`, `bitrate_kbps`, `bit_depth` when reliably reported by the container, `container`). No BPM, key, genre, or mood is captured or fabricated — those are Music Intelligence fields (Part 19 of the original mission brief), out of scope for V1, and explicitly disallowed from being invented per Part 12 here.

## 6. Review Queue V1 (Part 13)

`/admin/catalog/review` (existing honest stub from PR #21) becomes a real list + detail view **once this slice's tables exist** — not before, and not with any production write wired in this pass unless explicitly authorized later, per Part 13's own instruction. Planned shape:

**List view** — every `catalog_asset_versions` row with `review_status = 'pending_review'`, joined to its `catalog_recordings`/`catalog_works`/`catalog_rights_records` rows, showing: title/source filename, upload time, SHA-256 (truncated for display), technical metadata summary, a duplicate warning badge (if `classifyDuplicate()` found an `exact_duplicate` at intake time — stored as a flag, not re-computed on every page load), current rights status (`unknown` for everything in V1), artist/persona assignment (from `catalog_recordings.artist_reference`, editable), project assignment (not modeled yet — deferred), catalog role (not modeled yet — deferred, see Part 22 of the original mission brief), master/version type (`version_kind`), provenance (`source`, `uploaded_by`), policy flags (none exist yet in V1 — A2 ships the table, nothing writes to it automatically), destination proposals (none — Routing Desk V1 is manual only, see §7).

**Founder actions** (server actions, each one an explicit, auditable write — not batch/automatic):
- Approve Catalog Record → `review_status = 'approved'`
- Assign Artist → writes `catalog_recordings.artist_reference`
- Assign Persona → not modeled this slice (no persona-identity table exists anywhere in the schema yet, live or proposed — genuinely deferred, not silently dropped)
- Assign Project → not modeled this slice (same reason)
- Hold → `review_status = 'held'`
- Archive → `review_status = 'archived'`
- Reject → `review_status = 'rejected'`
- Send to Rights Review → writes `catalog_rights_records.status = 'under_review'` (still not `cleared` — a human reviewing evidence is a separate, later action)

**Explicitly not added:** a PersonaWorks delivery action. Per Part 13's own instruction, that action doesn't exist until rights/destination persistence is real and actually enforces the permission check — adding a button that does nothing (or worse, something) ahead of that would violate Part 29's "no fake AI state" rule in spirit.

## 7. Routing Desk V1 (Part 14)

`/admin/catalog/routing` (existing stub) gets real destination proposals **only** for destinations SUMG can actually fulfill without new infrastructure:

**Enabled in V1:** `sumg_artist_catalog`, `sumg_project`, `sumg_public`, `archive` — all four are pure catalog-internal state changes (a `catalog_destination_assignments` row, per A4), no external system involved.

**Disabled/unavailable in V1 (shown greyed out with "not yet available," not hidden — an honest state per Part 29):** `personaworks`, `distribution` (DSP), `sync`. These require either a real external integration (distribution, sync) or an explicit cross-system contract that isn't connected (PersonaWorks) — Part 33 of the original mission brief disallows building any of that this pass, and Part 14 here explicitly says keep them disabled until permissions are ready.

No fake routing metrics anywhere — the stub page today shows zero numbers because zero real routing decisions exist; that stays true until real `catalog_routing_decisions`/`catalog_destination_assignments` rows exist to count.

## 8. Audit log (Part 15)

**Decision: include the minimum audit trail in this same first persistence slice, not a following one.** Reasoning: every event Part 15 lists (`upload initiated`, `master secured`, `hash verified`, `catalog record created`, `review decision`, `rights state changed`, `route approved`) happens *inside* the exact transaction boundary described in §3 — deferring the audit table to a later slice would mean either (a) the V1 intake flow ships with no audit trail at all for its first real use, or (b) retrofitting transaction boundaries later to add logging, which is more disruptive than including the (already-designed, already-reviewed-in-PR-#21) `catalog_audit_log` table (A5) now. A5's shape is already correct for this — no revision needed.

**Reuse check, per Part 15's explicit instruction to prefer reuse:** the only existing "audit-shaped" infrastructure in this codebase is `audio_inbox.action_log` (jsonb array on a single row, YouTube-pipeline-specific) and `import_logs`/`import_batches` (import-specific, and `import_logs` has the open-RLS problem documented in the drift audit). Neither is a general append-only audit log suitable for cross-entity events (work created, rights changed, route approved — none of which are "an audio inbox item" or "an import row"). **No existing system is duplicated** — `catalog_audit_log` fills a real, confirmed gap, not a reuse-audit failure.

## 9. What this plan explicitly does not do

No public publish. No distribution. No PersonaWorks. No source deletion. No AI requirement anywhere in the flow. No production migration applied — `A1`(revised)/`A2`/`A5` remain proposals in `supabase/migrations_proposed/`, not promoted into `supabase/migrations/`. No route, server action, or UI code was written in this pass — this document is the plan a future, explicitly authorized pass would implement against.
