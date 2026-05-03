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
        .select("id, rights_metadata, title, slug")
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
        const merged = { ...(existing.rights_metadata ?? {}), ...rightsUpdate }
        const { error } = await supabase
          .from("songs")
          .update({ rights_metadata: merged, updated_at: new Date().toISOString() })
          .eq("id", existing.id)

        if (error) { errors.push(`Update failed for "${work.title}": ${error.message}`); skipped++ }
        else {
          updated++
          updatedEntities.push({ id: existing.id, title: existing.title, slug: (existing as { slug?: string }).slug })
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
          .select("id, title, slug")
          .eq("isrc", row.isrc)
          .limit(1)
          .maybeSingle()

        if (song) {
          matched++
          if (row.streams !== null && row.streams > 0) {
            await supabase
              .from("songs")
              .update({ streams: row.streams, updated_at: new Date().toISOString() })
              .eq("id", song.id)
            updated++
            updatedEntities.push({ id: song.id, title: song.title, slug: (song as { slug?: string }).slug })
          }
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
    // Table may not exist yet — return empty array gracefully
    return []
  }
  return data ?? []
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function errorResult(type: ImportType, message: string): ImportResult {
  return { importType: type, totalRows: 0, matched: 0, created: 0, updated: 0, skipped: 0, errors: [message], logId: null }
}
