# Media Flow Map — Phase 0

**Status:** Documentation only.
**Companion docs:** `MEDIA_SYSTEM_AUDIT.md`, `ORPHAN_REFERENCE_REPORT.md`, `STORAGE_BUCKET_REPORT.md`.

This document traces every distinct media flow end-to-end: trigger → storage → DB → reader. Where multiple paths converge they're called out.

---

## Flow 1 — Generic image upload

**Trigger:** admin pastes a file into a generic upload UI.
**Action:** `app/actions/upload.ts:uploadImage`

```
client (FormData)
  │
  ▼
app/actions/upload.ts:45-47
  storage.from("sumg-assets").upload("<folder>/<uuid>.jpeg", { upsert: false })
  │
  ▼ public URL
storage.from("sumg-assets").getPublicUrl(path)              // :51
  │
  ▼ row
INSERT INTO assets (type='image', url, filename, mime_type, …)  // :53-61
  │
  ▼ no FK back to any domain table
```

**Reader:** none specifically. The URL is returned to the caller, who decides what to do (often `<img src>`). No FK, no `attached_to`.

**Issues:**
- No dedup. Same file uploaded twice → two `assets` rows + two storage objects.
- Caller is responsible for plumbing the URL onto a domain row. If they forget, the asset is orphaned at create time.

---

## Flow 2 — Bulk asset library upload

**Trigger:** `/admin/assets` uploader.
**Action:** `app/actions/assets.ts:uploadAssetFile`

```
client (file + type + producer_slug + tags)
  │
  ▼
app/actions/assets.ts:157-159
  storage.from("sumg-assets").upload("<type>/<uuid>.<ext>")
  │
  ▼
INSERT INTO assets (type, url, filename, producer_slug, tags[], status='ready')   // :168-180
  │
  ▼ if type === 'audio':
import lib/db/audioInbox.createInboxEntry(assetId)                                // :198-208
  │
  ▼
INSERT INTO audio_inbox (asset_id, status='new_asset')   ← table may be absent in prod
  │
  ▼ async, fire-and-forget
import app/actions/audioInbox.scoreAudioAsset(entry.id)
  │   parses with music-metadata
  ▼
UPDATE audio_inbox SET bpm, duration_seconds, signal_data, quality_score, …
```

**Reader:** `/admin/assets`, `/admin/youtube/inbox`, plus any FK consumers.

**Issues:**
- Audio scoring failure is silently swallowed (`catch(console.error)` at `assets.ts:204`). If `audio_inbox` doesn't exist in prod, audio uploads succeed but never get metadata; user gets no warning.
- No checksum/filename dedup. Re-uploading the same audio creates a duplicate `assets` row + a duplicate `audio_inbox` entry → duplicate scoring jobs.

---

## Flow 3 — Artist photo / hero upload

**Trigger:** artist edit form.
**Action:** `app/actions/artists.ts:uploadArtistPhoto` (line 30) or `uploadArtistHeroImage` (line 217).

```
client (file + artistSlug)
  │
  ▼
storage.from("sumg-assets").upload("artists/<uuid>.jpeg")        // photo
storage.from("sumg-assets").upload("artists/hero/<uuid>.jpeg")   // hero
  │
  ▼  TWO writes happen:
UPDATE artists SET profile_image_url = url   (or hero_image_url)  // :39 or :226
INSERT INTO assets (type='image', url, filename, attached_to:{type:"artist", slug})  // :46-54 or :228-236
```

**Reader:**
- `app/artists/[slug]/page.tsx:33` reads `artist.heroImageUrl ?? artist.profileImageUrl`
- The `assets` row is only readable via the asset library (`/admin/assets`), not joined to the artist anywhere.

**Issues:**
- The URL exists in **two places**: `artists.profile_image_url` (the live one) and `assets.url` (the catalog copy). Replacing the photo writes a *new* row to both — old row is **never archived** in `assets`.
- `attached_to: { type: "artist", slug }` is JSONB metadata, not a FK. Artist rename (slug change) silently disconnects the link.
- No dedup on either storage or `assets` insert.

---

## Flow 4 — AI thumbnail generation (OpenAI)

**Trigger:** Thumbnail Studio "Generate".
**Action:** `app/actions/generateThumbnailImage.ts:generateThumbnailImages`

