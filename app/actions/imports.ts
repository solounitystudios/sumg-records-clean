"use server"

import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"
import { parseCSVText, csvToObjects } from "@/lib/imports/csv"
import { parseBMIRows, bmiStatusToRightsStatus } from "@/lib/imports/bmi"
import { parseDistroRows, type DistroRow } from "@/lib/imports/distro"
import { slugify } from "@/lib/imports/conflict-detector"

export type ImportType = "bmi" | "distro" | "soundexchange"

export interface ImportResult {
  importType: ImportType
  totalRows: number
  matched: number
  created: number
  updated: number
  skipped: number
  errors: string[]
  logId: string | null
  updatedEntities?: { id: string; title: string; slug?: string }[]
  // distro import breakdown
  createdArtists?: number
  createdReleases?: number
  createdSongs?: number
  updatedSongs?: number
  skippedReasons?: string[]
  /** First 20 parsed rows — shown in the import UI for column-mapping verification */
  parsedPreview?: { title: string; artistName: string | null; isrc: string | null; artistSlug: string | null }[]
}

// ─── BMI Import ───────────────────────────────────────────────────────────────

export async function processBMIImport(formData: FormData): Promise<ImportResult> {
  await requireAdmin()

  const file = formData.get("file")
  if (!(file instanceof File)) return errorResult("bmi", "No file provided.")

  const text = await file.text()
  const parsed = parseCSVText(text)

  if (parsed.headers.length === 0) return errorResult("bmi", "Could not parse CSV headers.")

  const works = parseBMIRows(parsed.headers, parsed.rows)
  if (works.length === 0) return errorResult("bmi", "No valid rows found in the BMI export.")

  let matched = 0, updated = 0, created = 0, skipped = 0
  const errors: string[] = []
  const updatedEntities: { id: string; title: string; slug?: string }[] = []

  for (const work of works) {
    if (!work.title) { skipped++; continue }

    try {
      const { data: existing } = await supabase
        .from("songs")
        .select("id, rights_metadata, title, slug, artist_slug, release_slug")
        .ilike("title", work.title)
        .limit(1)
        .maybeSingle()

      const rightsUpdate = {
        pro: "BMI",
        publisher: work.publisherName ?? undefined,
        ipiCae: work.ipiCae ?? undefined,
        compositionStatus: bmiStatusToRightsStatus(work.registrationStatus),
        bmiWorkUrl: work.bmiWorkId
          ? `https://repertoire.bmi.com/search/work?workId=${work.bmiWorkId}`
          : undefined,
        songwriterCredits: work.writerName
          ? [{ name: work.writerName, role: "Composer", share: work.writerShare ?? undefined, pro: "BMI" as const }]
          : undefined,
      }

      if (existing) {
        matched++
        const merged = applyDefined(
          (existing.rights_metadata ?? {}) as Record<string, unknown>,
          rightsUpdate as Record<string, unknown>,
        )
        const { error } = await supabase
          .from("songs")
          .update({ rights_metadata: merged, updated_at: new Date().toISOString() })
          .eq("id", existing.id)

        if (error) { errors.push(`Update failed for "${work.title}": ${error.message}`); skipped++; continue }

        updated++
        updatedEntities.push({ id: existing.id, title: existing.title, slug: (existing as { slug?: string }).slug })

        const pwResult = await upsertPublishingWorkForBmi({
          songId:         existing.id,
          songTitle:      existing.title,
          artistSlug:     (existing as { artist_slug?: string | null }).artist_slug ?? null,
          releaseSlug:    (existing as { release_slug?: string | null }).release_slug ?? null,
          iswc:           work.iswc ?? "",
          publisherName:  work.publisherName ?? null,
          writerName:     work.writerName ?? null,
          status:         bmiStatusToPublishingStatus(work.registrationStatus),
        })
        if (pwResult.error) {
          errors.push(`Publishing link warning for "${work.title}": ${pwResult.error}`)
        }
      } else {
        skipped++
      }
    } catch (e) {
      errors.push(`Error processing "${work.title}": ${String(e)}`)
      skipped++
    }
  }

  const logId = await saveImportLog("bmi", file.name, works.length, matched, updated, created, skipped, errors)

  revalidatePath("/admin/imports")
  revalidatePath("/admin/rights")
  revalidatePath("/admin/integrity")

  return { importType: "bmi", totalRows: works.length, matched, created, updated, skipped, errors, logId, updatedEntities }
}

