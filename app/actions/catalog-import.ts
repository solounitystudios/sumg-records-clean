"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"
import { supabase } from "@/lib/db/supabase"
import type { ImportEntityType, RowConflict, CatalogImportParams, BatchImportResult } from "@/lib/imports/types"
import { fuzzyScore, slugify } from "@/lib/imports/conflict-detector"

// ─── Types used internally ────────────────────────────────────────────────────

type MappedRow = { rowIndex: number; mapped: Record<string, string> }

// ─── Detect Conflicts ─────────────────────────────────────────────────────────

export async function detectConflicts(
  entityType: ImportEntityType,
  rows: MappedRow[],
): Promise<RowConflict[]> {
  await requireAdmin()

  switch (entityType) {
    case 'songs':    return detectSongConflicts(rows)
    case 'releases': return detectReleaseConflicts(rows)
    case 'artists':  return detectArtistConflicts(rows)
    case 'bmi':      return detectBMIConflicts(rows)
    default:
      return rows.map(r => ({ rowIndex: r.rowIndex, status: 'new' as const, confidence: 1.0, action: 'import_as_new' as const }))
  }
}

// ─── Song conflict detection ──────────────────────────────────────────────────

async function detectSongConflicts(rows: MappedRow[]): Promise<RowConflict[]> {
  const { data } = await supabase.from('songs').select('id, slug, title, isrc, artist_name')
  type SongRow = { id: string; slug: string; title: string; isrc: string | null; artist_name: string }
  const existing = (data ?? []) as SongRow[]

  return rows.map(row => {
    const m = row.mapped
    if (!m.title?.trim()) {
      return { rowIndex: row.rowIndex, status: 'invalid' as const, confidence: 0, conflictReason: 'Missing required field: Song Title', action: 'skip' as const }
    }

    // 1. ISRC exact match
    const isrc = m.isrc?.trim().toUpperCase()
    if (isrc) {
      const hit = existing.find(s => s.isrc?.toUpperCase() === isrc)
      if (hit) {
        return { rowIndex: row.rowIndex, status: 'exact_match' as const, confidence: 1.0, matchedId: hit.id, matchedTitle: hit.title, matchedField: 'isrc', action: 'update_existing' as const }
      }
    }

    // 2. Title + artist fuzzy
    let bestScore = 0
    let bestHit: SongRow | null = null
    for (const s of existing) {
      const tScore = fuzzyScore(m.title, s.title)
      const aScore = m.artist_name ? fuzzyScore(m.artist_name, s.artist_name ?? '') : 0.5
      const combined = m.artist_name ? tScore * 0.7 + aScore * 0.3 : tScore
      if (combined > bestScore) { bestScore = combined; bestHit = s }
    }

    if (bestScore >= 0.95 && bestHit) return { rowIndex: row.rowIndex, status: 'exact_match' as const, confidence: bestScore, matchedId: bestHit.id, matchedTitle: bestHit.title, matchedField: 'title+artist', action: 'update_existing' as const }
    if (bestScore >= 0.80 && bestHit) return { rowIndex: row.rowIndex, status: 'possible_match' as const, confidence: bestScore, matchedId: bestHit.id, matchedTitle: bestHit.title, matchedField: 'title+artist', conflictReason: 'Similar song found — confirm before importing', action: 'skip' as const }
    if (bestScore >= 0.60 && bestHit) return { rowIndex: row.rowIndex, status: 'conflict' as const, confidence: bestScore, matchedId: bestHit.id, matchedTitle: bestHit.title, matchedField: 'title', conflictReason: 'Partial title match — may be alternate version', action: 'merge_later' as const }

    return { rowIndex: row.rowIndex, status: 'new' as const, confidence: 1.0, action: 'import_as_new' as const }
  })
}

// ─── Release conflict detection ───────────────────────────────────────────────

