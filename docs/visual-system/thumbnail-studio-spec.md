# Thumbnail Studio — Spec Document

**Route:** `/admin/youtube/thumbnail-studio`

---

## Goal

Add a professional creation / review / edit / approval studio beside the existing working YouTube pipeline. Does not replace or break any current automation.

---

## Current Pipeline (Unchanged)

```
Inbox → Producer Assign → Metadata → Render → Upload
```

## New Optional Flow

```
Inbox → Producer Assign → Metadata → Thumbnail Studio → Approve → Render → Upload
```

**Core rule:** If no approved thumbnail exists, existing automatic thumbnail behavior continues unchanged. If approved thumbnail exists, worker uses approved thumbnail.

---

## Integration Point

File: `lib/youtube/renderer.ts` — already checks `thumbnailAssetId`:

```typescript
if (opts.thumbnailAssetId) {
  // use custom image → resize to 1920×1080
} else {
  // generate branded placeholder SVG
}
```

Thumbnail Studio sets `yt_upload_jobs.thumbnail_asset_id` on approval. Renderer reads this. **No change to renderer needed.**

---

## Admin Route

`app/admin/youtube/thumbnail-studio/page.tsx`

---

## Layout: 3-Panel Studio

### Left Panel — Job Queue
- Upload jobs not yet uploaded/cancelled
- Shows: song title, producer, job status
- Thumbnail status indicator (pending/draft/approved/skipped)
- Mode indicator (auto/generated/edited)

### Center Panel — Canvas Editor
- 16:9 preview div with selected version as background
- Text overlay controls:
  - Title text input
  - Font size slider (24–96px)
  - Text color picker
  - Stroke/outline color picker
  - Shadow toggle
  - Text position (TL/TR/BL/BR/Center)
  - Logo position (TL/TR/BL/BR/Off)
  - Overlay type (None/Black Gradient/Blue Vignette/Warm Vignette)
- Preset picker (NightWire preset cards)
- Action buttons: Save Draft, Approve, Skip/Auto

### Right Panel — AI Prompts + Versions
- Producer slug (from job)
- Mood dropdown
- Scene type dropdown
- Camera style dropdown
- Build Prompt button → constructs NightWire formula
- Prompt text area (editable before copy)
- Copy / Save to Library buttons
- "Paste into Midjourney → download → add URL below" guide
- Version grid (thumbnails, select/reject)
- Add Version by URL form

---

## Version Grid

- Shows all non-rejected versions for the project
- Click version to select it (appears in canvas preview)
- Reject button removes from selection pool (hidden, not deleted)
- Selected version = the one approved when "Approve" is clicked

---

## Preset Picker

NightWire presets:
1. **MindLoft** — loft/gold/flash/jazz
2. **Buffalo Noir** — VHS/cold-blue/Route 33
3. **Jazz Smoke** — 35mm/velvet/emotional
4. **Harlem Private Society** — editorial/warm/cultural

Applying a preset updates canvas defaults (overlay, text position, logo position, font size, colors).

---

## Approval Flow

When "Approve" is clicked:
1. Creates `assets` record with approved image URL
2. Creates `thumbnail_assets` record for the asset library
3. Updates `thumbnail_projects` → `status = 'approved'`
4. Updates `yt_upload_jobs`:
   - `thumbnail_asset_id` = assets record ID
   - `thumbnail_mode` = 'generated' | 'edited'
   - `thumbnail_status` = 'approved'
   - `thumbnail_project_id` = project ID

The renderer then uses `thumbnail_asset_id` automatically.

## Skip / Auto Fallback

When "Skip" is clicked:
- `thumbnail_mode` = 'auto'
- `thumbnail_status` = 'skipped'
- `thumbnail_asset_id` unchanged (null)
- Renderer generates branded placeholder (existing behavior)

---

## Database Tables Added

- `thumbnail_profiles` — per-producer visual identity
- `thumbnail_projects` — one per upload job
- `thumbnail_versions` — image variants per project
- `thumbnail_presets` — named style presets
- `thumbnail_prompts` — saved prompt library
- `thumbnail_assets` — curated asset library

Columns added to `yt_upload_jobs`:
- `thumbnail_mode text DEFAULT 'auto'`
- `thumbnail_status text DEFAULT 'pending'`
- `thumbnail_project_id uuid NULL`
- `thumbnail_prompt text NULL`

---

## Phase 2 Upgrades

- Auto A/B thumbnail testing with CTR measurement
- CTR learning engine (update `winner_bool` from analytics)
- Title + thumbnail pairing AI (score combinations)
- Trending style scanner
- Automatic Shorts cover creator
- Social pack generator (IG/X/playlist from same prompt)
- Real-time image generation API integration (replaces manual Midjourney workflow)
