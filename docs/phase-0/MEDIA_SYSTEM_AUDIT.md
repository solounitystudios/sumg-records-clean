# Media System Audit — Phase 0

**Status:** Documentation only. No refactor, no schema changes.
**Generated:** 2026-05-07 from repo state at `main` (post-commit `10ab271`).
**Scope:** Reconcile the current media/storage architecture before designing replacements.

---

## 0. How to read this doc

Every claim is backed by `file:line` from the repo. Anything labelled **🛰 prod-verify** requires a live query against the production Supabase project (see `MIGRATION_DEPLOYMENT_CHECKLIST.md` for the SQL). Repo-side claims are deterministic.

> "🛰 prod-verify" entries are filled in via Supabase MCP queries when authentication is connected. Until then, they remain hypotheses based on migration files alone.

---

## 1. Tables — repo schema

All tables below are defined in `supabase/migrations/*.sql` or `lib/supabase/schema.sql`. The fact that a migration *exists* in the repo does not prove it has been applied to prod — that question is in the deployment checklist.

### Core media

| Table | Defined in | PK | Type | RLS | Purpose |
|---|---|---|---|---|---|
| `assets` | `lib/supabase/schema.sql:96` | `id` | **TEXT** (`gen_random_uuid()::text`) | 🛰 prod-verify (no explicit policy block found in repo) | Canonical media row |
| `audio_inbox` | `supabase/migrations/20260503000000_audio_inbox.sql:5` | `id` | TEXT | ✅ admin/editor/media_manager/release_manager | Audio review + scoring queue |
| `producer_assets` | `supabase/migrations/20260427000000_producer_extended.sql:22` | `id` | UUID | ✅ admin/editor/media_manager/release_manager | M2M producer ↔ asset |
| `documents` | `supabase/migrations/20260512000000_six_admin_modules.sql:92` | `id` | UUID | ✅ admin/editor/media_manager/release_manager | Contracts/PDFs (separate from assets) |

### Thumbnail subsystem

| Table | Defined in | PK | RLS | Purpose |
|---|---|---|---|---|
| `thumbnail_assets` | `20260523000000_thumbnail_studio.sql:160` | UUID | ✅ owner/co_owner/admin | Approved thumbnail library |
| `thumbnail_versions` | `20260523000000_thumbnail_studio.sql:101` | UUID | ✅ same | Per-project version history |
| `thumbnail_projects` | `20260523000000_thumbnail_studio.sql:70` | UUID | ✅ same | Studio project state |
| `thumbnail_presets` | `20260523000000_thumbnail_studio.sql:42` | UUID | ✅ same | Reusable canvas presets |
| `thumbnail_profiles` | `20260523000000_thumbnail_studio.sql:15` | UUID | ✅ same | Per-producer identity profile |
| `thumbnail_prompts` | `20260523000000_thumbnail_studio.sql:132` | UUID | ✅ same | Prompt library |
| `thumbnail_generation_jobs` | `20260527000000_thumbnail_generation_jobs.sql:4` | UUID | ✅ owner/co_owner/admin | Provider request queue (Midjourney etc.) |

### Generation/relation

| Table | Defined in | Notes |
|---|---|---|
| `dna_packs` | `20260428000000_dna_automation.sql:43` | Has `asset_id TEXT` (nullable) → `assets.id` (FK ON DELETE SET NULL added in 20260514) |
| `dna_records` | `20260425000000_dna_records.sql:4` | RLS uses `USING(true)`/`WITH CHECK(true)` — **open** (see §6) |

---

## 2. Inline media columns on non-media tables

URL strings live directly on domain tables. None of these are FKs.