async function detectReleaseConflicts(rows: MappedRow[]): Promise<RowConflict[]> {
  const { data } = await supabase.from('releases').select('id, slug, title, upc, artist_name, release_date')
  type ReleaseRow = { id: string; slug: string; title: string; upc: string | null; artist_name: string; release_date: string | null }
  const existing = (data ?? []) as ReleaseRow[]

  return rows.map(row => {
    const m = row.mapped
    if (!m.title?.trim()) {
      return { rowIndex: row.rowIndex, status: 'invalid' as const, confidence: 0, conflictReason: 'Missing required field: Release Title', action: 'skip' as const }
    }

    // 1. UPC exact match
    const upc = m.upc?.replace(/\D/g, '').trim()
    if (upc) {
      const hit = existing.find(r => r.upc?.replace(/\D/g, '') === upc)
      if (hit) return { rowIndex: row.rowIndex, status: 'exact_match' as const, confidence: 1.0, matchedId: hit.id, matchedTitle: hit.title, matchedField: 'upc', action: 'update_existing' as const }
    }

    // 2. Title + artist fuzzy
    let bestScore = 0
    let bestHit: ReleaseRow | null = null
    for (const r of existing) {
      const tScore = fuzzyScore(m.title, r.title)
      const aScore = m.artist_name ? fuzzyScore(m.artist_name, r.artist_name ?? '') : 0.5
      const combined = m.artist_name ? tScore * 0.7 + aScore * 0.3 : tScore
      if (combined > bestScore) { bestScore = combined; bestHit = r }
    }

    if (bestScore >= 0.95 && bestHit) return { rowIndex: row.rowIndex, status: 'exact_match' as const, confidence: bestScore, matchedId: bestHit.id, matchedTitle: bestHit.title, matchedField: 'title+artist', action: 'update_existing' as const }
    if (bestScore >= 0.80 && bestHit) return { rowIndex: row.rowIndex, status: 'possible_match' as const, confidence: bestScore, matchedId: bestHit.id, matchedTitle: bestHit.title, matchedField: 'title+artist', conflictReason: 'Similar release found — confirm before importing', action: 'skip' as const }
    if (bestScore >= 0.60 && bestHit) return { rowIndex: row.rowIndex, status: 'conflict' as const, confidence: bestScore, matchedId: bestHit.id, matchedTitle: bestHit.title, matchedField: 'title', conflictReason: 'Partial release title match', action: 'merge_later' as const }

    return { rowIndex: row.rowIndex, status: 'new' as const, confidence: 1.0, action: 'import_as_new' as const }
  })
}

// ─── Artist conflict detection ────────────────────────────────────────────────

async function detectArtistConflicts(rows: MappedRow[]): Promise<RowConflict[]> {
  const { data } = await supabase.from('artists').select('id, slug, name')
  type ArtistRow = { id: string; slug: string; name: string }
  const existing = (data ?? []) as ArtistRow[]

  return rows.map(row => {
    const m = row.mapped
    if (!m.name?.trim()) {
      return { rowIndex: row.rowIndex, status: 'invalid' as const, confidence: 0, conflictReason: 'Missing required field: Artist Name', action: 'skip' as const }
    }

    // 1. Slug exact match
    if (m.slug?.trim()) {
      const hit = existing.find(a => a.slug === m.slug.trim())
      if (hit) return { rowIndex: row.rowIndex, status: 'exact_match' as const, confidence: 1.0, matchedId: hit.id, matchedTitle: hit.name, matchedField: 'slug', action: 'update_existing' as const }
    }

    // 2. Name fuzzy
    let bestScore = 0
    let bestHit: ArtistRow | null = null
    for (const a of existing) {
      const score = fuzzyScore(m.name, a.name)
      if (score > bestScore) { bestScore = score; bestHit = a }
    }

    if (bestScore >= 0.95 && bestHit) return { rowIndex: row.rowIndex, status: 'exact_match' as const, confidence: bestScore, matchedId: bestHit.id, matchedTitle: bestHit.name, matchedField: 'name', action: 'update_existing' as const }
    if (bestScore >= 0.80 && bestHit) return { rowIndex: row.rowIndex, status: 'possible_match' as const, confidence: bestScore, matchedId: bestHit.id, matchedTitle: bestHit.name, matchedField: 'name', conflictReason: 'Similar artist name — confirm before importing', action: 'skip' as const }
    if (bestScore >= 0.60 && bestHit) return { rowIndex: row.rowIndex, status: 'conflict' as const, confidence: bestScore, matchedId: bestHit.id, matchedTitle: bestHit.name, matchedField: 'name', conflictReason: 'Similar artist name — may be variant or different artist', action: 'merge_later' as const }

    return { rowIndex: row.rowIndex, status: 'new' as const, confidence: 1.0, action: 'import_as_new' as const }
  })
}

// ─── BMI / Publishing works conflict detection ────────────────────────────────

