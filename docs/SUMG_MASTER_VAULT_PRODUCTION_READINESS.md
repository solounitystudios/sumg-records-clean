# SUMG Master Vault — Production Readiness

**Status:** Read-only production verification, 2026-09-09, against `yisxnwbsnzxjnmzpstzj`. No bucket was created, modified, or deleted. No object was uploaded, downloaded, or deleted. Object *metadata* (name, size, MIME type, timestamps) was queried via `storage.objects`; no object content and no signed/public URL was ever fetched or printed.

---

## 1. Current storage — production reality

Two buckets exist:

| Bucket | Public? | Objects | Created | Referenced by this repo's code? |
|---|---|---|---|---|
| `sumg-assets` | **true** | 26 | 2026-04-19 | Yes — every upload path in `app/actions/*.ts` / `lib/youtube/renderer.ts` |
| `music` | **false** | 1 | 2026-04-27 | **No — zero references anywhere in the repo** |

`storage.objects` has **zero RLS policies** for either bucket (confirmed via `pg_policies` on `schemaname='storage', tablename='objects'`). For the public bucket this doesn't matter — Supabase serves public-bucket objects via an unauthenticated `/storage/v1/object/public/...` URL convention regardless of `storage.objects` RLS. For the private `music` bucket, zero policies means the single object in it is reachable **only** via the service-role key or a server-generated signed URL — nothing anon/authenticated can list or read it today. This is the correct default-deny state for a private bucket, and it happens to already be true, apparently by omission rather than deliberate design (no code references the bucket at all).

## 2. What's actually in `sumg-assets` today

27 objects total under folders `artists/`, `artists/hero/`, `audio/`, `renders/`, `thumbnails/`, `release-covers/`. Of note: **9 files under `audio/` are `audio/mpeg`, 2.6–4.4MB each**, created between 2026-04-29 and 2026-05-02. `songs.audio_url` has **zero non-null rows in production right now** (`select count(*) from songs where audio_url is not null` → 0). So these 9 audio files are orphaned test/dev uploads: they exist in the **public** bucket, are technically fetchable by anyone who has or guesses the exact UUID filename (security through obscurity, not access control — this is exactly how a public bucket works), but are not currently linked from, or discoverable via, any live song record or public page. No file content was inspected — only filenames, sizes, and MIME types.

**This is the concrete, current-state argument for the Private Master Vault living outside `sumg-assets` entirely, not a hypothetical one:** audio content is already sitting in the public bucket today, unreferenced, purely because there has never been a private place to put it. It's not currently a live exposure of a *released* or *rights-sensitive* master (no song row points at it, and it looks like dev/test material based on the upload pattern — a burst of uploads over ~3 days in early testing), but it is real evidence that "just use `sumg-assets`" is not a safe default, and that the orphaned files should eventually be reviewed and either deleted or migrated into the vault by a human who knows what they actually are. **Not touched in this pass.**

## 3. The `music` bucket

A **private** bucket named `music` already exists, created 2026-04-27, containing one object: `done.mp3` (audio/mpeg, ~2.9MB, uploaded 2026-04-27 and never touched since). Nothing in this repository's code — no server action, no `lib/` module, no migration comment — references a bucket called `music`. Given the private-by-default setting and the filename, this reads as a manual one-off test (someone checking that a private bucket + upload works) rather than infrastructure anything currently depends on.

**Recommendation:** don't assume this bucket is "the vault" and don't build against it silently. If a future pass wants to reuse it, that should be a deliberate decision (confirm with whoever created it, then formally adopt the name and wire policies to it) — not an accidental dependency on a bucket that happens to already exist. See §5 for the naming recommendation either way.

## 4. Signed URLs

No evidence of signed-URL usage anywhere in the current codebase (`grep` for `createSignedUrl` across `app/`, `lib/`, `worker/` returns nothing) — every current storage read is either a public-bucket public URL or a service-role direct fetch. The `MasterVault` interface shipped in PR #21 (`lib/catalog/vault.ts::getSignedReadUrl`) would be the first thing in this codebase to actually generate one.

