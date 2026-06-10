# Phase A — Implementation Plan (no changes yet)

## 1. Files That Will Be Modified

| # | File | Action | Lines changed (approx) |
|---|---|---|---|
| 1 | `app/admin/releases/[slug]/edit/page.tsx` | **Modify** — add one new `<div>` block to the existing `<form>` with cover preview + upload button + URL fallback input | +18 lines |
| 2 | `app/actions/releases.ts` | **Modify** — `updateRelease()`: read `coverArtUrl` from FormData, add to update payload | +3 lines |
| 3 | `app/admin/releases/[slug]/edit/CoverArtField.tsx` | **New** — small client component mirroring `ArtistPhotoUpload.tsx` pattern; file input → `uploadAssetFile()` → sets hidden field | ~70 lines |

**Total impact:** 2 surgical edits + 1 new isolated client component. No migrations. No schema changes. No new tables. Fully reversible by reverting 3 files.

---

## 2. Current Release-Cover Architecture

**Storage column** — `releases.cover_art_url` (TEXT, nullable). One column; holds a public URL string.

**Mapper** — `lib/cms/mappers.ts:98` maps `r.cover_art_url` → `release.coverArtUrl` (camelCase) for use throughout the app.

**Read path** — Two consumers:
- `app/releases/[slug]/page.tsx:60-86` — hero image on the detail page, with first-letter typographic fallback when null.
- `components/cards/ReleaseCard.tsx:12-23` — grid cards, same fallback.

**Write paths today** — Three:
- CSV catalog import (`app/actions/catalog-import.ts:373, 401`) writes `cover_art_url` from CSV `artwork_url` column.
- Direct SQL / seed (none present — seed is intentionally empty).
- **Nothing else.** No admin UI form field, no upload button, no API route.

**Auth** — `requireAdmin()` gates all write actions; enforced in `app/actions/releases.ts:9`.

---

## 3. How Assets Are Currently Stored

**Storage bucket** — Single Supabase bucket `sumg-assets`, public-read.

**Bucket folder convention** — From `app/actions/assets.ts:145-148`:
```
images/       audio/        videos/
documents/    design/       archives/
artists/      artists/hero/ thumbnails/   archive/
```

**Path pattern** — `{folder}/{uuid}.{ext}` for general uploads; `artists/{artistId}.jpeg` for artist photos.