| Field | Table | Migration | Read by | Written by |
|---|---|---|---|---|
| `audio_url` | songs | `lib/supabase/schema.sql:123` | `app/songs/[slug]/page.tsx:143` (raw `<audio>`), `app/artists/[slug]/page.tsx:154` (AudioPlayButton), `app/releases/[slug]/page.tsx:152,181` | imports flow, manual updates; no central writer |
| `media_asset_id` | songs | `lib/supabase/schema.sql:131` | `lib/cms/mappers.ts:132` | **never written** — dead column |
| `cover_art_url`, `accent_color` | releases | `schema.sql:88` / `20260423:25` | `app/songs/[slug]/page.tsx:30` (OG), release pages | imports / manual |
| `profile_image_url` | artists | `schema.sql:23` | `app/artists/[slug]/page.tsx:33,71-78` | `app/actions/artists.ts:39` |
| `hero_image_url` | artists | `schema.sql:22` | `app/artists/[slug]/page.tsx:33,71-78` | `app/actions/artists.ts:228` |
| `press_photos` (JSONB array) | artists | `20260515:3` | not surfaced on public site | admin only |
| `profile_image_url` | producers | `schema.sql:43` | mappers + producer pages | `app/actions/producers.ts:46` |
| `image_url` | producers | `20260427:8` | **not mapped → write-only dead column** | `app/actions/producers.ts:46` |
| `banner_url` | producers | `20260427:9` | **not mapped → write-only dead column** | `app/actions/producers.ts:47` |
| `hero_image_url`, `logo_url` | brands | `schema.sql:60-61` | brand pages, mappers | imports / manual |
| `image_url` | shopify_products / shopify_collections | `schema.sql:311,329` | shop pages | external sync |
| `accent_color` | yt_upload_jobs | `20260520:37` | renderer, studio | studio approval |
| `thumbnail_asset_id` | yt_upload_jobs | `20260520:32` | renderer, studio | `lib/youtube/thumbnails/actions.ts:383-392` |
| `file_url` | documents | `20260512:101` | `app/actions/documents.ts` | same |

**Dead-column candidates** (read but never written, OR written but never read):
- `songs.media_asset_id` (mapper reads, no writer)
- `producers.image_url` (write-only, never mapped)
- `producers.banner_url` (write-only, never mapped)

---

## 3. Foreign keys actually present

| Source → Target | Source col | Target col | ON DELETE | Migration:line |
|---|---|---|---|---|
| `yt_upload_jobs.yt_channel_id` → `yt_channels.id` | UUID | UUID | CASCADE | `20260427:90` (initially), made nullable in `20260502` |
| `audio_inbox.asset_id` → `assets.id` | TEXT | TEXT | **CASCADE** | `20260514:5-7` |
| `yt_upload_jobs.asset_id` → `assets.id` | TEXT | TEXT | SET NULL | `20260514:13-14` |
| `dna_packs.asset_id` → `assets.id` | TEXT | TEXT | SET NULL | `20260514:18-19` |
| `thumbnail_projects.upload_job_id` → `yt_upload_jobs.id` | UUID | UUID | CASCADE | `20260523:72` |
| `thumbnail_versions.project_id` → `thumbnail_projects.id` | UUID | UUID | CASCADE | `20260523:103` |
| `thumbnail_assets.linked_upload_job_id` → `yt_upload_jobs.id` | UUID | UUID | SET NULL | `20260523:166` |
| `thumbnail_generation_jobs.upload_job_id` → `yt_upload_jobs.id` | UUID | UUID | SET NULL | `20260527:10` |
| `thumbnail_generation_jobs.completed_thumbnail_asset_id` → `thumbnail_assets.id` | UUID | UUID | SET NULL | `20260527:14` |
| `dna_packs.artist_dna_id` → `dna_records.id` | UUID | UUID | SET NULL | `20260428:48` |
| `dna_packs.producer_dna_id` → `dna_records.id` | UUID | UUID | SET NULL | `20260428:49` |
| `dna_packs.producer_variation_id` → `producer_variations.id` | UUID | UUID | SET NULL | `20260428:50` |