```
client (prompt, count, projectId, …)
  │
  ▼
OpenAI image API → temporary URL
  │
  ▼ fetch + upload
storage.from("sumg-assets").upload("thumbnails/<ts>_<rand>.png")        // :88-90
  │
  ▼
INSERT INTO assets (type='image', tags=['thumbnail','ai-generated','openai'])   // :103-119
  │
  ▼
INSERT INTO thumbnail_assets (image_url, asset_id, prompt_used, …)              // :129-136
  │
  ▼ if projectId:
INSERT INTO thumbnail_versions (project_id, image_url, asset_id, prompt, …)     // :141-150
```

**Reader:** Thumbnail Studio UI, render pipeline (`yt_upload_jobs.thumbnail_asset_id` after approve).

**Issues:**
- **Three rows for one image**: `assets`, `thumbnail_assets`, `thumbnail_versions` all hold `image_url` independently. Sync depends on the function not failing partway.
- No transaction. Partial failure → orphan in any subset of the three.
- Thumbnail studio is the only flow where `assets.attached_to` is not used — instead, `thumbnail_assets.asset_id` and `thumbnail_versions.asset_id` carry the back-reference.

---

## Flow 5 — Approve thumbnail project

**Trigger:** Studio "Approve" button.
**Action:** `lib/youtube/thumbnails/actions.ts:approveProject` (line 318).

```
client (projectId, versionId, imageUrl, jobId, ...)
  │
  ▼ check filename match
SELECT id FROM assets WHERE filename = "thumbnail_project_<projectId>.png"     // :310-312
  │
  ├── existing row ──► UPDATE assets SET url, alt_text                          // :316
  │
  └── no row     ────► INSERT INTO assets (...)                                 // :343-356
  │
  ▼
INSERT INTO thumbnail_assets (asset_id, image_url, linked_upload_job_id, …)    // :362-369
  │
  ▼
UPDATE thumbnail_projects SET status='approved', approved_asset_id, …          // :372-380
  │
  ▼
UPDATE yt_upload_jobs SET thumbnail_asset_id, thumbnail_status='approved'       // :383-392
```

**Reader:** YouTube renderer reads `yt_upload_jobs.thumbnail_asset_id` → joins to `assets` to get the URL for upload metadata.

**Issues:**
- **No transaction across the four writes.** Partial failure leaves: orphan `assets` row, missing `thumbnail_assets`, project still marked draft, job pointing at a non-existent thumbnail.
- The dedup check at `:308-318` is **the only filename-based dedup** anywhere in the upload paths. It only works because the filename is deterministic per project.

---

## Flow 6 — Render YouTube video

**Trigger:** worker / cron.
**Action:** `lib/youtube/renderer.ts:renderJobToMp4` (line ~200+).

```
worker reads yt_upload_jobs row
  │
  ▼ ffmpeg / external render
local mp4 file
  │
  ▼
storage.from("sumg-assets").upload("renders/<jobId>.mp4", { upsert: true })   // :228-234
  │
  ▼ idempotent
SELECT FROM assets WHERE filename = "render_<jobId>.mp4"
  │
  ├── exists ──► UPDATE assets
  │
  └── absent ──► INSERT INTO assets (type='video', filename, url, …)           // :261-274
  │
  ▼
UPDATE yt_upload_jobs SET asset_id, status='ready_to_upload'
```

**Reader:** YouTube uploader (worker), then YouTube itself.

**Notes:** This is the cleanest flow. Idempotent on both storage (`upsert: true`) and DB (filename match). Pattern to keep.

---

## Flow 7 — Audio inbox lifecycle

**Trigger:** Flow 2 (audio upload) → entry created → admin promotes via UI.

```
audio_inbox.status:
  new_asset                   ← created on upload
   │
   ▼ scoreAudioAsset (auto)
  needs_review (or analyzing → needs_review)
   │
   ▼ admin sets metadata
  needs_metadata → needs_thumbnail → needs_render → ready_to_schedule
   │
   ▼ approve+schedule
  scheduled
   │
   ▼ uploader runs (cron)
  uploaded
```

**Tables touched:** `audio_inbox` (UPDATE), eventually creates a `yt_upload_jobs` row (insert pathway in `app/actions/audioInbox.ts`).

**Issues:**
- Heavy JSONB columns: `signal_data`, `action_log`, `thumbnail_variants`, `title_variants`. No schema enforcement on shapes.
- Cascade-delete from `assets`: deleting the source audio deletes the inbox row including all generated metadata (BPM, scores, generated titles, thumbnail prompts). Costly to re-derive.

---

## Flow 8 — Document upload (separate from `assets`)

**Trigger:** admin documents UI.
**Action:** `app/actions/documents.ts:22-31`.

```
client (file_url, file_name, …)   ← URL is provided by caller, NOT uploaded by this action
  │
  ▼
INSERT INTO documents (file_url, file_name, file_size, mime_type, …)
```