**`assets` table** — Every uploaded file gets a database row (`app/actions/assets.ts:168-181`):
- `id` (uuid), `type` (image/audio/video/document/design/archive)
- `url` (public URL — what we'd store on `releases.cover_art_url`)
- `filename`, `mime_type`, `size_bytes`
- `subcategory` (auto-detected from filename — `cover`, `thumbnail`, `artist_photo`, etc.)
- `tags`, `status`, `producer_slug`, `attached_to` (JSONB, currently unused for releases)

**Upload server action** — `uploadAssetFile(formData)` in `app/actions/assets.ts:131-211`:
- Accepts `file` and optional `folder` FormData fields
- Classifies, validates size, uploads to `sumg-assets`, creates `assets` row
- Returns `{ id, url, type }` on success or `{ error }` on failure

**Subcategory auto-detection** — `app/actions/assets.ts:106-113` already maps `/cover/i` filename pattern → `subcategory: "cover"`. So if we upload a file named `something-cover.jpg`, it auto-tags.

---

## 4. How Releases Currently Reference Artwork

**Connection model: by URL string, not by FK.**

- `releases.cover_art_url` holds a fully-qualified public Supabase Storage URL.
- There is **no** foreign key from `releases` to `assets`. They are decoupled.
- The asset row, if one exists, lives alongside but is not formally linked back to the release.

**Implications:**
- We can store *any* URL (Supabase-hosted, or external CDN, or a CSV-imported DistroKid artwork URL).
- We don't currently track "this asset was used as the cover for release X" anywhere in the DB.
- The same URL can be the cover for multiple releases (no uniqueness).

**Future-compat note:** When DistroKid/BMI/MLC imports land in Phase B, they write external artwork URLs straight into `cover_art_url`. The picker we add must NOT require an `assets` row to exist — it must accept any URL, and *optionally* call `uploadAssetFile()` to create one. This is what mirrors today's CSV import behavior.

---

## 5. Exact Code Changes — Connect Releases to Existing Assets

### 5a. `app/actions/releases.ts` — extend `updateRelease()`

```ts
export async function updateRelease(slug: string, formData: FormData) {
  await requireAdmin()

  const status      = formData.get("status")?.toString() ?? ""
  const releaseDate = formData.get("releaseDate")?.toString() ?? ""
  const accentColor = formData.get("accentColor")?.toString() ?? ""
  const spotifyUrl  = formData.get("spotifyUrl")?.toString().trim() ?? ""
  const coverArtUrl = formData.get("coverArtUrl")?.toString().trim() ?? ""   // ← NEW

  const { data: existing } = await supabase
    .from("releases")
    .select("dsp_links")
    .eq("slug", slug)
    .maybeSingle()

  const dspLinks = { ...(existing?.dsp_links ?? {}) }
  if (spotifyUrl) { dspLinks.spotify = spotifyUrl } else { delete dspLinks.spotify }

  const { error } = await supabase
    .from("releases")
    .update({
      status,
      release_date: releaseDate,
      accent_color: accentColor,
      dsp_links: dspLinks,
      cover_art_url: coverArtUrl || null,                                    // ← NEW
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug)

  if (error) throw new Error(error.message)

  revalidatePath("/admin/releases")
  revalidatePath(`/releases/${slug}`)
  redirect("/admin/releases")
}
```

That's 2 lines added (read + write), 1 line modified (update payload). Empty string normalizes to `null` so clearing the field works.

### 5b. New client component `app/admin/releases/[slug]/edit/CoverArtField.tsx`

Mirrors the existing `ArtistPhotoUpload.tsx` pattern (already known-good). Provides:
- A preview thumbnail (image or first-letter fallback).
- A hidden `<input name="coverArtUrl">` that the parent `<form>` reads.
- A file-picker button that calls `uploadAssetFile()` and writes the returned URL into the hidden input + preview.
- A text input below for manual URL paste (compat with CSV-style import URLs).

```tsx
"use client"

import { useRef, useState, useTransition } from "react"
import { uploadAssetFile } from "@/app/actions/assets"

export default function CoverArtField({
  initialUrl,
  releaseTitle,
}: {
  initialUrl: string | null
  releaseTitle: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string>(initialUrl ?? "")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    const fd = new FormData()
    fd.set("file", file)
    fd.set("folder", "release-covers")
    startTransition(async () => {
      const r = await uploadAssetFile(fd)
      if ("error" in r) setError(r.error)
      else setUrl(r.url)
      if (fileRef.current) fileRef.current.value = ""
    })
  }

  return (
    <div>
      <label className="block text-xs uppercase tracking-[0.2em] text-white/40 mb-2">Cover Art</label>
      <input type="hidden" name="coverArtUrl" value={url} />
      <div className="flex items-center gap-4">
        {url ? (
          <img src={url} alt="" className="w-24 h-24 rounded-xl object-cover border border-white/10" />
        ) : (
          <div className="w-24 h-24 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-3xl font-semibold text-white/40">
            {releaseTitle.charAt(0)}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isPending}
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-white/70 hover:border-white/40 hover:text-white disabled:opacity-50"
          >
            {isPending ? "Uploading…" : url ? "Replace" : "Upload Image"}
          </button>
          {url && (
            <button
              type="button"
              onClick={() => setUrl("")}
              className="text-left text-xs text-white/35 hover:text-white/60"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="…or paste a public URL"
        className="mt-3 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none"
      />
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
```

Key design notes for future-compat:
- The hidden input is named `coverArtUrl` → server action reads it identically whether the user uploaded a file OR pasted a CSV-style URL OR ran a DistroKid import.
- The `folder: "release-covers"` hint creates a clean folder in `sumg-assets`. (No code change needed in `uploadAssetFile` — it already accepts `folder` per `app/actions/assets.ts:149-150`.)
- The component does NOT require an `assets` row to exist for the field to work — it just writes a URL string. Compatible with imported URLs that have no asset record.

### 5c. `app/admin/releases/[slug]/edit/page.tsx` — insert one block in the form

Insert this between the existing "Status" block (line 44-52) and "Release Date" block (line 54-62):

```tsx
import CoverArtField from "./CoverArtField"
// …
<CoverArtField initialUrl={release.coverArtUrl ?? null} releaseTitle={release.title} />
```

That's it. The form already wraps everything, the `coverArtUrl` hidden input is automatically picked up by the existing `<form action={action}>`.

### Reversibility
Revert = `git checkout` three files. No DB state to undo. No data migration. No bucket reorg. Existing data is untouched (the new "release-covers" folder is created lazily on first upload).

---

# Phase B — Implementation Plan (preparation only)

## Scope
Add a complete, replayable, traceable music-data import pipeline covering DistroKid, BMI, Songtrust, SoundExchange, MLC, and manual CSV — all sharing one provenance model.

## B.1 — Schema Changes (single migration)

One migration file: `supabase/migrations/20260605000000_phase_b_imports.sql`. Additive only.

```sql
-- Per-row provenance: every imported row, before normalization
CREATE TABLE IF NOT EXISTS import_rows (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        uuid NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  row_index       integer NOT NULL,
  raw_data        jsonb NOT NULL,
  status          text NOT NULL,    -- 'created' | 'updated' | 'skipped' | 'conflict' | 'invalid' | 'pending_review'
  action          text,             -- 'import_as_new' | 'update_existing' | 'skip' | 'merge_later'
  matched_entity_type text,         -- 'song' | 'release' | 'artist' | 'publishing_work' | 'royalty_line'
  matched_entity_id   text,
  confidence      numeric,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON import_rows (batch_id);
CREATE INDEX ON import_rows (matched_entity_type, matched_entity_id);

-- Royalty persistence (so distro/SoundExchange/Songtrust/MLC rows survive past import)
CREATE TABLE IF NOT EXISTS royalty_statements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source          text NOT NULL,    -- 'distrokid' | 'bmi' | 'songtrust' | 'soundexchange' | 'mlc' | 'manual'
  import_batch_id uuid REFERENCES import_batches(id) ON DELETE SET NULL,
  filename        text,
  period_start    date,
  period_end      date,
  currency        text NOT NULL DEFAULT 'USD',
  gross_revenue   numeric(14,4),
  net_royalties   numeric(14,4),
  total_units     numeric(14,4),
  raw_summary     jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS royalty_line_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id    uuid NOT NULL REFERENCES royalty_statements(id) ON DELETE CASCADE,
  song_id         text REFERENCES songs(id) ON DELETE SET NULL,
  release_id      text REFERENCES releases(id) ON DELETE SET NULL,
  isrc            text,
  upc             text,
  iswc            text,
  dsp             text,
  territory       text,            -- ISO-3166-1 alpha-2
  units           numeric(14,4),
  amount          numeric(14,6),
  amount_currency text NOT NULL DEFAULT 'USD',
  period_start    date,
  period_end      date,
  raw_row         jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON royalty_line_items (statement_id);
CREATE INDEX ON royalty_line_items (song_id);
CREATE INDEX ON royalty_line_items (isrc);
CREATE INDEX ON royalty_line_items (dsp);
CREATE INDEX ON royalty_line_items (territory);

-- Provenance back-pointers on existing tables (additive, all nullable)
ALTER TABLE songs    ADD COLUMN IF NOT EXISTS import_batch_id uuid REFERENCES import_batches(id) ON DELETE SET NULL;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS import_batch_id uuid REFERENCES import_batches(id) ON DELETE SET NULL;
ALTER TABLE artists  ADD COLUMN IF NOT EXISTS import_batch_id uuid REFERENCES import_batches(id) ON DELETE SET NULL;

-- RLS — same policy pattern as import_batches (admin/editor/media_manager/release_manager)
ALTER TABLE import_rows         ENABLE ROW LEVEL SECURITY;
ALTER TABLE royalty_statements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE royalty_line_items  ENABLE ROW LEVEL SECURITY;
-- (policies created with same is_cms_role() check used elsewhere)
```

**No schema rewrites.** No changes to existing columns. All new tables, all new columns nullable.

## B.2 — File Map

| File | New/Modify | Purpose |
|---|---|---|
| `lib/imports/soundexchange.ts` | **New** | Parser — mirrors `bmi.ts`/`distro.ts` pattern |
| `lib/imports/songtrust.ts` | **New** | Parser — mechanical royalties |
| `lib/imports/mlc.ts` | **New** | Parser — US mechanical / blanket license |
| `lib/imports/distro.ts` | **Modify** | Output statements + line items, not just aggregated songs |
| `lib/imports/bmi.ts` | **Modify** | Add line-item emission for royalty rows (BMI statements have them too) |
| `lib/imports/types.ts` | **Modify** | Add `RoyaltyStatementInput`, `RoyaltyLineItemInput`, `ImportRowRecord` types |
| `lib/imports/column-mapper.ts` | **Modify** | Add heuristics for Songtrust + MLC + SoundExchange entity detection |
| `lib/imports/field-defs.ts` | **Modify** | Add field definitions for new source types |
| `app/actions/catalog-import.ts` | **Modify** | Write `import_batch_id` + `data_source` on every insert/update; persist `import_rows` |
| `app/actions/imports.ts` | **Modify** | Same provenance work for legacy distro/BMI actions; emit royalty statements |
| `app/actions/royalty-import.ts` | **New** | Pure royalty importer (distro/SX/Songtrust/MLC statements → `royalty_statements` + `royalty_line_items`) |
| `app/actions/imports-rollback.ts` | **New** | `rollbackBatch(batchId)` — deletes rows where `import_batch_id = ?` for each entity table; CASCADE handles `import_rows` and royalty rows |
| `lib/db/royalties.ts` | **Modify** | Read helpers — list statements, drilldown line items, filter by song/DSP/territory |
| `app/admin/imports/ImportClient.tsx` | **Modify** | Add tabs/source-selector for new types |
| `app/admin/imports/[batchId]/page.tsx` | **New** | Batch detail view with per-row drilldown + rollback button |
| `app/admin/royalties/page.tsx` | **New** | Statement list + filters |
| `app/admin/royalties/[id]/page.tsx` | **New** | Statement detail / line items |
| `supabase/migrations/20260605000000_phase_b_imports.sql` | **New** | Single migration described in B.1 |

## B.3 — Provenance Model (the unifying invariant)

Every write originating from an import MUST set:
- `data_source` — string source key (`'distrokid'`, `'bmi'`, `'songtrust'`, `'soundexchange'`, `'mlc'`, `'manual'`)
- `import_batch_id` — FK to `import_batches`
- Adds one `import_rows` row regardless of outcome (created/updated/skipped/conflict/invalid) — even errors are logged

Effect: **every fact in the catalog can answer "where did you come from and when?"** — and a single `rollbackBatch(id)` undoes any import cleanly.

## B.4 — Matching & Dedup Strategy

Existing fuzzy matching in `catalog-import.ts` stays. Per-source upgrades:
- **DistroKid** — ISRC primary, UPC secondary, title+artist fuzzy fallback. (Already implemented; will be reused.)
- **BMI** — ISWC primary, title+writer fuzzy. (Already implemented; will be extended for line items.)
- **Songtrust** — ISRC + ISWC pair, then title+artist+writer.
- **SoundExchange** — ISRC primary (it's neighboring-rights performance data, always ISRC-indexed).
- **MLC** — ISWC primary, title+writer fallback.

Order of precedence when sources conflict on the same field: `mlc > bmi > songtrust > soundexchange > distrokid > manual`. Lower-priority sources update only if the field is currently null OR `data_source` is lower priority. Implemented as a small helper in `lib/imports/precedence.ts` (new tiny file).

## B.5 — Per-Source Parser Contracts

Each parser exports the same shape:

```ts
export interface SourceParser<TRow> {
  detect(headers: string[]): boolean
  parse(headers: string[], rows: string[][]): TRow[]
  toCanonical(row: TRow): {
    songMatch?: { isrc?: string; iswc?: string; upc?: string; title?: string; artist?: string }
    statementRow?: RoyaltyLineItemInput
    publishingUpdate?: PublishingWorkPatch
  }
}
```

This lets `runRoyaltyImport()` orchestrate all five sources through one code path.

## B.6 — Rollback Semantics

`rollbackBatch(batchId)`:
1. Look up `import_batches` row; verify status != 'rolled_back'.
2. Within a single Supabase RPC (or sequential calls wrapped in a server action):
   - `DELETE FROM royalty_line_items WHERE statement_id IN (SELECT id FROM royalty_statements WHERE import_batch_id = $1)`
   - `DELETE FROM royalty_statements WHERE import_batch_id = $1`
   - For songs/releases/artists created by this batch (rows in `import_rows` with action=`import_as_new` and matched_entity_id set) → DELETE by id.
   - For rows updated by this batch → restore from `import_rows.raw_data` previous-state snapshot.
3. Mark `import_batches.status = 'rolled_back'`.

This requires `import_rows.raw_data` to capture **both** the imported row AND the prior DB state when status='updated' — easy to add at write time.

## B.7 — UI Workflow

`/admin/imports` (existing 5-step wizard) extends:
1. **Step 0 — Source selector** (new): Catalog / DistroKid / BMI / Songtrust / SoundExchange / MLC / Manual.
2. Steps 1–5 reuse existing flow (map → preview → conflicts → result).
3. After import: redirect to `/admin/imports/[batchId]` showing per-row results, errors, and a "Rollback Batch" button.
4. `/admin/royalties` is a separate read view: filterable statement list, statement detail, line-item drilldown.

## B.8 — Sequencing (recommended order)

1. Migration `20260605000000_phase_b_imports.sql` — additive, safe to ship alone.
2. Provenance backfill in `catalog-import.ts` (every write sets `data_source` + `import_batch_id`).
3. `import_rows` writes added everywhere — pure logging, no behavior change.
4. `royalty-import.ts` + DistroKid path (your most-used source).
5. SoundExchange parser.
6. Songtrust parser.
7. MLC parser.
8. `/admin/imports/[batchId]` + rollback action.
9. `/admin/royalties` read views.

Each step is independently deployable and reversible.

---

## What I'll Need From You Before Implementing Phase A

Just a go/no-go on the three-file Phase A change above. If approved, I'll implement it as a single commit (no migration, fully reversible) and then we can decide on Phase B sequencing separately.