**FKs that should exist but don't:**
- `producer_assets.asset_id` — TEXT NOT NULL, no FK constraint (can hold dangling IDs).
- `songs.media_asset_id` — TEXT, no FK.
- `releases.cover_art_url`, `artists.profile_image_url`, `artists.hero_image_url`, `producers.*_url`, `brands.*_url` — all loose URL strings, by design (URL not ID); none have FKs.
- `thumbnail_assets.asset_id` — exists in schema, **🛰 prod-verify** whether the constraint is enforced (it is referenced in code consistently).

**ON DELETE direction issue:**
- `audio_inbox.asset_id` is `ON DELETE CASCADE`. Deleting the underlying audio asset deletes the inbox row including all extracted metadata (BPM, duration, scores). Recommend `RESTRICT` or `SET NULL`. **Documented; no change yet.**

---

## 4. Storage usage from code

Two bucket names appear in code: **`sumg-assets`** (active) and **`media`** (only via `lib/media/index.ts`, currently has no callers in `app/`).

### Writes to `sumg-assets`

| File:Line | Function | Path pattern | Upsert? |
|---|---|---|---|
| `app/actions/upload.ts:45-47` | `uploadImage` | `<folder>/<uuid>.jpeg` | no |
| `app/actions/assets.ts:157-159` | `uploadAssetFile` | `<type>/<uuid>.<ext>` | no |
| `app/actions/artists.ts:30-32` | `uploadArtistPhoto` | `artists/<uuid>.jpeg` | no |
| `app/actions/artists.ts:217-219` | `uploadArtistHeroImage` | `artists/hero/<uuid>.jpeg` | no |
| `app/actions/generateThumbnailImage.ts:88-90` | `generateThumbnailImages` | `thumbnails/<ts>_<rand>.png` | no |
| `lib/youtube/renderer.ts:228-234` | `renderJobToMp4` | `renders/<jobId>.mp4` | **yes** |

### Writes to `media`

| File:Line | Notes |
|---|---|
| `lib/media/index.ts:53-55` | Generic upload (no callers in app/) |
| `lib/media/index.ts:95-97` | `replaceAsset` |
| `lib/media/index.ts:106` | `.move(...)` — archive subfolder |
| `lib/media/index.ts:135` | `deleteAsset` |

### Removes / moves

| File:Line | Bucket | Op |
|---|---|---|
| `app/actions/assets.ts:227` | sumg-assets | `.remove([path])` |
| `app/actions/assets.ts:258` | sumg-assets | bulk `.remove(paths)` |
| `lib/media/index.ts:106` | media | `.move(old, archive/...)` |
| `lib/media/index.ts:135` | media | `.remove([path])` |

### Inserts to `assets`

| File:Line | Trigger | Notes |
|---|---|---|
| `app/actions/upload.ts:53-61` | server action | type=image, no FK to entity |
| `app/actions/assets.ts:168-180` | server action | type from caller, sets producer_slug + tags |
| `app/actions/artists.ts:46-54` | server action | `attached_to: { type: "artist", slug }` JSONB |
| `app/actions/generateThumbnailImage.ts:103-119` | server action | type=image, tags=[thumbnail, ai-generated, openai] |
| `lib/youtube/thumbnails/actions.ts:343-356` | `approveProject` | dedup check by filename `thumbnail_project_<id>.png` (`maybeSingle`) |
| `lib/youtube/renderer.ts:261-274` | renderer | type=video, idempotent on filename |

> `app/actions/upload.ts`, `assets.ts`, `artists.ts`, `generateThumbnailImage.ts` all have **`upsert: false`** and **no dedup check before insert**. Re-uploading the same artist photo creates a new storage object *and* a new `assets` row.

---

## 5. Public read paths (where media surfaces)

