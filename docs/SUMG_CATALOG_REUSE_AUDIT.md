# SUMG Catalog Reuse Audit

**Status:** Documentation only, from repo state on branch `feat/catalog-command-center-foundation` (off `main` @ `2affc03`). This is the mandatory "audit first" deliverable — no domain code in `lib/catalog/` was written before this document existed.

Companion docs: `SUMG_CATALOG_COMMAND_CENTER_ARCHITECTURE.md` (target), `SUMG_CATALOG_PERSISTENCE_AUDIT.md` (table-by-table), `SUMG_CATALOG_SECURITY_AUDIT.md` (RLS/auth), `SUMG_CATALOG_IMPLEMENTATION_PLAN.md` (what this pass ships).

---

## 1. What "Catalog" means today

`/admin/catalog` (`app/admin/catalog/page.tsx`) is a **read-only aggregate dashboard**, not a data model of its own. It queries `getAllReleasesAdmin()`, `getAllSongs()`, `getArtists()`, `getProducers()` and renders: artist/release/song/producer counts, release breakdown by status (draft/scheduled/published/archived) and type (Single/EP/Album/Mixtape), song breakdown by status, ISRC-set count, audio-present count, explicit count, PRO-assigned count, lyrics-present count, releases/songs per artist, and the 8 most recently updated releases/songs. It owns no tables — it's a projection over `songs`, `releases`, `artists`, `producers`.

`/admin/command-center` (`app/admin/command-center/page.tsx`) is a **separate, second aggregate dashboard** — operational rather than catalog-shaped: active artist count, total songs, total streams, net income this month, YouTube-upload-today/queue/failed counts, audio-inbox-pending count, recent releases, recent import logs, and a quick-nav strip. `lib/db/commandPanel.ts` backs a *third*, more detailed operational view (producer/channel health, 30-day render calendar, failed-job panel, queue bottleneck panel) that is YouTube-render-pipeline-specific, not a general job orchestrator — despite the generic name, everything in it queries `yt_upload_jobs` / `yt_channels`.

**Conclusion:** there is no existing "Command Center" orchestration engine to extend or replace. There are three dashboards reading from real domain tables (`songs`, `releases`, `yt_upload_jobs`, `audio_inbox`, `import_logs`, `finance_transactions`). Part 20's Routing Desk and Part 15's Intake lifecycle have no existing generic backer — the closest analog is the `yt_upload_jobs` status pipeline (`pending → scheduled → needs_render → needs_asset → uploaded / failed`), which is a real, working state-machine precedent worth mirroring in shape (not code) for the catalog intake lifecycle.

## 2. CMS layer

`lib/cms/` is a **projection/mapping layer**, confirmed: `lib/cms/mappers.ts` converts snake_case DB rows to the camelCase `CMSArtist`/`CMSProducer`/`CMSBrand`/`CMSRelease`/`CMSSong` types in `lib/types.ts`; `lib/cms/index.ts` is the **public-site read path** — every function filters `status = 'published' AND is_visible = true` (and `publishAt <= now()` where present) before returning rows to public pages. This is exactly Part 25's "public website receives only approved projections" requirement, already implemented and correct. It should be preserved as-is; the canonical Work/Recording layer sits *underneath* it, not instead of it.

`lib/cms/readiness.ts` is a **weighted checklist scorer** (`getReleaseReadiness()`) — critical/warning/info severity, weighted 0–100 score, per-check pass/fail with detail strings. This is a real, working precedent for Part 20's Routing Desk / Part 9's Rights gating: **extend this pattern** (add a rights-readiness and policy-flag checklist) rather than inventing a new "recipe evaluation" engine from scratch.

**Discrepancy found:** `lib/types.ts`'s `CMSSong` doc-comment claims "When a release is published, all linked songs whose status is not archived are automatically set to published." No such cascade exists in code — `app/actions/releases.ts` and `app/actions/songs.ts` update `releases.status` and `songs.status` completely independently. This is aspirational documentation, not current behavior. Flagged so the future Work/Recording layer doesn't assume a cascade that isn't actually enforced today.