// ─── Distro Import ────────────────────────────────────────────────────────────

export async function processDistroImport(formData: FormData): Promise<ImportResult> {
  await requireAdmin()

  const file = formData.get("file")
  if (!(file instanceof File)) return errorResult("distro", "No file provided.")

  const text = await file.text()
  const parsed = parseCSVText(text)
  if (parsed.headers.length === 0) return errorResult("distro", "Could not parse CSV headers.")

  const rows = parseDistroRows(parsed.headers, parsed.rows)
  if (rows.length === 0) return errorResult("distro", "No valid rows found.")

  // DistroKid produces one row per store × country × period for the same track.
  // Deduplicate by ISRC (preferred) or normalized title so we don't create
  // duplicate songs. Streams and earnings are aggregated across rows.
  type AggRow = DistroRow & { rowCount: number }
  const songMap = new Map<string, AggRow>()
  for (const row of rows) {
    const key = row.isrc?.toUpperCase().trim() || distroNormalize(row.title)
    if (!key) continue
    const prev = songMap.get(key)
    if (prev) {
      prev.streams     = (prev.streams     ?? 0) + (row.streams     ?? 0)
      prev.earningsUsd = (prev.earningsUsd ?? 0) + (row.earningsUsd ?? 0)
      prev.rowCount++
    } else {
      songMap.set(key, { ...row, rowCount: 1 })
    }
  }

  let matched = 0, updated = 0, created = 0, skipped = 0
  let createdArtists = 0, createdReleases = 0, createdSongs = 0, updatedSongs = 0
  const errors: string[] = []
  const skippedReasons: string[] = []
  const updatedEntities: { id: string; title: string; slug?: string }[] = []

  // Build a preview of the first 20 deduplicated rows for column-mapping verification.
  // artistSlug is filled in during processing; we pre-populate title/artistName/isrc here.
  const parsedPreview: { title: string; artistName: string | null; isrc: string | null; artistSlug: string | null }[] = []
  let previewIdx = 0

  for (const [, row] of songMap) {
    if (!row.title?.trim() && !row.isrc?.trim()) {
      skipped++
      skippedReasons.push("No title or ISRC")
      continue
    }

    try {
      // 1. Find or create artist
      let artistSlug: string | null = null
      const artistName = row.artistName?.trim() ?? null
      if (artistName) {
        const ar = await distroFindOrCreateArtist(artistName)
        artistSlug = ar.slug
        if (ar.created) createdArtists++
      }

      // Capture first 20 rows for the debug preview (includes resolved artistSlug)
      if (previewIdx < 20) {
        parsedPreview.push({ title: row.title ?? "", artistName, isrc: row.isrc ?? null, artistSlug })
        previewIdx++
      }

      // 2. Find or create release.
      // DistroKid's "Song/Album" column holds the RELEASE title — which equals the track
      // title for standalone singles. We only treat albumTitle as album context when it
      // differs from the track title (case-insensitive). Otherwise fall through to the
      // single path so we don't create Album-type releases for standalone tracks.
      let releaseSlug: string | null = null
      const albumTitleRaw = row.albumTitle?.trim() ?? null
      const titleRaw      = row.title?.trim() ?? null
      const albumIsDifferentFromTitle =
        !!albumTitleRaw && albumTitleRaw.toLowerCase() !== (titleRaw ?? "").toLowerCase()
      const hasAlbumContext = !!row.upc?.trim() || albumIsDifferentFromTitle
      const rel = await distroFindOrCreateRelease({
        upc:          row.upc?.trim()               ?? null,
        albumTitle:   albumIsDifferentFromTitle ? albumTitleRaw : null,
        fallbackTitle: hasAlbumContext ? null : (titleRaw ?? null),
        artistName,
        artistSlug,
      })
      if (rel) {
        releaseSlug = rel.slug
        if (rel.created) createdReleases++
      }

      // 3. Match by ISRC
      if (row.isrc?.trim()) {
        const isrc = row.isrc.trim().toUpperCase()
        const { data: existing } = await supabase
          .from("songs")
          .select("id, title, slug, isrc, artist_slug, release_slug")
          .eq("isrc", isrc)
          .limit(1)
          .maybeSingle()

        if (existing) {
          matched++
          const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
          if (!(existing as { artist_slug?: string }).artist_slug  && artistSlug)  patch.artist_slug  = artistSlug
          if (!(existing as { release_slug?: string }).release_slug && releaseSlug) patch.release_slug = releaseSlug
          if (Object.keys(patch).length > 1) {
            await supabase.from("songs").update(patch).eq("id", (existing as { id: string }).id)
            updated++; updatedSongs++
            updatedEntities.push({ id: (existing as { id: string }).id, title: (existing as { title: string }).title, slug: (existing as { slug?: string }).slug ?? undefined })
          }
          continue
        }
      }

      // 4. Match by title (ilike)
      if (row.title?.trim()) {
        const { data: existing } = await supabase
          .from("songs")
          .select("id, title, slug, isrc, artist_slug, release_slug")
          .ilike("title", row.title.trim())
          .limit(1)
          .maybeSingle()

        if (existing) {
          matched++
          const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
          if (!(existing as { isrc?: string }).isrc          && row.isrc)    patch.isrc         = row.isrc.trim().toUpperCase()
          if (!(existing as { artist_slug?: string }).artist_slug  && artistSlug)  patch.artist_slug  = artistSlug
          if (!(existing as { release_slug?: string }).release_slug && releaseSlug) patch.release_slug = releaseSlug
          if (Object.keys(patch).length > 1) {
            await supabase.from("songs").update(patch).eq("id", (existing as { id: string }).id)
            updated++; updatedSongs++
            updatedEntities.push({ id: (existing as { id: string }).id, title: (existing as { title: string }).title, slug: (existing as { slug?: string }).slug ?? undefined })
          }
          continue
        }
      }

      // 5. No match — create new song
      if (!row.title?.trim()) {
        skipped++
        skippedReasons.push(`No title (ISRC: ${row.isrc ?? "none"}) — cannot create`)
        continue
      }

      const newSong = await distroCreateSong({
        title:        row.title.trim(),
        artistName:   artistName ?? "",
        artistSlug,
        releaseSlug,
        releaseTitle: albumIsDifferentFromTitle ? albumTitleRaw : (releaseSlug ? titleRaw : null),
        isrc:         row.isrc?.trim().toUpperCase() ?? null,
        upc:          row.upc?.trim() ?? null,
      })
      created++; createdSongs++
      updatedEntities.push({ id: newSong.id, title: newSong.title, slug: newSong.slug })

    } catch (e) {
      errors.push(`"${row.title ?? row.isrc}": ${e instanceof Error ? e.message : String(e)}`)
      skipped++
    }
  }

  const logId = await saveImportLog("distro", file.name, rows.length, matched, updated, created, skipped, errors)

  revalidatePath("/admin/imports")
  revalidatePath("/admin/songs")
  revalidatePath("/admin/artists")
  revalidatePath("/admin/releases")

  return {
    importType: "distro",
    totalRows: rows.length,
    matched,
    created,
    updated,
    skipped,
    errors,
    logId,
    updatedEntities,
    createdArtists,
    createdReleases,
    createdSongs,
    updatedSongs,
    skippedReasons,
    parsedPreview,
  }
}

