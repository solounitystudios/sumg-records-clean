/**
 * BMI catalog export parser.
 *
 * BMI exports works in CSV/TSV with the following common column headers.
 * Column names vary by report type, so we match case-insensitively.
 *
 * Supported BMI report types:
 *   - BMI Songview (catalog export)
 *   - BMI Royalty Statement CSV
 *
 * Known column names (normalized to lowercase for matching):
 *   work title / title / song title
 *   iswc
 *   writer name / composer / writer
 *   publisher name / publisher / pub name
 *   writer share / share %
 *   ipi / ipi cae / cae number
 *   registration status / status
 *   bmi work id / work id
 */

export interface BMIWorkRow {
  title: string
  iswc: string | null
  writerName: string | null
  publisherName: string | null
  writerShare: string | null
  ipiCae: string | null
  registrationStatus: string | null
  bmiWorkId: string | null
}

const TITLE_ALIASES   = ["work title", "title", "song title", "work name"]
const ISWC_ALIASES    = ["iswc"]
const WRITER_ALIASES  = ["writer name", "composer", "writer", "author"]
const PUB_ALIASES     = ["publisher name", "publisher", "pub name", "publishing"]
const SHARE_ALIASES   = ["writer share", "share %", "share", "royalty share"]
const IPI_ALIASES     = ["ipi", "ipi cae", "cae number", "cae", "ipi number"]
const STATUS_ALIASES  = ["registration status", "status", "reg status"]
const WORKID_ALIASES  = ["bmi work id", "work id", "bmi id", "id"]

function findCol(headers: string[], aliases: string[]): number {
  const lower = headers.map(h => h.toLowerCase().trim())
  for (const alias of aliases) {
    const idx = lower.indexOf(alias)
    if (idx !== -1) return idx
  }
  return -1
}

export function detectBMIHeaders(headers: string[]): boolean {
  const titleIdx = findCol(headers, TITLE_ALIASES)
  const writerIdx = findCol(headers, WRITER_ALIASES)
  return titleIdx !== -1 || writerIdx !== -1
}

export function parseBMIRows(
  headers: string[],
  rows: string[][]
): BMIWorkRow[] {
  const ci = {
    title:      findCol(headers, TITLE_ALIASES),
    iswc:       findCol(headers, ISWC_ALIASES),
    writer:     findCol(headers, WRITER_ALIASES),
    publisher:  findCol(headers, PUB_ALIASES),
    share:      findCol(headers, SHARE_ALIASES),
    ipi:        findCol(headers, IPI_ALIASES),
    status:     findCol(headers, STATUS_ALIASES),
    workId:     findCol(headers, WORKID_ALIASES),
  }

  return rows
    .filter(row => row.some(cell => cell.trim()))
    .map(row => ({
      title:              ci.title  !== -1 ? row[ci.title]?.trim()  ?? "" : "",
      iswc:               ci.iswc   !== -1 ? row[ci.iswc]?.trim()   ?? null : null,
      writerName:         ci.writer !== -1 ? row[ci.writer]?.trim() ?? null : null,
      publisherName:      ci.publisher !== -1 ? row[ci.publisher]?.trim() ?? null : null,
      writerShare:        ci.share  !== -1 ? row[ci.share]?.trim()  ?? null : null,
      ipiCae:             ci.ipi    !== -1 ? row[ci.ipi]?.trim()    ?? null : null,
      registrationStatus: ci.status !== -1 ? row[ci.status]?.trim() ?? null : null,
      bmiWorkId:          ci.workId !== -1 ? row[ci.workId]?.trim() ?? null : null,
    }))
    .filter(r => r.title.length > 0)
}

export function bmiStatusToRightsStatus(
  status: string | null
): "draft" | "pending" | "registered" | "issue" {
  if (!status) return "draft"
  const s = status.toLowerCase()
  if (s.includes("registered") || s.includes("active")) return "registered"
  if (s.includes("pending") || s.includes("process")) return "pending"
  if (s.includes("error") || s.includes("issue") || s.includes("problem")) return "issue"
  return "draft"
}
