import type { ConflictStatus, RowAction } from './types'

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[''"`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Levenshtein distance
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const m = a.length, n = b.length
  const prev = Array.from({ length: n + 1 }, (_, i) => i)
  const curr = new Array(n + 1)
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1])
    }
    prev.splice(0, n + 1, ...curr)
  }
  return prev[n]
}

export function fuzzyScore(a: string, b: string): number {
  const na = normalizeText(a)
  const nb = normalizeText(b)
  if (na === nb) return 1
  if (!na || !nb) return 0
  const maxLen = Math.max(na.length, nb.length)
  return 1 - levenshtein(na, nb) / maxLen
}

export function suggestAction(status: ConflictStatus): RowAction {
  switch (status) {
    case 'new':            return 'import_as_new'
    case 'exact_match':    return 'update_existing'
    case 'possible_match': return 'skip'
    case 'conflict':       return 'merge_later'
    case 'invalid':        return 'skip'
  }
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