// ─── Distro helpers ───────────────────────────────────────────────────────────

function distroNormalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "").trim()
}

async function distroUniqueSlug(base: string, table: string): Promise<string> {
  let candidate = base || "untitled"
  for (let attempt = 0; attempt < 20; attempt++) {
    const { data } = await supabase.from(table).select("id").eq("slug", candidate).limit(1).maybeSingle()
    if (!data) return candidate
    candidate = `${base}-${attempt + 2}`
  }
  return `${base}-${Date.now()}`
}

async function distroFindOrCreateArtist(name: string): Promise<{ slug: string; created: boolean }> {
  // Exact case-insensitive match first
  const { data } = await supabase.from("artists").select("slug, name").ilike("name", name).limit(1).maybeSingle()
  if (data) return { slug: (data as { slug: string }).slug, created: false }

  // Normalized match to catch spacing/punctuation variants ("Mar Rick" == "Marrick")
  const norm = distroNormalize(name)
  const { data: all } = await supabase.from("artists").select("slug, name")
  if (all) {
    const match = (all as { slug: string; name: string }[]).find(
      (a) => distroNormalize(a.name) === norm,
    )
    if (match) return { slug: match.slug, created: false }
  }

  const slug = await distroUniqueSlug(slugify(name), "artists")
  const { data: created, error } = await supabase
    .from("artists")
    .insert({
      name, slug, status: "active", bio: "", genre: "", role: "artist",
      featured: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    })
    .select("slug").single()
  if (error) throw new Error(`Create artist "${name}": ${error.message}`)
  return { slug: (created as { slug: string }).slug, created: true }
}