async function detectBMIConflicts(rows: MappedRow[]): Promise<RowConflict[]> {
  const { data } = await supabase.from('publishing_works').select('id, title, iswc')
  type WorkRow = { id: string; title: string; iswc: string }
  const existing = (data ?? []) as WorkRow[]

  return rows.map(row => {
    const m = row.mapped
    if (!m.title?.trim()) {
      return { rowIndex: row.rowIndex, status: 'invalid' as const, confidence: 0, conflictReason: 'Missing required field: Work Title', action: 'skip' as const }
    }

    // 1. ISWC exact match
    const iswc = m.iswc?.replace(/[.\-]/g, '').trim()
    if (iswc) {
      const hit = existing.find(w => w.iswc?.replace(/[.\-]/g, '') === iswc)
      if (hit) return { rowIndex: row.rowIndex, status: 'exact_match' as const, confidence: 1.0, matchedId: hit.id, matchedTitle: hit.title, matchedField: 'iswc', action: 'update_existing' as const }
    }

    // 2. Title fuzzy
    let bestScore = 0
    let bestHit: WorkRow | null = null
    for (const w of existing) {
      const score = fuzzyScore(m.title, w.title)
      if (score > bestScore) { bestScore = score; bestHit = w }
    }

    if (bestScore >= 0.95 && bestHit) return { rowIndex: row.rowIndex, status: 'exact_match' as const, confidence: bestScore, matchedId: bestHit.id, matchedTitle: bestHit.title, matchedField: 'title', action: 'update_existing' as const }
    if (bestScore >= 0.80 && bestHit) return { rowIndex: row.rowIndex, status: 'possible_match' as const, confidence: bestScore, matchedId: bestHit.id, matchedTitle: bestHit.title, matchedField: 'title', conflictReason: 'Similar work title found', action: 'skip' as const }
    if (bestScore >= 0.60 && bestHit) return { rowIndex: row.rowIndex, status: 'conflict' as const, confidence: bestScore, matchedId: bestHit.id, matchedTitle: bestHit.title, matchedField: 'title', conflictReason: 'Partial work title match', action: 'merge_later' as const }

    return { rowIndex: row.rowIndex, status: 'new' as const, confidence: 1.0, action: 'import_as_new' as const }
  })
}

// ─── Run Catalog Import (Phase 3) ─────────────────────────────────────────────