**No storage upload happens here.** Documents are inserted with a pre-existing URL. There is no FK to `assets` and no dedup. Contracts and PDFs live entirely outside the `assets` system.

**Reader:** admin document pages only.

---

## Flow 9 — Producer assets (M2M)

**Trigger:** producer admin "assign asset".
**Action:** `app/actions/producers.ts:~108-126`.

```
client (producer_slug, asset_id)
  │
  ▼
INSERT INTO producer_assets (producer_slug, asset_id, status='raw')
  │
  ▼  UNIQUE(producer_slug, asset_id) prevents dupe
  ▼  asset_id is TEXT, NO FK to assets
```

**Issues:**
- `producer_assets.asset_id` has no FK constraint, only a logical relationship. Dangling IDs are possible if the asset is deleted out-of-band.
- `producer_assets.notes` column is dead (no readers/writers found in code).

---

## Flow 10 — DNA pack creation

**Trigger:** DNA pack builder.
**Action:** `app/actions/dnaPacks.ts:~27-46`.

```
client (...)
  │
  ▼
INSERT INTO dna_packs (artist_dna_id, producer_dna_id, asset_id, …)
```

**Reader:** `app/actions/audioInbox.ts` and `app/actions/youtube.ts` look up `dna_packs.asset_id`.

**Issues:**
- `dna_packs.asset_id` has FK to `assets` (ON DELETE SET NULL) but **is never explicitly written** in the DNA pack creation code we found — auditor flagged it as orphaned. 🛰 prod-verify.

---

## Cross-flow observations

### Where the same image can land in N tables

| Image | Tables | Sync mechanism |
|---|---|---|
| AI thumbnail | `assets`, `thumbnail_assets`, `thumbnail_versions` | sequential inserts, no transaction |
| Approved thumbnail | `assets`, `thumbnail_assets`, `thumbnail_projects.approved_asset_id`, `yt_upload_jobs.thumbnail_asset_id` | sequential inserts/updates, no transaction |
| Artist photo | `assets`, `artists.profile_image_url` (URL string) | two-step write, no FK |
| Render video | `assets`, `yt_upload_jobs.asset_id` (FK) | idempotent insert + FK update |
| Document file | `documents.file_url` only | none |

### Where storage objects can outlive their DB rows

- Every flow that uses `upsert: false` + no dedup: a re-upload creates a new storage object; the old `assets` row keeps pointing at the *previous* file forever, but if the URL is overwritten on the domain table, the previous storage object is orphaned at the bucket level.
- `assets.ts:227,258` removes the storage path when the `assets` row is deleted — but only if the URL fits the regex `/sumg-assets/(.+)$`. Files in the `media` bucket are not handled by these paths.

### Where DB rows can outlive their storage objects

- Anything written via `lib/media/index.ts` (which targets `media` bucket, not `sumg-assets`) — but this code currently has no callers in `app/`, so the risk is dormant.
- Manual storage deletes from the Supabase dashboard would orphan any `assets.url` pointing there.

---

## Summary diagram

```
                         ┌─────────────────────┐
                         │   sumg-assets       │   ← live bucket (all flows except #8)
                         └─────────────────────┘
                                   ▲
        ┌──────────────────────────┼──────────────────────────────────┐
        │                          │                                  │
   upload.ts                  assets.ts                   artists.ts    generateThumbnailImage.ts
        │                          │                                  │
        ▼                          ▼                                  ▼
   assets row                assets row + audio_inbox            assets row + thumbnail_assets +
                                                                  thumbnail_versions
                                                                       │
                                                                       ▼
                                                                approveProject (actions.ts)
                                                                       │
                                                                       ▼
                                                                yt_upload_jobs.thumbnail_asset_id
                                                                       │
                                                                       ▼
                                                                  renderer.ts → renders/<id>.mp4
                                                                       │
                                                                       ▼
                                                                YouTube uploader

                             documents.ts                  ← no storage upload, file_url externally provided
                                   │
                                   ▼
                              documents row only

                             lib/media/index.ts            ← targets `media` bucket; currently dormant
```

---

## What this map tells us about Phase 1

The cleanest unit of consolidation is **Flow 5 (approve thumbnail)**: it already does most of the right things (dedup on filename, multi-table write) but lacks atomicity. Wrapping it in a Supabase RPC is the lowest-risk consolidation target.

The highest-risk consolidation target is **Flow 3 (artist photo)** because it duplicates URL state across two tables with no FK and no archive trail.

Flow 8 (documents) is a separate ecosystem and should remain so until the asset model is finalized.