interface DistroReleaseInput {
  upc:           string | null
  albumTitle:    string | null
  /** Song title used as release title when there is no album context (creates a Single). */
  fallbackTitle: string | null
  artistName:    string | null
  artistSlug:    string | null
}

async function distroFindOrCreateRelease(
  input: DistroReleaseInput,
): Promise<{ slug: string; created: boolean } | null> {
  if (input.upc) {
    const { data } = await supabase.from("releases").select("slug").eq("upc", input.upc).limit(1).maybeSingle()
    if (data) return { slug: (data as { slug: string }).slug, created: false }
  }

  const title    = input.albumTitle ?? input.fallbackTitle
  const isSingle = !input.albumTitle && !!input.fallbackTitle
  const type     = isSingle ? "Single" : "Album"

  if (title) {
    const { data } = await supabase.from("releases").select("slug").ilike("title", title).eq("type", type).limit(1).maybeSingle()
    if (data) return { slug: (data as { slug: string }).slug, created: false }

    const base = input.artistName
      ? `${slugify(input.artistName)}-${slugify(title)}`
      : slugify(title)
    const slug = await distroUniqueSlug(base, "releases")
    const today = new Date().toISOString().slice(0, 10)
    const { data: created, error } = await supabase
      .from("releases")
      .insert({
        id: randomUUID(),
        title, slug,
        artist_name: input.artistName ?? "", artist_slug: input.artistSlug,
        upc: input.upc ?? null, status: "published", type,
        genre: "", description: "", is_visible: true,
        release_date: today,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      })
      .select("slug").single()
    if (error) throw new Error(`Create release "${title}": ${error.message}`)
    return { slug: (created as { slug: string }).slug, created: true }
  }

  return null
}

interface DistroSongInput {
  title:        string
  artistName:   string
  artistSlug:   string | null
  releaseSlug:  string | null
  releaseTitle: string | null
  isrc:         string | null
  upc:          string | null
}

async function distroCreateSong(input: DistroSongInput): Promise<{ id: string; title: string; slug: string }> {
  const base = input.artistName
    ? `${slugify(input.artistName)}-${slugify(input.title)}`
    : slugify(input.title)
  const slug = await distroUniqueSlug(base, "songs")
  const { data, error } = await supabase
    .from("songs")
    .insert({
      id: randomUUID(),
      title: input.title, slug,
      artist_name: input.artistName, artist_slug: input.artistSlug,
      release_slug: input.releaseSlug, release_name: input.releaseTitle,
      isrc: input.isrc,
      status: "published", is_visible: true, genre: "",
      data_source: "distro",
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    })
    .select("id, title, slug").single()
  if (error) throw new Error(`Create song "${input.title}": ${error.message}`)
  const row = data as { id: string; title: string; slug: string }
  return { id: row.id, title: row.title, slug: row.slug }
}

// ─── Log ──────────────────────────────────────────────────────────────────────

async function saveImportLog(
  type: string,
  filename: string,
  total: number,
  matched: number,
  updated: number,
  created: number,
  skipped: number,
  errors: string[],
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("import_logs")
      .insert({
        import_type: type,
        filename,
        total_rows: total,
        matched_rows: matched,
        updated_rows: updated,
        created_rows: created,
        skipped_rows: skipped,
        error_count: errors.length,
        errors: errors.length > 0 ? errors.slice(0, 20) : null,
        imported_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (error) {
      console.error("[imports] log write failed:", error.message)
      return null
    }
    return (data as { id: string }).id
  } catch {
    return null
  }
}

export async function getImportLogs() {
  await requireAdmin()
  const { data, error } = await supabase
    .from("import_logs")
    .select("*")
    .order("imported_at", { ascending: false })
    .limit(50)

  if (error) {
    return []
  }
  return data ?? []
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function errorResult(type: ImportType, message: string): ImportResult {
  return { importType: type, totalRows: 0, matched: 0, created: 0, updated: 0, skipped: 0, errors: [message], logId: null }
}

// ─── Phase 1 helpers ─────────────────────────────────────────────────────────

function applyDefined(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === null) continue
    if (typeof v === "string" && v.trim() === "") continue
    out[k] = v
  }
  return out
}