## 3. Songs / Releases schema (current canonical columns)

`songs`: `id, slug, title, artist_slug, artist_name, release_slug, release_name, producer_slugs(jsonb), genre, duration, audio_url, lyrics, is_explicit, track_number, status, is_visible, publish_at, featured_on_homepage, media_asset_id, created_at, updated_at` (base) + `dsp_links(jsonb), data_source, isrc, rights_metadata(jsonb), spotify_track_id, spotify_audio_features(jsonb), apple_song_id, apple_url, streams` (migrations).

`releases`: `id, slug, title, artist_slug, artist_name, featured_artist_slugs(jsonb), producer_slugs(jsonb), type, genre, release_date, publish_at, status, is_visible, featured_on_homepage, description, cover_art_url, tracklist(jsonb), streaming_links(jsonb), created_at, updated_at` (base) + `dsp_links(jsonb), provider_config(jsonb), data_source, rights_metadata(jsonb), distribution_record(jsonb), accent_color, streams, platforms(jsonb), apple_album_id, apple_url` (migrations).

**Known dead/write-only columns** (from `docs/phase-0/MEDIA_SYSTEM_AUDIT.md`, still true): `songs.media_asset_id` (read by mapper, never written), `producers.image_url` / `producers.banner_url` (written, never mapped). Not touched this pass.