| Field | Public reader | How rendered |
|---|---|---|
| `audio_url` | `app/songs/[slug]/page.tsx:143` | raw `<audio controls>` |
| `audio_url` | `app/artists/[slug]/page.tsx:154` | `<AudioPlayButton>` per row |
| `audio_url` | `app/releases/[slug]/page.tsx:152,181` | `<AudioPlayButton>` per row |
| `cover_art_url` | `app/songs/[slug]/page.tsx:30` | OG metadata only |
| `cover_art_url` | `app/songs/[slug]/page.tsx:216-222` | `next/image` |
| `profile_image_url` / `hero_image_url` | `app/artists/[slug]/page.tsx:33,71-78` | `next/image` with `heroImageUrl ?? profileImageUrl` fallback |

**Image strategy:** `next/image` is used in some places, raw `<img>` / CSS background elsewhere. The remote whitelist in `next.config.ts:10-21` allows `*.supabase.co/storage/v1/object/public/**` and `i.scdn.co/image/**`.

---

## 6. RLS

| Table | RLS | Policy summary | Notes |
|---|---|---|---|
| `assets` | **🛰 prod-verify** — no policy block in `lib/supabase/schema.sql` | If RLS is enabled in prod with no policy, default deny applies; if disabled, anyone with anon key can read | Audit immediately |
| `audio_inbox` | enabled | admin/editor/media_manager/release_manager | OK |
| `producer_assets` | enabled | admin/editor/media_manager/release_manager | OK |
| `thumbnail_*` (all 7) | enabled | owner/co_owner/admin | OK |
| `dna_packs` | enabled | admin/editor/media_manager/release_manager | OK |
| `documents` | enabled | admin/editor/media_manager/release_manager | OK |
| `dna_records` | enabled | **`USING(true) WITH CHECK(true)`** at `20260425:51-53` | **🚨 open read+write** |
| `import_logs` | enabled | `USING(true)` at `20260424:25-29` | **🚨 open read** |

`dna_records` and `import_logs` are not "media" exactly but they're publicly writable/readable in repo and worth flagging.

---

## 7. Inheritance / fallback in code

Only three null-coalesce chains exist in the public site, all single-step:

1. `app/artists/[slug]/page.tsx:33` — `artist.heroImageUrl ?? artist.profileImageUrl`
2. `app/artists/[slug]/page.tsx:212` — `artist.appleMusicUrl ?? artist.socialLinks?.appleMusic`
3. `app/artists/[slug]/page.tsx:235` — `artist.shopUrl ?? "/brands"`

**Song artwork:** *no* fallback chain. `app/songs/[slug]/page.tsx:30` reads `release?.coverArtUrl` and stops. There is **no song → release → artist → brand** chain in code today.

---

## 8. Generated/derived media

- `thumbnail_versions.image_url` and `assets.url` can drift: when a `thumbnail_versions` row is inserted (`generateThumbnailImage.ts:141-150`) it stores the URL alongside the asset id. Deleting the asset doesn't update the version's `image_url`.
- `assets` and `thumbnail_assets` both store the URL of the same approved thumbnail (`actions.ts:343-369`). They're written together; if the second insert fails, the first is **not rolled back** (no transaction). Orphan possible.
- `thumbnail_assets.asset_id` is nullable in schema. In code (approve + generate paths) it's always set, but a manual insert could leave it null.

---

## 9. Audio metadata extraction

Single point of extraction: `app/actions/audioInbox.ts:999-1128` (`scoreAudioAsset`). Uses `music-metadata` (`parseBuffer`). Output: `bpm`, `key_signature`, `duration_seconds`, `signal_data` (JSONB: `bitrate_kbps`, `sample_rate`, `channels`, `codec`, `lossless`, `container`), `quality_score`, `commercial_score`, `ctr_score`. **All output goes to `audio_inbox` only.** `songs.audio_url` carries no extracted metadata.

If `audio_inbox` is not deployed in prod, this entire pipeline silently fails — see §10.

---

## 10. audio_inbox deployment gap

