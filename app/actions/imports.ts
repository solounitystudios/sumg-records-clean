"use server"

import { revalidatePath } from "next/cache"
import { supabase } from "@/lib/db/supabase"
import { requireAdmin } from "@/lib/auth"
import { parseCSVText, csvToObjects } from "@/lib/imports/csv"
import { parseBMIRows, bmiStatusToRightsStatus } from "@/lib/imports/bmi"
import { parseDistroRows } from "@/lib/imports/distro"

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

  let matched = 0, updated = 0, created = 0, skipped = 0
  const errors: string[] = []
  const updatedEntities: { id: string; title: string; slug?: string }[] = []

  for (const row of rows) {
    try {
      if (row.isrc) {
        const { data: song } = await supabase
          .from("songs")
          .select("id, title, slug, isrc")
          .eq("isrc", row.isrc)
          .limit(1)
          .maybeSingle()

        if (song) {
          matched++
          // ISRC match — song already has the correct ISRC. No update needed.
          // Period stream counts belong on a future song_streams_by_period table,
          // not on songs.streams (which does not exist on this schema).
          continue
        }
      }

      if (row.title) {
        const { data: song } = await supabase
          .from("songs")
          .select("id, title, isrc, slug")
          .ilike("title", row.title)
          .limit(1)
          .maybeSingle()

        if (song) {
          matched++
          if (!(song as { isrc?: string }).isrc && row.isrc) {
            await supabase
              .from("songs")
              .update({ isrc: row.isrc, updated_at: new Date().toISOString() })
              .eq("id", song.id)
            updated++
            updatedEntities.push({ id: song.id, title: song.title, slug: (song as { slug?: string }).slug })
          }
          continue
        }
      }

      skipped++
    } catch (e) {
      errors.push(`Error processing row: ${String(e)}`)
      skipped++
    }
  }

  const logId = await saveImportLog("distro", file.name, rows.length, matched, updated, created, skipped, errors)

  revalidatePath("/admin/imports")
  revalidatePath("/admin/rights")

  return { importType: "distro", totalRows: rows.length, matched, created, updated, skipped, errors, logId, updatedEntities }
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