**Work/Recording/Version precedent already in the schema:** none, directly — `songs` is a flat row per public-facing track, one `audio_url`, one `is_explicit` boolean. There is no existing concept of "this song has a clean AND an explicit master" or "this song has stems." The only multi-asset precedent anywhere in the repo is the thumbnail subsystem (`thumbnail_versions` — multiple image versions per `thumbnail_projects` row) and the render pipeline (`yt_upload_jobs.asset_id` pointing at a single rendered `assets` row). **Conclusion: Work/Recording/Version/Asset (Part 12) is a genuine, unavoidable schema gap** — nothing in the existing schema can be reinterpreted to cover it. The correct integration shape (per the mission brief's own instruction in Part 2 and Part 12) is additive: a new `catalog_recordings` / `catalog_asset_versions` layer that a `songs` row can optionally point at via a nullable FK, while `songs` keeps being the public/editorial projection. See §"Migration slices" in `SUMG_CATALOG_PERSISTENCE_AUDIT.md`.

## 4. Assets / Media / Audio Inbox / Storage

Already exhaustively audited in `docs/phase-0/MEDIA_SYSTEM_AUDIT.md` and `docs/phase-0/MEDIA_FLOW_MAP.md` (both still accurate; re-read rather than re-audited this pass). Summary relevant to this pass:

- **`assets`** is one flat table, one Supabase Storage bucket (`sumg-assets`), **public-read RLS** (confirmed this pass, see `SUMG_CATALOG_SECURITY_AUDIT.md` §1). It is the existing "media asset" system and should be **kept unchanged** for public media. It is **not reusable as-is for the Private Master Vault** (Part 11) — a private master inserted into `assets` today would be publicly readable via the anon key. The Vault needs either a new private bucket + new table, or a `visibility` column plus a policy rewrite; a policy rewrite is out of scope this pass (Part 33 disallows production RLS mutation beyond narrow proposals), so the vault is designed as a **new, additive, private-by-default surface** (`lib/catalog/vault.ts` interface + proposed `catalog_asset_versions` table), not a fork of `assets`.
- **Audio Inbox** (`audio_inbox` table + `app/actions/audioInbox.ts`) already implements exactly Part 15's intake shape in miniature: upload → `scoreAudioAsset()` (music-metadata extraction: BPM, duration, signal_data) → status progression (`new_asset → needs_review → needs_metadata → needs_thumbnail → needs_render → ready_to_schedule → scheduled → uploaded`) → eventually creates a `yt_upload_jobs` row. **This is the existing Catalog Intake system.** Part 15's DISCOVERED→ARCHIVED lifecycle is a generalization of this exact shape, not a parallel system — the recommendation is to treat `audio_inbox` as the YouTube-content-pipeline-specific intake queue that already exists, and design the catalog-wide intake lifecycle (`lib/catalog/intake.ts`, this pass) as the general state machine that a future pass can either (a) have `audio_inbox` grow into, or (b) sit above `audio_inbox` as a superset. No second intake table is proposed this pass.
- **No transactional writes** across `assets` + `thumbnail_assets` + `thumbnail_versions`, no dedup on upload (`upsert: false` everywhere except the renderer). Real bugs, out of scope to fix here (broad refactor, not narrow).

## 5. Imports / Distribution / Provider integrations / DSP

- **Import pipeline** (`lib/imports/*`, `app/actions/catalog-import.ts`, `app/actions/imports.ts`): CSV-based, supports songs/releases/artists/BMI publishing-works import. Conflict detection is fuzzy-title/artist scoring (`conflict-detector.ts`) with four buckets: `new | exact_match | possible_match (≥0.80, skip) | conflict (0.60–0.79, merge_later) | invalid`. Provenance exists but is split across two overlapping tables: `import_logs` (older, `import_type` free string, **open RLS** `USING(true)` both read and write) and `import_batches` (newer, richer counts, admin-role RLS, used by `catalog-import.ts`). **These two tables are themselves a reuse/consolidation case** — `import_batches` is the one to keep extending; `import_logs` is legacy and should not gain new writers. Per-row provenance (`import_rows`, individual row outcomes with rollback capability) does **not** exist yet — this matches the already-written `docs/audits/PHASE_B_IMPORT_PLAN.md` §B.1, which proposes exactly this gap as new tables. Not duplicated by this pass.
- **Distribution tracking** is `releases.distribution_record` (jsonb: `distributor, submissionStatus, deliveryStatus, liveStatus, scheduledDate, dspCoverage[], upc, distroReferenceId, distroNotes, source, lastSynced`) — **manual/notes-only**, no real distributor API integration exists. `provider_config` (jsonb, also on `artists`) is a similar manual-notes bag (`distributor, pro, publishingAdmin, isrc, upc, submissionStatus, providerNotes, providerLinks`). Both are reasonable as-is for a "founder enters what DistroKid's dashboard says" workflow; Part 23's Destination Assignment matrix is a stricter, state-machine version of the same idea and should be designed as a **new, additive** concept (`catalog_destination_assignments`) rather than trying to retrofit a state machine onto a free-form jsonb bag — but `distribution_record` remains the reasonable source for the *existing* release-level distribution UI and is not deprecated.
- **DSP integrations inventory:** Spotify (read-only enrichment, Client Credentials app-level auth, no per-user OAuth, no push) · Apple Music (read-only enrichment, developer JWT signed server-side, no push) · Shopify (storefront read via public token + admin token for order management, commerce-scoped not catalog-scoped) · YouTube (the **only** genuine push/write integration — full OAuth2, refresh token stored per-channel on `yt_channels`, plaintext — see security audit). **`yt_channels`'s OAuth columns are the one existing precedent for Part 17's `provider_connections` design**, and they prove the concept (per-entity connection status, cadence, health) while also demonstrating the gap Part 17 is meant to fix (`credential_ref` indirection instead of a raw secret column). No generalized `provider_connections` table exists yet — genuine gap, designed but **not created** this pass (Part 33 disallows new source-account connections).
- **No cron/worker-triggered sync job pattern exists for Spotify/Apple Music** — those are on-demand, triggered from admin actions (e.g. `backfillCoverArtFromSpotify`). Only the YouTube render/upload pipeline (`worker/`) has a true background worker.

## 6. Rights / Contracts / Contributors

- **`contracts`** table (`type`: recording/distribution/sync/publishing/management/merchandise/brand_deal/nda; `status`: draft/sent/signed/expired/void) is a real, working contract-lifecycle tracker — parties via free-text `counterparty`, dates, notes. It does **not** drive `rights_metadata.compositionStatus`/`registrationStatus` — no code links a signed sync contract to a rights-state flip. That link is a genuine gap (Part 9), and the right fix is additive (a `catalog_rights_records` row can *reference* a `contracts.id` as evidence), not a rewrite of `contracts`.
- **`publishing_works`** table (ISWC, `writers`/`publishers`/`splits` all jsonb, `pro`, `status`: unregistered/pending/registered) already covers most of Part 9's composition-side rights fields (ISWC, PRO, songwriter splits) and is the strongest existing reuse candidate for the rights layer's composition side.
- **`contributors`** table (name, email, type, `royalty_eligible`, `artist_slug`, bio) is a **general contributor roster**, not a per-song credit/split record. This **overlaps but does not duplicate** `RightsMetadata.songwriterCredits` (per-song, has `splitPct`/`ipi`/`pro`) and `publishing_works.writers` (per-work jsonb). Three places a songwriter's name can live today with no FK between them. Flagged as a consolidation target for a future pass; not touched here (broad refactor).
- **Rights state today** is `RightsStatus = draft | pending | registered | issue` (`lib/types.ts`) — a *registration-lifecycle* enum, not a *permission* enum. **Part 9's target model (`unknown | under_review | cleared | restricted | denied | expired`) has zero precedent in the current code** — this is a genuine, confirmed new concept, not a rename of something that exists. Designed this pass (`lib/catalog/rights.ts`), not migrated live.
- **Lyrics** (`lib/db/lyrics.ts`, `lib/types/lyrics.ts`) are stored as plain text; no AI-training-permission flag exists anywhere on songs, releases, or lyrics today. Part 10's `DO_NOT_TRAIN_AI` flag is entirely new.
- **`documents`** table (category incl. `legal`, status incl. `needs_review`/`rejected`, optional `contract_id` FK) is generic file-metadata storage, already suitable as rights-evidence storage (a rights record can reference a `documents.id`) without changes — no new "evidence" table needed.

## 6a. Content Generation

`app/actions/contentGen.ts::generateMarketingCopy()` is a single stateless Server Action: `requireAdmin()` → Anthropic Messages API call with a fixed system prompt → parses a JSON blob (IG caption, TikTok caption, X post, YouTube description, hashtags, press release) → returns it directly to the caller. **No backing table exists anywhere** — confirmed via full-repo grep for `content_gen`/`content-gen` against `lib/supabase/schema.sql` and every file in `supabase/migrations/`. Nothing is persisted; the admin UI (`app/admin/content-gen/`) holds the result in client state only. This is the simplest system audited this pass: a pure prompt-in/JSON-out utility, not a data model. **No reuse conflict is possible** because there is nothing stateful to reuse, extend, or duplicate. If a future pass wants generated marketing copy to become catalog-attached (e.g. an `CatalogEditorialDecision` or a `CatalogMetadataValue` with `authority: suggestion`, `source: ai_inferred`), that is new, additive persistence — not a rewrite of `contentGen.ts`, which stays as the generation call.

## 7. Auth / RLS

See `SUMG_CATALOG_SECURITY_AUDIT.md` for the full breakdown. Headline reuse finding: role check is JWT-claim-based (`app_metadata.role`), enforced at **two layers** — `requireAdmin()`/`isCmsRole()` in server actions, and mirrored `is_cms_role()`/`is_publisher_role()` SQL functions in per-operation RLS policies on `songs`/`releases` (select/insert/update/delete split, with a publish-gate: non-publisher CMS roles can only write non-published/non-visible rows). This is a **more sophisticated RLS pattern than the mission brief assumed** — not just "server actions gate everything," genuine DB-level defense in depth already exists for the two most important tables. Part 4's capability vocabulary (`catalog.read`, `assets.upload`, etc.) has no precedent — six coarse roles only — and is designed as a mapping/proposal this pass, not implemented (Part 4 explicitly says don't replace current RBAC unless necessary).

