/**
 * Distribution export parser.
 *
 * Supports DistroKid and generic distributor export formats.
 *
 * DistroKid columns (common export):
 *   Date, Title, Artists, ISRC, UPC, Team, Stores, Country of Sale, Quantity, Earnings (USD)
 *
 * Some DistroKid detailed/analytics exports use:
 *   Primary Artist, Song/Album, Stores, ISRC, UPC, Net Revenue
 *
 * Generic columns also detected:
 *   song title / track title / track name
 *   artist / artist name / primary artist
 *   isrc
 *   upc
 *   streams / quantity / plays
 *   earnings / revenue / royalties
 *   store / platform / dsp
 *   period / date / reporting period
 */

export interface DistroRow {
  title: string
  artistName: string | null
  albumTitle: string | null
  isrc: string | null
  upc: string | null
  streams: number | null
  earningsUsd: number | null
  store: string | null
  period: string | null
  country: string | null
}

export interface DistroImportSummary {
  rows: DistroRow[]
  totalEarnings: number
  totalStreams: number
  uniqueISRCs: number
  stores: string[]
}

const TITLE_ALIASES  = ["title", "song title", "track title", "track name", "song", "work title"]
const ARTIST_ALIASES = ["artists", "artist", "primary artist", "primary artists", "artist name", "performer"]
const ALBUM_ALIASES  = ["song/album", "album", "album title", "release title", "album name", "release name", "release", "ep title", "lp title"]
const ISRC_ALIASES   = ["isrc"]
const UPC_ALIASES    = ["upc", "ean"]
const STREAM_ALIASES = ["quantity", "streams", "plays", "units"]
const EARN_ALIASES   = ["earnings (usd)", "earnings", "revenue", "royalties", "amount", "net revenue"]
const STORE_ALIASES  = ["stores", "store", "platform", "dsp", "service", "channel"]
const PERIOD_ALIASES = ["date", "period", "reporting period", "month", "sale date"]
const COUNTRY_ALIASES = ["country of sale", "country", "territory", "region"]

function findCol(headers: string[], aliases: string[]): number {
  const lower = headers.map(h => h.toLowerCase().trim())
  for (const alias of aliases) {
    const idx = lower.indexOf(alias)
    if (idx !== -1) return idx
  }
  return -1
}

function parseNum(val: string | undefined): number | null {
  if (!val) return null
  const n = parseFloat(val.replace(/[$,\s]/g, ""))
  return isNaN(n) ? null : n
}

export function detectDistroHeaders(headers: string[]): boolean {
  return findCol(headers, ISRC_ALIASES) !== -1 || findCol(headers, TITLE_ALIASES) !== -1
}

export function parseDistroRows(
  headers: string[],
  rows: string[][]
): DistroRow[] {
  const ci = {
    title:   findCol(headers, TITLE_ALIASES),
    artist:  findCol(headers, ARTIST_ALIASES),
    album:   findCol(headers, ALBUM_ALIASES),
    isrc:    findCol(headers, ISRC_ALIASES),
    upc:     findCol(headers, UPC_ALIASES),
    streams: findCol(headers, STREAM_ALIASES),
    earn:    findCol(headers, EARN_ALIASES),
    store:   findCol(headers, STORE_ALIASES),
    period:  findCol(headers, PERIOD_ALIASES),
    country: findCol(headers, COUNTRY_ALIASES),
  }

  return rows
    .filter(row => row.some(cell => cell.trim()))
    .map(row => ({
      title:      ci.title  !== -1 ? row[ci.title]?.trim()  ?? "" : "",
      artistName: ci.artist !== -1 ? row[ci.artist]?.trim() ?? null : null,
      albumTitle: ci.album  !== -1 ? row[ci.album]?.trim()  ?? null : null,
      isrc:       ci.isrc   !== -1 ? row[ci.isrc]?.trim().toUpperCase() ?? null : null,
      upc:        ci.upc    !== -1 ? row[ci.upc]?.trim()   ?? null : null,
      streams:    ci.streams !== -1 ? parseNum(row[ci.streams]) : null,
      earningsUsd: ci.earn  !== -1 ? parseNum(row[ci.earn])    : null,
      store:      ci.store  !== -1 ? row[ci.store]?.trim() ?? null : null,
      period:     ci.period !== -1 ? row[ci.period]?.trim() ?? null : null,
      country:    ci.country !== -1 ? row[ci.country]?.trim() ?? null : null,
    }))
    .filter(r => r.title.length > 0 || r.isrc)
}

export function summarizeDistro(rows: DistroRow[]): DistroImportSummary {
  const totalEarnings = rows.reduce((s, r) => s + (r.earningsUsd ?? 0), 0)
  const totalStreams   = rows.reduce((s, r) => s + (r.streams ?? 0), 0)
  const isrcSet  = new Set(rows.map(r => r.isrc).filter(Boolean))
  const storeSet = new Set(rows.map(r => r.store).filter(Boolean))
  return {
    rows,
    totalEarnings,
    totalStreams,
    uniqueISRCs: isrcSet.size,
    stores: [...storeSet] as string[],
  }
}
