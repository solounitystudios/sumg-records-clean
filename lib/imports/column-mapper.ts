import type { ImportEntityType, ColumnMapping } from './types'
import { getFieldDefs, ARTIST_FIELDS, RELEASE_FIELDS, SONG_FIELDS } from './field-defs'

// Normalize a header string for comparison: lowercase, strip special chars, collapse spaces
function normalize(s: string): string {
  return s.toLowerCase().replace(/[_\-\.]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Auto-map CSV headers to target fields based on aliases defined in field-defs.
 * Exact match = confidence 1.0, substring match = 0.7.
 * Each target field can only be claimed once (first highest-confidence match wins).
 */
export function autoMapColumns(headers: string[], entityType: ImportEntityType): ColumnMapping[] {
  const fields = getFieldDefs(entityType)
  // Track which target fields have been claimed
  const claimed = new Set<string>()

  // For each header, find best match
  const mappings: ColumnMapping[] = headers.map(header => {
    const norm = normalize(header)
    let bestField: string | null = null
    let bestConfidence = 0

    for (const field of fields) {
      if (claimed.has(field.key)) continue

      // Exact match against any alias
      const exactMatch = field.aliases.some(alias => normalize(alias) === norm)
      if (exactMatch) {
        if (1.0 > bestConfidence) {
          bestField = field.key
          bestConfidence = 1.0
        }
        continue
      }

      // Substring match: norm contains alias or alias contains norm
      const subMatch = field.aliases.some(alias => {
        const normalizedAlias = normalize(alias)
        return norm.includes(normalizedAlias) || normalizedAlias.includes(norm)
      })
      if (subMatch && 0.7 > bestConfidence) {
        bestField = field.key
        bestConfidence = 0.7
      }
    }

    if (bestField !== null) {
      claimed.add(bestField)
    }

    return {
      csvHeader:   header,
      targetField: bestField,
      confidence:  bestField !== null ? bestConfidence : 0,
      manuallySet: false,
    }
  })

  return mappings
}

/**
 * Heuristic: which entity type does this CSV look like?
 * Returns type + confidence score.
 */
export function detectEntityType(headers: string[]): { type: ImportEntityType; confidence: number } {
  const norms = headers.map(normalize)

  function has(term: string): boolean {
    return norms.some(n => n === term || n.includes(term))
  }

  // BMI: iswc, bmi work id, ipi, registration status, writer name
  const bmiBits = [
    has('iswc'),
    has('bmi work'),
    has('ipi') || has('cae'),
    has('registration status') || has('reg status'),
    has('writer name') || has('writer'),
  ].filter(Boolean).length
  if (bmiBits >= 2) {
    return { type: 'bmi', confidence: Math.min(1, bmiBits * 0.22) }
  }

  // Distro: isrc + (earnings or stores or quantity or streams)
  const hasISRC    = has('isrc')
  const hasRevenue = has('earning') || has('revenue') || has('store') || has('quantity') || has('stream')
  if (hasISRC && hasRevenue) {
    return { type: 'distro', confidence: 0.9 }
  }

  // SoundExchange: soundexchange-specific fields
  if (has('soundexchange') || (has('digital performance') && has('royalt'))) {
    return { type: 'soundexchange', confidence: 0.85 }
  }

  // Check for release-specific markers first (to distinguish from songs/artists)
  const hasReleaseDate = has('release date') || has('release_date') || has('street date') || has('drop date')
  const hasUPC         = has('upc') || has('barcode') || has('ean')
  const hasAlbumTitle  = norms.some(n => n === 'album' || n === 'album title' || n === 'album name')

  if (hasReleaseDate && hasUPC) {
    return { type: 'releases', confidence: 0.9 }
  }
  if (hasAlbumTitle || (hasReleaseDate && !hasISRC)) {
    return { type: 'releases', confidence: 0.75 }
  }

  // Songs: title + isrc, or title + track number/bpm
  const hasTitle       = has('title') || has('song title') || has('track title') || has('track name')
  const hasTrackNumber = has('track number') || has('track no') || has('track #')
  const hasBPM         = has('bpm') || has('tempo')

  if (hasTitle && hasISRC) {
    return { type: 'songs', confidence: 0.9 }
  }
  if (hasTitle && (hasTrackNumber || hasBPM)) {
    return { type: 'songs', confidence: 0.8 }
  }

  // Artists: name/artist name present, no isrc, no album/release title
  const hasArtistName = norms.some(n => n === 'name' || n === 'artist name' || n === 'artist')
  if (hasArtistName && !hasISRC && !hasAlbumTitle) {
    return { type: 'artists', confidence: 0.7 }
  }

  // Default fallback: songs if title + artist both present
  const hasArtistCol = norms.some(n =>
    n === 'artist' || n === 'artist name' || n === 'artists' || n === 'performer'
  )
  if (hasTitle && hasArtistCol) {
    return { type: 'songs', confidence: 0.6 }
  }

  // Final fallback
  return { type: 'songs', confidence: 0.3 }
}

/**
 * Which required fields are missing from the current mappings?
 * Returns array of required field keys that have no mapping.
 */
export function getMissingRequiredFields(mappings: ColumnMapping[], entityType: ImportEntityType): string[] {
  const fields = getFieldDefs(entityType)
  const requiredFields = fields.filter(f => f.required)
  const mappedTargets = new Set(
    mappings.filter(m => m.targetField !== null).map(m => m.targetField as string)
  )
  return requiredFields
    .filter(f => !mappedTargets.has(f.key))
    .map(f => f.key)
}

// Re-export for convenience
export { ARTIST_FIELDS, RELEASE_FIELDS, SONG_FIELDS }