## 8. Reuse Matrix

| Concept | Existing implementation | Keep | Extend | Wrap | Deprecate | New required? | Why |
|---|---|---|---|---|---|---|---|
| Catalog aggregate view | `/admin/catalog` | ✅ | ✅ (add links to new foundation routes) | | | No | Already a correct read-only projection |
| Songs (public/editorial projection) | `songs` table + CMS layer | ✅ | | | | No | Part 2 explicitly says keep as projection |
| Releases | `releases` table + CMS layer | ✅ | | | | No | Same |
| Work / Recording / Version | — | | | | | **Yes** | No existing multi-version-per-track concept anywhere |
| Asset (public media) | `assets` + `sumg-assets` bucket | ✅ | | | | No | Correct for public media, keep unchanged |
| Private Master Vault | — | | | | | **Yes** | `assets` is public-read by design; can't host private masters |
| Audio Inbox / Intake | `audio_inbox` + `app/actions/audioInbox.ts` | ✅ | | ✅ (generalize its lifecycle shape) | | No (this pass) | Real, working intake precedent for YT pipeline |
| Import pipeline | `lib/imports/*`, `catalog-import.ts` | ✅ | ✅ (per-row provenance, per PHASE_B plan) | | | No | Working conflict detection, just needs provenance depth |
| Import logging | `import_batches` | ✅ | ✅ | | `import_logs` (legacy, open RLS) | No | Two overlapping tables; converge on the newer one |
| Distribution tracking | `releases.distribution_record` (jsonb) | ✅ | | ✅ (wrap with typed helpers) | | Partially — Part 23's state machine is additive | Manual jsonb bag works for current UI; state machine is a new layer above it |
| Provider connections | `yt_channels.oauth_*` (plaintext) | | | | | **Yes** (design only) | Proves the concept, exposes the exact gap Part 17 fixes |
| Rights (composition side) | `publishing_works` | ✅ | ✅ | | | No | Covers ISWC/PRO/splits already |
| Rights (permission state) | — | | | | | **Yes** | Zero precedent; registration-lifecycle enum ≠ permission enum |
| Hard policy flags | — | | | | | **Yes** | Zero precedent |
| Contracts | `contracts` table | ✅ | | ✅ (link as rights evidence) | | No | Real, working; just not yet linked to rights state |
| Contributors | `contributors` table | ✅ | | | | No (consolidate later) | Overlaps `rights_metadata.songwriterCredits`; flagged, not fixed |
| Rights evidence storage | `documents` table | ✅ | | ✅ (reference from rights records) | | No | Already generic enough |
| Command Center (orchestration) | — (3 dashboards, no orchestrator) | | | | | **Yes** (design only) | No existing job/orchestration engine to extend |
| Editorial readiness gating | `lib/cms/readiness.ts` | ✅ | ✅ (rights/policy checklist items) | | | No | Working weighted-checklist pattern, extend don't replace |
| Admin auth / RBAC | `lib/auth.ts` + RLS | ✅ | | ✅ (capability mapping, design only) | | No (this pass) | Sophisticated two-layer pattern already; don't replace |
| Provenance / authority tiers | — | | | | | **Yes** | Zero precedent (jsonb `data_source` is a single free string, not a tiered model) |
| Content generation | `app/actions/contentGen.ts` (stateless Anthropic call) | ✅ | | | | No | No backing table, nothing to duplicate; future catalog-attachment would be additive |

## 9. Duplicated systems explicitly avoided this pass

- No second intake/audio-review queue — `audio_inbox` stays the intake system for its domain.
- No second asset table for public media — `assets` stays.
- No second import/conflict-detection engine — `lib/imports/*` stays, only provenance depth is a gap.
- No second RBAC/role system — `lib/auth.ts` + existing RLS pattern stays; only a capability *mapping* is designed, not a new enforcement mechanism.
- No rewrite of `distribution_record`/`provider_config` — kept as the manual-entry source of truth for current release UI; Destination Assignment is additive, not a replacement.