**User-stated:** "no audio_inbox table exists live" (per task brief).
**Repo state:** Migration committed at `supabase/migrations/20260503000000_audio_inbox.sql` plus follow-ups (`20260504`, `20260505`, `20260506`, `20260516`, `20260524`).
**Verification:** 🛰 prod-verify — query `information_schema.tables WHERE table_name = 'audio_inbox'`.

**If table is absent in prod, the following surfaces break:**
- Hard-error on page load: `app/admin/youtube/inbox/page.tsx:26-31` (`getAllInboxItems`, `getInboxCounts`, `getArchivedInboxItems`)
- Hard-error on activity feed: `app/admin/activity/page.tsx:27` (counts/joins)
- Hard-error on alerts: `app/admin/alerts/page.tsx`
- Soft-fail (caught) on audio upload: `app/actions/assets.ts:198-208` swallows error via `.catch(console.error)`. Asset row is still created in `assets`; the `audio_inbox` entry simply never exists.

**Conclusion:** today, dropping audio uploads doesn't break uploads, but every consumer page either errors or shows zero. The `/admin/queues` page added in commit `50450b8` has soft fallbacks (`safeCount` / `loadStatusBreakdown` catch errors) so it's already resilient. Inbox/activity/alerts are not.

---

## 11. thumbnail_assets vs assets divergence

| Event | `assets` | `thumbnail_assets` | Atomic? |
|---|---|---|---|
| AI generation completes (`generateThumbnailImage.ts:103-150`) | row inserted | row inserted (same `asset_id`) | **no transaction**; partial failure possible |
| Project approved (`actions.ts:343-369`) | upsert via filename match | row inserted | **no transaction**; if step 2 fails, step 1 orphan |
| Asset later deleted | row deleted | **no cascade**; `thumbnail_assets.image_url` becomes stale string | n/a |

There is no FK from `thumbnail_assets.asset_id` to `assets.id` declared in any migration *we read* — 🛰 prod-verify whether the constraint exists in prod.

---

## 12. Highest-risk findings

Ordered by blast radius if left unfixed:

1. **`audio_inbox` deployment gap** — admin pages that join it will 500 if the table is missing. (§10)
2. **`assets` table RLS unverified** — if RLS is off, anon clients can read/insert; if on with no policy, prod admin writes may silently fail. (§6)
3. **No deduplication on uploads** — every uploader uses `upsert: false` with no filename/checksum check. Storage bloat + duplicate `assets` rows accumulate. (§4)
4. **`audio_inbox.asset_id ON DELETE CASCADE`** — deleting an asset wipes its scoring metadata. Wrong direction for this relationship. (§3)
5. **No transaction wrapping `assets`+`thumbnail_assets` writes** — partial failures leave orphans. (§11)
6. **Dead columns**: `songs.media_asset_id`, `producers.image_url`, `producers.banner_url` — confusion in mappers, write-only producer URLs ship to nowhere. (§2)
7. **`dna_records` open RLS** — `USING(true)` is more permissive than other admin tables. (§6)

---

## 13. What is *not* broken (don't touch)

- Thumbnail studio FK graph (`projects → versions`, `jobs → projects`) — well-formed, ON DELETE CASCADE in the right direction.
- `next.config.ts` remote-image whitelist — correctly scoped.
- Renderer dedup (`renderer.ts:228-234` upsert + idempotent insert) — only path that does this right.
- Approval flow's filename-based dedup (`actions.ts:308-318`) — correct, but only applies to the project's own approved image, not the original generated versions.

---

## 14. Cross-references

- Per-flow diagrams → `MEDIA_FLOW_MAP.md`
- Orphan & broken-cascade catalog → `ORPHAN_REFERENCE_REPORT.md`
- Bucket inventory + path conventions → `STORAGE_BUCKET_REPORT.md`
- Migration deployment status → `MIGRATION_DEPLOYMENT_CHECKLIST.md`