function bmiStatusToPublishingStatus(
  status: string | null,
): "unregistered" | "pending" | "registered" {
  if (!status) return "unregistered"
  const s = status.toLowerCase()
  if (s.includes("registered") || s.includes("active")) return "registered"
  if (s.includes("pending")    || s.includes("process")) return "pending"
  return "unregistered"
}

function isUuidShaped(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

interface BmiPublishingInput {
  songId:         string
  songTitle:      string
  artistSlug:     string | null
  releaseSlug:    string | null
  iswc:           string
  publisherName:  string | null
  writerName:     string | null
  status:         "unregistered" | "pending" | "registered"
}

async function upsertPublishingWorkForBmi(
  input: BmiPublishingInput,
): Promise<{ error?: string }> {
  if (!isUuidShaped(input.songId)) {
    return { error: `song_id "${input.songId}" is not UUID-formatted; skipping publishing_works link` }
  }

  const { data: rows, error: lookupErr } = await supabase
    .from("publishing_works")
    .select("id, iswc, writers, publishers, status, pro")
    .eq("song_id", input.songId)
    .limit(1)

  if (lookupErr) return { error: `lookup failed: ${lookupErr.message}` }

  const existing = (rows && rows[0]) as
    | { id: string; iswc: string; writers: string[] | null; publishers: string[] | null; status: string; pro: string }
    | undefined

  if (!existing) {
    const writersInit    = input.writerName    ? [input.writerName.trim()]    : []
    const publishersInit = input.publisherName ? [input.publisherName.trim()] : []

    const { error: insertErr } = await supabase
      .from("publishing_works")
      .insert({
        title:        input.songTitle,
        song_id:      input.songId,
        artist_slug:  input.artistSlug,
        release_slug: input.releaseSlug,
        iswc:         input.iswc ?? "",
        writers:      writersInit,
        publishers:   publishersInit,
        splits:       {},
        pro:          "BMI",
        status:       input.status,
        notes:        "",
      })
    if (insertErr) return { error: `insert failed: ${insertErr.message}` }
    return {}
  }

  const existingWriters    = Array.isArray(existing.writers)    ? existing.writers    : []
  const existingPublishers = Array.isArray(existing.publishers) ? existing.publishers : []

  const mergedWriters    = input.writerName    ? mergeUniqueStrings(existingWriters,    input.writerName)    : existingWriters
  const mergedPublishers = input.publisherName ? mergeUniqueStrings(existingPublishers, input.publisherName) : existingPublishers

  const nextIswc = (input.iswc && input.iswc.trim()) || existing.iswc || ""

  const STATUS_RANK: Record<string, number> = { unregistered: 0, pending: 1, registered: 2 }
  const oldRank = STATUS_RANK[existing.status] ?? 0
  const newRank = STATUS_RANK[input.status]    ?? 0
  const nextStatus: "unregistered" | "pending" | "registered" =
    newRank >= oldRank ? input.status : (existing.status as "unregistered" | "pending" | "registered")

  const { error: updateErr } = await supabase
    .from("publishing_works")
    .update({
      writers:    mergedWriters,
      publishers: mergedPublishers,
      iswc:       nextIswc,
      pro:        existing.pro || "BMI",
      status:     nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)

  if (updateErr) return { error: `update failed: ${updateErr.message}` }
  return {}
}

function mergeUniqueStrings(existing: string[], incoming: string): string[] {
  const trimmed = incoming.trim()
  if (!trimmed) return existing
  if (existing.some((s) => s.toLowerCase().trim() === trimmed.toLowerCase())) return existing
  return [...existing, trimmed]
}