## 5. Recommended V1 provider decision

**Decision: use Supabase Storage, a new private bucket, not an external object store.**

Per the preferred decision order in the task brief:

1. **Can existing Supabase Storage support a new private bucket safely?** Yes. Supabase Storage buckets support `public: false` (default-deny, confirmed already working correctly for the existing `music` bucket with zero policies) plus per-bucket RLS policies on `storage.objects`, and `createSignedUrl()` for time-limited read access — this is exactly the shape `MasterVault` needs (`putOriginal`/`putDerivative`/`getSignedReadUrl`/`verifyObject`/`exists`/`archive`/`getObjectMetadata`).
2. **Is that enough for V1?** Yes. V1 is "one manually ingested real master, admin-only, no distribution, no PersonaWorks." A single private bucket with CMS-role-gated `storage.objects` policies (mirroring the exact pattern already used correctly on every other admin-only table in this project) covers it completely.
3. **Is an external store (R2/S3) necessary now?** No. Nothing in this pass's target milestone needs multi-region replication, a CDN in front of private objects, or a different pricing model — those are real reasons to eventually consider R2/S3, but none apply to "verify one upload works end to end." Introducing a second storage provider now would mean two credential sets, two failure domains, and two things to audit, for zero V1 benefit. `MasterVault`'s interface (already provider-neutral, shipped in PR #21) is exactly what keeps this decision reversible later — a second implementation can be added behind the same interface without touching call sites.

### Recommended V1 configuration (not created in this pass)

| Setting | Recommendation | Why |
|---|---|---|
| Provider | Supabase Storage (same project, `yisxnwbsnzxjnmzpstzj`) | No new infrastructure, no new credentials, reuses the existing service-role write path every other upload already uses |
| Bucket name | `sumg-master-vault` (new — do not silently repurpose the existing unreferenced `music` bucket without a deliberate decision, see §3) | Self-describing, avoids colliding with the ambiguous existing `music` bucket |
| `public` | `false` | Private by default per Part 11 |
| `storage.objects` policy | CMS-role-gated (mirror `is_cms_role()` / the inline JWT-array check already used everywhere else), no public/anon policy at all | Matches the existing, correct pattern on every other admin-only table |
| Object-key convention | `{version_kind}/{asset_version_id}.{ext}` e.g. `master/3f2a.../3f2a....wav` — never a human-guessable slug, never the original filename | Opaque, matches `CatalogAssetVersion.vaultObjectRef` being an opaque pointer per `lib/catalog/vault.ts` |
| Signed URL TTL | 300 seconds (5 min) for admin playback/download in the review UI | Short enough that a leaked link expires fast, long enough to actually load a multi-minute audio file over a normal connection |
| Max upload size | 250MB per object | Comfortably covers uncompressed WAV masters for a typical song length (a 5-minute 24-bit/48kHz stereo WAV is ~86MB); leaves headroom without inviting arbitrary large uploads |
| Accepted MIME/container | `audio/wav`, `audio/x-wav`, `audio/flac`, `audio/aiff`, `audio/mpeg` (mp3, for reference/non-master uploads only) | Matches what `music-metadata` (already a dependency) can reliably extract technical facts from |
| Archive behavior | Move object to an `archive/` prefix within the same bucket (not delete, not a separate bucket) on `archive()` | Simplest reversible v1 behavior; matches `MasterVault.archive()`'s contract in `lib/catalog/vault.ts` |
| Retention | No automatic deletion, ever, in V1 — retention policy is a human/founder decision, not a system default | Matches Part 31's "never auto-delete" rule |
| Secondary backup | Deferred — not needed until real masters exist. When it matters, revisit as a second `MasterVault` implementation (e.g., a periodic export to a second provider) behind the same interface, not a V1 requirement | No real data exists yet (production `songs`/`assets` are empty) — building a backup story for zero real masters is premature |

## 6. Bucket created this pass

**NO.** This document is a recommendation for a future pass, not an action taken now.