export async function runCatalogImport(params: CatalogImportParams): Promise<BatchImportResult> {
  await requireAdmin()

  const { entityType, filename, rows } = params
  let createdCount = 0, updatedCount = 0, skippedCount = 0, conflictCount = 0, invalidCount = 0
  const errors: string[] = []
  const createdRecords: { id: string; title: string; slug?: string }[] = []
  const updatedRecords: { id: string; title: string; slug?: string }[] = []

  skippedCount  = rows.filter(r => r.action === 'skip').length
  conflictCount = rows.filter(r => r.action === 'merge_later').length

  for (const row of rows) {
    if (row.action === 'skip' || row.action === 'merge_later') continue

    try {
      if (row.action === 'import_as_new') {
        const rec = await createRecord(entityType, row.mapped)
        if (rec) { createdCount++; createdRecords.push(rec) }
      } else if (row.action === 'update_existing' && row.matchedId) {
        const rec = await updateRecord(entityType, row.matchedId, row.mapped)
        if (rec) { updatedCount++; updatedRecords.push(rec) }
      }
    } catch (e) {
      errors.push(`Row ${row.rowIndex}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const totalWritten = createdCount + updatedCount
  const status = errors.length > 0 && totalWritten === 0 ? 'failed' : errors.length > 0 ? 'partial' : 'imported'

  const batchId = await saveBatch({
    source: 'catalog',
    entityType,
    filename,
    status,
    totalRows: rows.length,
    createdCount,
    updatedCount,
    skippedCount,
    conflictCount,
    invalidCount,
  })

  revalidatePath('/admin/imports')
  if (entityType === 'artists')  revalidatePath('/admin/artists')
  if (entityType === 'releases') revalidatePath('/admin/releases')
  if (entityType === 'songs')    revalidatePath('/admin/songs')

  return { batchId, entityType, filename, createdCount, updatedCount, skippedCount, conflictCount, invalidCount, errors, createdRecords, updatedRecords }
}

// ─── Record writers ───────────────────────────────────────────────────────────

async function createRecord(entityType: ImportEntityType, m: Record<string, string>): Promise<{ id: string; title: string; slug?: string } | null> {
  switch (entityType) {
    case 'artists':  return createArtist(m)
    case 'releases': return createRelease(m)
    case 'songs':    return createSong(m)
    case 'bmi':      return createPublishingWork(m)
    default:         return null
  }
}

async function updateRecord(entityType: ImportEntityType, id: string, m: Record<string, string>): Promise<{ id: string; title: string; slug?: string } | null> {
  switch (entityType) {
    case 'artists':  return updateArtist(id, m)
    case 'releases': return updateRelease(id, m)
    case 'songs':    return updateSong(id, m)
    case 'bmi':      return updatePublishingWork(id, m)
    default:         return null
  }
}

// ─── Slug helpers ─────────────────────────────────────────────────────────────

async function ensureUniqueSlug(base: string, table: string): Promise<string> {
  let candidate = base || 'untitled'
  let attempt = 0
  while (true) {
    const { data } = await supabase.from(table).select('id').eq('slug', candidate).limit(1).maybeSingle()
    if (!data) return candidate
    attempt++
    candidate = `${base}-${attempt + 1}`
  }
}

// Safe merge: only overwrite if incoming is non-empty and existing is empty OR they differ
function safeMerge(existing: Record<string, unknown>, incoming: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...existing }
  for (const [key, val] of Object.entries(incoming)) {
    if (val === null || val === undefined || val === '') continue
    const current = existing[key]
    if (current === null || current === undefined || current === '') {
      result[key] = val
    } else if (String(current) !== String(val)) {
      result[key] = val
    }
  }
  return result
}

// ─── Artist CRUD ──────────────────────────────────────────────────────────────

async function createArtist(m: Record<string, string>): Promise<{ id: string; title: string; slug?: string } | null> {
  const name = m.name?.trim()
  if (!name) return null

  const base = slugify(name)
  const slug = await ensureUniqueSlug(base, 'artists')
  const socialLinks: Record<string, string> = {}
  if (m.instagram?.trim()) socialLinks.instagram = m.instagram.trim()
  if (m.twitter?.trim())   socialLinks.twitter   = m.twitter.trim()
  if (m.website?.trim())   socialLinks.website   = m.website.trim()

  const { data, error } = await supabase
    .from('artists')
    .insert({
      slug,
      name,
      bio:        m.bio?.trim()    || '',
      genre:      m.genre?.trim()  || '',
      role:       m.role?.trim()   || 'artist',
      status:     m.status?.trim() || 'active',
      spotify_id: m.spotify_id?.trim() || null,
      social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
      featured:   false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id, name, slug')
    .single()

  if (error) throw new Error(`Create artist: ${error.message}`)
  const row = data as { id: string; name: string; slug: string }
  return { id: row.id, title: row.name, slug: row.slug }
}

async function updateArtist(id: string, m: Record<string, string>): Promise<{ id: string; title: string; slug?: string } | null> {
  const { data: existing, error: fetchErr } = await supabase.from('artists').select('*').eq('id', id).single()
  if (fetchErr || !existing) throw new Error('Artist not found')

  const ex = existing as Record<string, unknown>
  const incoming: Record<string, unknown> = {}
  if (m.name?.trim())       incoming.name       = m.name.trim()
  if (m.bio?.trim())        incoming.bio        = m.bio.trim()
  if (m.genre?.trim())      incoming.genre      = m.genre.trim()
  if (m.role?.trim())       incoming.role       = m.role.trim()
  if (m.status?.trim())     incoming.status     = m.status.trim()
  if (m.spotify_id?.trim()) incoming.spotify_id = m.spotify_id.trim()

  const merged = safeMerge(ex, incoming)
  merged.updated_at = new Date().toISOString()

  const { data, error } = await supabase.from('artists').update(merged).eq('id', id).select('id, name, slug').single()
  if (error) throw new Error(`Update artist: ${error.message}`)
  const row = data as { id: string; name: string; slug: string }
  return { id: row.id, title: row.name, slug: row.slug }
}

// ─── Release CRUD ─────────────────────────────────────────────────────────────

async function createRelease(m: Record<string, string>): Promise<{ id: string; title: string; slug?: string } | null> {
  const title = m.title?.trim()
  if (!title) return null

  const base = m.artist_name?.trim()
    ? `${slugify(m.artist_name.trim())}-${slugify(title)}`
    : slugify(title)
  const slug = await ensureUniqueSlug(base, 'releases')

  // Look up artist_slug from artist_name
  let artistSlug = m.artist_slug?.trim() || null
  if (!artistSlug && m.artist_name?.trim()) {
    const { data: a } = await supabase.from('artists').select('slug').ilike('name', m.artist_name.trim()).limit(1).maybeSingle()
    artistSlug = (a as { slug: string } | null)?.slug ?? slugify(m.artist_name.trim())
  }

  const { data, error } = await supabase
    .from('releases')
    .insert({
      slug,
      title,
      artist_slug:  artistSlug,
      artist_name:  m.artist_name?.trim()    || '',
      release_date: m.release_date?.trim()   || null,
      type:         m.type?.trim()           || 'Single',
      upc:          m.upc?.trim()            || null,
      genre:        m.genre?.trim()          || '',
      status:       m.status?.trim()         || 'published',
      label:        m.label?.trim()          || null,
      cover_art_url: m.artwork_url?.trim()   || null,
      description:  '',
      is_visible:   false,
      created_at:   new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    })
    .select('id, title, slug')
    .single()

  if (error) throw new Error(`Create release: ${error.message}`)
  const row = data as { id: string; title: string; slug: string }
  return { id: row.id, title: row.title, slug: row.slug }
}

async function updateRelease(id: string, m: Record<string, string>): Promise<{ id: string; title: string; slug?: string } | null> {
  const { data: existing, error: fetchErr } = await supabase.from('releases').select('*').eq('id', id).single()
  if (fetchErr || !existing) throw new Error('Release not found')

  const ex = existing as Record<string, unknown>
  const incoming: Record<string, unknown> = {}
  if (m.title?.trim())        incoming.title        = m.title.trim()
  if (m.artist_name?.trim())  incoming.artist_name  = m.artist_name.trim()
  if (m.release_date?.trim()) incoming.release_date = m.release_date.trim()
  if (m.type?.trim())         incoming.type         = m.type.trim()
  if (m.upc?.trim())          incoming.upc          = m.upc.trim()
  if (m.genre?.trim())        incoming.genre        = m.genre.trim()
  if (m.status?.trim())       incoming.status       = m.status.trim()
  if (m.label?.trim())        incoming.label        = m.label.trim()
  if (m.artwork_url?.trim())  incoming.cover_art_url = m.artwork_url.trim()

  const merged = safeMerge(ex, incoming)
  merged.updated_at = new Date().toISOString()

  const { data, error } = await supabase.from('releases').update(merged).eq('id', id).select('id, title, slug').single()
  if (error) throw new Error(`Update release: ${error.message}`)
  const row = data as { id: string; title: string; slug: string }
  return { id: row.id, title: row.title, slug: row.slug }
}

// ─── Song CRUD ────────────────────────────────────────────────────────────────

async function createSong(m: Record<string, string>): Promise<{ id: string; title: string; slug?: string } | null> {
  const title = m.title?.trim()
  if (!title) return null

  const base = m.artist_name?.trim()
    ? `${slugify(m.artist_name.trim())}-${slugify(title)}`
    : slugify(title)
  const slug = await ensureUniqueSlug(base, 'songs')

  let artistSlug = m.artist_slug?.trim() || null
  if (!artistSlug && m.artist_name?.trim()) {
    const { data: a } = await supabase.from('artists').select('slug').ilike('name', m.artist_name.trim()).limit(1).maybeSingle()
    artistSlug = (a as { slug: string } | null)?.slug ?? slugify(m.artist_name.trim())
  }

  const trackNum = m.track_number ? parseInt(m.track_number, 10) : null
  const explicit = m.is_explicit ? ['true', 'yes', '1', 'explicit'].includes(m.is_explicit.toLowerCase()) : false

  const { data, error } = await supabase
    .from('songs')
    .insert({
      slug,
      title,
      artist_slug:  artistSlug,
      artist_name:  m.artist_name?.trim()   || '',
      release_slug: m.release_slug?.trim()  || null,
      isrc:         m.isrc?.trim()           || null,
      track_number: Number.isFinite(trackNum) ? trackNum : null,
      duration:     m.duration?.trim()       || null,
      genre:        m.genre?.trim()          || '',
      is_explicit:  explicit,
      status:       m.status?.trim()         || 'published',
      is_visible:   false,
      created_at:   new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    })
    .select('id, title, slug')
    .single()

  if (error) throw new Error(`Create song: ${error.message}`)
  const row = data as { id: string; title: string; slug: string }
  return { id: row.id, title: row.title, slug: row.slug }
}

async function updateSong(id: string, m: Record<string, string>): Promise<{ id: string; title: string; slug?: string } | null> {
  const { data: existing, error: fetchErr } = await supabase.from('songs').select('*').eq('id', id).single()
  if (fetchErr || !existing) throw new Error('Song not found')

  const ex = existing as Record<string, unknown>
  const incoming: Record<string, unknown> = {}
  if (m.title?.trim())        incoming.title        = m.title.trim()
  if (m.artist_name?.trim())  incoming.artist_name  = m.artist_name.trim()
  if (m.isrc?.trim())         incoming.isrc         = m.isrc.trim()
  if (m.duration?.trim())     incoming.duration     = m.duration.trim()
  if (m.genre?.trim())        incoming.genre        = m.genre.trim()
  if (m.release_slug?.trim()) incoming.release_slug = m.release_slug.trim()
  if (m.track_number?.trim()) {
    const n = parseInt(m.track_number, 10)
    if (Number.isFinite(n)) incoming.track_number = n
  }

  const merged = safeMerge(ex, incoming)
  merged.updated_at = new Date().toISOString()

  const { data, error } = await supabase.from('songs').update(merged).eq('id', id).select('id, title, slug').single()
  if (error) throw new Error(`Update song: ${error.message}`)
  const row = data as { id: string; title: string; slug: string }
  return { id: row.id, title: row.title, slug: row.slug }
}

// ─── Publishing Work CRUD ─────────────────────────────────────────────────────

async function createPublishingWork(m: Record<string, string>): Promise<{ id: string; title: string } | null> {
  const title = m.title?.trim()
  if (!title) return null

  const writers = m.writer_name?.trim()
    ? [{ name: m.writer_name.trim(), role: 'Composer', pro: m.pro?.trim() || 'BMI' }]
    : []
  const publishers = m.publisher_name?.trim()
    ? [{ name: m.publisher_name.trim() }]
    : []

  const { data, error } = await supabase
    .from('publishing_works')
    .insert({
      title,
      iswc:       m.iswc?.trim()   || '',
      pro:        m.pro?.trim()    || 'BMI',
      status:     'registered',
      writers,
      publishers,
      splits:     {},
      notes:      '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id, title')
    .single()

  if (error) throw new Error(`Create publishing work: ${error.message}`)
  const row = data as { id: string; title: string }
  return { id: row.id, title: row.title }
}

async function updatePublishingWork(id: string, m: Record<string, string>): Promise<{ id: string; title: string } | null> {
  const { data: existing, error: fetchErr } = await supabase.from('publishing_works').select('*').eq('id', id).single()
  if (fetchErr || !existing) throw new Error('Publishing work not found')

  const ex = existing as Record<string, unknown>
  const incoming: Record<string, unknown> = {}
  if (m.title?.trim()) incoming.title = m.title.trim()
  if (m.iswc?.trim())  incoming.iswc  = m.iswc.trim()
  if (m.pro?.trim())   incoming.pro   = m.pro.trim()

  const merged = safeMerge(ex, incoming)
  merged.updated_at = new Date().toISOString()

  const { data, error } = await supabase.from('publishing_works').update(merged).eq('id', id).select('id, title').single()
  if (error) throw new Error(`Update publishing work: ${error.message}`)
  const row = data as { id: string; title: string }
  return { id: row.id, title: row.title }
}

// ─── Batch record ─────────────────────────────────────────────────────────────

async function saveBatch(params: {
  source: string
  entityType: string
  filename: string
  status: string
  totalRows: number
  createdCount: number
  updatedCount: number
  skippedCount: number
  conflictCount: number
  invalidCount: number
}): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('import_batches')
      .insert({
        source:        params.source,
        entity_type:   params.entityType,
        filename:      params.filename,
        status:        params.status,
        total_rows:    params.totalRows,
        created_count: params.createdCount,
        updated_count: params.updatedCount,
        skipped_count: params.skippedCount,
        conflict_count: params.conflictCount,
        invalid_count: params.invalidCount,
        created_at:    new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) { console.error('[catalog-import] batch save failed:', error.message); return null }
    return (data as { id: string }).id
  } catch { return null }
}
