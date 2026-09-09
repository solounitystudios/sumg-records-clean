# SUMG Master Vault Implementation Preflight

**Status:** Design + read-only verification, 2026-09-09. No bucket created, no object uploaded, no policy changed. Supersedes the SHA-256/transaction sections of `SUMG_MANUAL_INTAKE_V1_PLAN.md` (§3–4 there now point here rather than repeating this reasoning — see that doc's note).

---

## 1. Vault technical readiness (Part 18)

Unchanged from the production-verification pass's recommendation, re-confirmed:

| Setting | Value |
|---|---|
| Bucket | `sumg-master-vault` (new — the existing unreferenced `music` bucket is not silently repurposed) |
| `public` | `false` |
| Access | signed URLs only, no public/anon policy on `storage.objects` for this bucket |
| Upload | direct signed upload from the browser to Storage |
| Download | short-lived signed read URL |
| Canonical object ref | opaque, never a filename, never a public URL |

**Object layout:** `masters/{work_id}/{recording_id}/{asset_version_id}/original.{ext}` — not a bare filename, per Part 18's explicit instruction not to use filenames as canonical identity. Every path segment is a UUID already assigned by the DB insert (`catalog_works.id`/`catalog_recordings.id`/`catalog_asset_versions.id`), so the object key is fully derivable from the row and never depends on what the uploader named their local file. `{ext}` is the container extension inferred from the verified MIME type (`.wav`, `.flac`, `.aiff`), not the client-supplied filename's extension.

- **Allowed audio formats:** `audio/wav`, `audio/x-wav`, `audio/flac`, `audio/aiff` for masters; `audio/mpeg` accepted but UI-flagged as non-master-quality (unchanged from the vault readiness doc).
- **Max upload size:** 250MB (unchanged).
- **Content-type validation:** the signed-upload step validates the client-declared `Content-Type` against the allow-list *before* issuing the signed URL; after upload, `music-metadata` re-derives the actual container/codec server-side (async, see §2) — the declared type is never trusted alone.
- **Checksum strategy:** see §2 — this section was substantially revised this pass.
- **Overwrite behavior:** never — each object key is derived from a freshly-generated `asset_version_id`, so no upload can ever collide with or overwrite an existing object key. A "replace this master" action creates a new `catalog_asset_versions` row (and object) with `lib/catalog/lineage.ts::addLineageEdge()` pointing the new version at the old one as its parent, never an in-place overwrite.
- **Versioning:** handled entirely at the `catalog_asset_versions` row level (multiple rows per `recording_id`, `is_primary` marking the current one) — Supabase Storage's own object versioning is not relied on or enabled.
- **Archive behavior:** move to an `archive/` prefix within the same bucket on `archive()` (unchanged), never delete.
- **Duplicate handling:** unchanged from the manual intake plan (§4 there) — exact-SHA256 match surfaces a decision to the admin, never silently merges or deletes.

**Bucket created this pass: NO.**

## 2. SHA-256 verification design — challenged and revised

The prior pass's design ("client computes SHA-256 pre-upload, server re-verifies after upload") was underspecified in exactly the way Part 19 flags: **"server re-verifies" was never traced against what that actually requires with Supabase Storage.**

**What re-verification actually requires:** Supabase Storage (S3-compatible object storage under the hood) does not expose a trustworthy provider-computed content hash on write. Checked directly against the one real object in production:

```
storage.objects.metadata->>'eTag' for music/done.mp3 = "dd4a8709abe22ee3ec56b94cfa6239a9-1"
```

The trailing `-1` is the standard S3 multipart-upload ETag signature — for a multipart upload, the ETag is MD5(concatenation of each part's MD5) + `-` + part count, **not** a hash of the file's actual content, and not SHA-256 in any case. **The ETag cannot be used as a trustworthy content-integrity check.** This was verified against the real object, not assumed.

That leaves exactly one way to get a real SHA-256 of what's actually sitting in Storage: **read the bytes back and hash them.** There is no shortcut. The only design question is *where* that read happens:

| Option | Where it runs | Cost | V1 fit |
|---|---|---|---|
| Synchronous, in the Next.js server action | Vercel serverless function, request-bound | For a 250MB master: full download through the function before it can respond — real risk of hitting Vercel's execution time and memory limits, and doubles egress bandwidth for every single upload, on the critical path of the admin's upload UX. **Not cheap, contrary to how the prior pass framed it.** | Poor |
| Client-only, no re-verification | none | Cheapest, but a buggy or compromised client's reported hash is simply trusted — undermines the entire point of "SHA-256 verified" as a system guarantee | Not robust enough |
| **Asynchronous, in the existing `worker/` service** | Railway-hosted, long-running Node process (not request/response-bound) | Same total bytes-read cost as the synchronous option, but off the critical path, with no serverless timeout/memory ceiling, and streamed (`crypto.createHash('sha256').update(chunk)` incrementally, never holding the full file in memory at once) | **Chosen** |

**Why the worker is the right place, concretely:** `worker/src/index.ts` already implements exactly this shape today for video rendering — a poll loop against a job table, using the service-role Supabase client, with an explicit `recoverStuckJobs()` function that unsticks jobs whose worker process crashed mid-render based on a timeout cutoff. Master-hash verification is architecturally identical: poll `catalog_asset_versions where upload_status = 'uploaded_unverified'`, stream-download each object from the vault bucket via the service-role client, compute SHA-256 incrementally, compare against the client-submitted `sha256` column, and set `upload_status = 'verified'` or `'failed'`. This reuses a real, already-deployed process instead of inventing a second one — either as a new poll target in the same worker process, or (if separation of concerns matters more once real load exists) a sibling process using the identical pattern. Not implemented this pass.

**Recommended V1 flow:**
1. Client computes SHA-256 client-side (`crypto.subtle.digest`, streamed) before upload starts, submits it alongside the signed-upload request.
2. Server creates the `catalog_asset_versions` row with `upload_status = 'pending_upload'`, the client-submitted `sha256`, and issues the signed upload URL.
3. Client uploads directly to Storage. On confirmed completion, server flips `upload_status = 'uploaded_unverified'` (a cheap metadata-only check — object exists, size matches what Storage reports — no re-download yet).
4. The worker picks up `uploaded_unverified` rows on its next poll, streams the object back, computes the real hash, and sets `upload_status = 'verified'` (hash matched) or `'failed'` (mismatch — the object is **not** auto-deleted, a human decides, per Part 31's never-auto-delete rule; a `catalog_audit_log` entry records the mismatch).
5. The Review Queue (`docs/SUMG_MANUAL_INTAKE_V1_PLAN.md` §6) shows `upload_status` alongside `review_status` — an item can be reviewed as soon as it's `verified`; an item stuck at `uploaded_unverified` for longer than the worker's normal poll interval is a visible signal something's wrong, mirroring the existing `recoverStuckJobs()` pattern's timeout logic.

This is the "smallest robust V1" the task asks for: it doesn't skip verification (unlike trust-only), and it doesn't lie about the cost of verification (unlike a synchronous re-download framed as cheap) — it puts the unavoidable cost in the one place in this codebase already built to absorb it asynchronously.

## 3. Manual intake transaction model (Part 20)

`catalog_asset_versions.upload_status` (new column, added to A1 this pass — see that file) encodes exactly the states Part 20 asked for, using the exact names requested:

```
pending_upload → uploaded_unverified → verified
                                     ↘ failed
```

Mapped onto the locked `IntakeStage` lifecycle (`lib/catalog/intake.ts`) at the granularity this one table needs: `pending_upload`/`uploaded_unverified` correspond to the `DISCOVERED`→`SECURED` span, `verified` corresponds to `VERIFIED`. The full 12-stage enum is not wired into a DB column — nothing past `VERIFIED` is reachable in V1 anyway (no routing, no distribution), so a coarser 4-state field is the "keep it narrow" answer; the richer enum stays available in `lib/catalog/intake.ts` for whichever future pass actually needs `NEEDS_ROUTING`/`ROUTED`/etc. as real states with real transitions, per Part 33 of the original mission brief.

**Avoiding "storage succeeds, DB fails" and "DB exists, storage never completed":**

- The `catalog_works`/`catalog_recordings`/`catalog_asset_versions`/`catalog_rights_records`/`catalog_audit_log` inserts happen in one Postgres transaction, as designed in the manual intake plan — but that transaction only ever runs **after** the client confirms the Storage upload completed, not before and not racing it. Sequence: (1) client requests upload → server transaction creates all five rows with `upload_status='pending_upload'` and issues a signed URL scoped to the exact `vault_object_ref` those rows just committed to → (2) client uploads to that exact key → (3) client calls a small "confirm" action → (4) server does the cheap existence/size check and flips `upload_status='uploaded_unverified'` in a second, tiny transaction → (5) worker verifies asynchronously as in §2.
- This means the DB rows are created **first**, in `pending_upload`, before any bytes exist in Storage — the opposite order from "storage succeeds, then DB" — specifically so there's never a moment where a real object exists with no catalog record pointing at it. An abandoned upload (client crashes mid-upload, or never confirms) leaves a `pending_upload` row with no object behind it — inert, safely cleanable by a future janitor job (not built this pass) that archives `pending_upload` rows older than some threshold with no confirmed upload.
- **Recovery/idempotency:** re-attempting a failed or abandoned upload from the same admin session re-uses the same `catalog_asset_versions.id` (and therefore the same object key) if the row is still `pending_upload`, rather than creating a new row — the "create the row" step is idempotent per intake attempt, keyed on a client-generated idempotency token passed through to the server action, matching the retry semantics already described in the manual intake plan (§3 there).
- A `verified`-then-later-corrupted object (e.g. manual deletion from the bucket by someone with dashboard access) is not actively detected by anything in V1 — out of scope; would require periodic re-verification, not designed here.

## 4. First real proof plan (Part 21) — exact controlled sequence for a future approved pass

```
ONE REAL AUDIO MASTER
  → admin requests upload (creates catalog_works/recordings/asset_versions/
    rights_records/audit_log rows, upload_status='pending_upload', rights
    status='unknown')
  → private signed upload directly to sumg-master-vault
  → confirm step: upload_status='uploaded_unverified'
  → worker: verify object exists, stream-hash, compare to client-submitted
    sha256 → upload_status='verified' (or 'failed', stop and surface to admin)
  → Work exists, Recording exists, Asset Version exists
  → rights = unknown (untouched — nothing in this flow clears it)
  → review_status = pending_review
  → audit events: UPLOAD_INITIATED, MASTER_SECURED, HASH_VERIFIED,
    CATALOG_RECORD_CREATED all logged to catalog_audit_log
  → visible in Review Queue
STOP.
```

Explicitly verified this plan produces none of the following, by construction (no code path in this design touches any of them):

- **NO public Song created** — `catalog_works.song_id` stays null; nothing in this flow writes to the `songs` table at all.
- **NO Release created** — nothing in this flow touches `releases`.
- **NO distribution** — `catalog_destination_assignments` (A4) isn't even part of this migration slice; V1 stops before routing exists.
- **NO PersonaWorks delivery** — `buildPersonaWorksContract()` (`lib/catalog/destinations.ts`) requires `canDeliverToPersonaWorks(rights)`, which requires `status='cleared'` and `permissions.personaworks=true` — this flow never sets either, so the contract function would throw if anyone even tried to call it, and nothing in this flow calls it.
- **NO source deletion** — `authorizeSourceDeletion()` (`lib/catalog/intake.ts`) requires `stage='SAFE_TO_DELETE'` and a human actor with explicit delete authority — nothing in this flow reaches that stage or calls that function.
- **NO AI rights clearance** — `assertAiCannotClear()` would reject it even if attempted; nothing in this flow attempts it — rights stays `unknown`, set by a human actor (`set_by_source='founder_assigned'` or `'editor_assigned'`, never `'ai_inferred'`).
- **NO automatic publishing** — `catalog_asset_versions.review_status` starts and stays `pending_review` until a human founder action changes it; nothing in this flow auto-approves.

Not executed this pass — this is the spec a future, explicitly authorized pass implements against, once A0/A0.1/A1/A2/A5 (or whichever subset is approved) are actually promoted and applied.
