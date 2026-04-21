/**
 * Revenue CSV parser utilities.
 *
 * Detects the source platform (DistroKid, BMI, SoundExchange) by inspecting
 * column headers, then maps each row to a RoyaltyStatement shape ready for
 * insertion into the `royalty_statements` Supabase table.
 */

import { RoyaltySource, RoyaltyStatement } from "@/lib/types";

// ─── Raw CSV parsing ──────────────────────────────────────────────────────────

/**
 * Parses a CSV string into an array of header-keyed row objects.
 * Handles quoted fields containing commas or newlines.
 */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return [];

  // Parse headers from first non-empty line
  const headerLine = lines[0];
  const headers = splitCSVLine(headerLine);

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = splitCSVLine(line);
    if (cells.every((c) => !c)) continue; // skip blank rows
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = (cells[idx] ?? "").trim();
    });
    rows.push(obj);
  }
  return rows;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ─── Source detection ─────────────────────────────────────────────────────────

export type DetectedSource = RoyaltySource | "unknown";

/**
 * Detects the source platform from a set of CSV column headers.
 *
 * Detection signatures:
 *   DistroKid  — has "Sale Month" + ("Earnings/USD" or "Net Revenue USD")
 *   BMI        — has "Work ID" + "Royalty Type"
 *   SoundExchange — has "Total Digital Performance" + "Royalty Rate"
 *   Apple      — has "Apple Music" or "Apple Identifier"
 */
export function detectSource(headers: string[]): DetectedSource {
  const h = new Set(headers.map((s) => s.trim().toLowerCase()));

  if (h.has("sale month") && (h.has("earnings/usd") || h.has("net revenue usd"))) {
    return "distrokid";
  }
  if (h.has("work id") && h.has("royalty type")) {
    return "bmi";
  }
  if (h.has("total digital performance") && h.has("royalty rate")) {
    return "soundexchange";
  }
  if (h.has("apple identifier") || h.has("apple music")) {
    return "apple";
  }
  return "unknown";
}

/** Returns the headers present in the first row of a parsed CSV. */
export function getHeaders(rows: Record<string, string>[]): string[] {
  if (rows.length === 0) return [];
  return Object.keys(rows[0]);
}

// ─── Source-specific mappers ──────────────────────────────────────────────────

/** Finds the first matching key in a row object (case-insensitive). */
function col(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    for (const k of Object.keys(row)) {
      if (k.trim().toLowerCase() === key.toLowerCase()) {
        return row[k] ?? "";
      }
    }
  }
  return "";
}

function parseNum(val: string): number {
  const n = parseFloat(val.replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

const MONTHS_EN: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9,
  oct: 10, nov: 11, dec: 12,
};

function parseNullableInt(val: string): number | undefined {
  const n = parseInt(val.replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? undefined : n;
}

/**
 * Converts a "YYYY-MM" or "Month YYYY" or "YYYY-MM-DD" string into
 * period_start (first of month) and period_end (last of month) ISO date strings.
 */
function parsePeriod(raw: string): { periodStart: string; periodEnd: string } {
  let year: number;
  let month: number; // 1-based

  // YYYY-MM or YYYY-MM-DD
  const isoMatch = raw.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
  } else {
    // "January 2024" or "Jan 2024"
    const parts = raw.toLowerCase().split(/\s+/);
    month = MONTHS_EN[parts[0]] ?? 1;
    year = parseInt(parts[1] ?? "2024", 10);
  }

  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { periodStart: start, periodEnd: end };
}

// ─── DistroKid ────────────────────────────────────────────────────────────────

/**
 * Maps a single DistroKid earnings CSV row to a RoyaltyStatement.
 *
 * Expected columns (from DistroKid "Earnings" CSV export):
 *   Artist, Title, ISRC, UPC, Sale Month, Stores, Country of Sale, Quantity, Earnings/USD
 */
export function mapDistroKidRow(
  row: Record<string, string>
): Omit<RoyaltyStatement, "id" | "createdAt"> {
  const saleMonth = col(row, "Sale Month");
  const { periodStart, periodEnd } = parsePeriod(saleMonth || "2024-01");
  const netRev = parseNum(col(row, "Earnings/USD", "Net Revenue USD", "Earnings USD"));
  const qty = parseNullableInt(col(row, "Quantity"));

  return {
    source: "distrokid",
    periodStart,
    periodEnd,
    artistSlug: undefined,
    releaseSlug: undefined,
    songIsrc: col(row, "ISRC") || undefined,
    songTitle: col(row, "Title"),
    streams: qty,
    grossRevenue: netRev,
    netRevenue: netRev,
    currency: "USD",
    territory: col(row, "Country of Sale") || undefined,
    rawRow: row,
  };
}

// ─── BMI ──────────────────────────────────────────────────────────────────────

/**
 * Maps a single BMI royalty statement CSV row to a RoyaltyStatement.
 *
 * Expected columns (from BMI statement CSV):
 *   Period, Work Title, Work ID, Royalty Type, Amount, Currency
 */
export function mapBMIRow(
  row: Record<string, string>
): Omit<RoyaltyStatement, "id" | "createdAt"> {
  const period = col(row, "Period");
  const { periodStart, periodEnd } = parsePeriod(period || "2024-01");
  const amount = parseNum(col(row, "Amount"));
  const currency = col(row, "Currency") || "USD";

  return {
    source: "bmi",
    periodStart,
    periodEnd,
    artistSlug: undefined,
    releaseSlug: undefined,
    songIsrc: undefined,
    songTitle: col(row, "Work Title"),
    streams: undefined,
    grossRevenue: amount,
    netRevenue: amount,
    currency,
    territory: undefined,
    rawRow: row,
  };
}

// ─── SoundExchange ────────────────────────────────────────────────────────────

/**
 * Maps a single SoundExchange statement CSV row to a RoyaltyStatement.
 *
 * Expected columns (from SoundExchange CSV):
 *   Featured Artist, Album, ISRC, Total Digital Performance, Royalty Rate, Royalty Amount, Period
 */
export function mapSoundExchangeRow(
  row: Record<string, string>
): Omit<RoyaltyStatement, "id" | "createdAt"> {
  const period = col(row, "Period", "Statement Period", "Royalty Period");
  const { periodStart, periodEnd } = parsePeriod(period || "2024-01");
  const royaltyAmount = parseNum(col(row, "Royalty Amount", "Amount"));
  const streams = parseNullableInt(col(row, "Total Digital Performance", "Plays"));
  const albumOrTitle = col(row, "Album", "Title", "Sound Recording");

  return {
    source: "soundexchange",
    periodStart,
    periodEnd,
    artistSlug: undefined,
    releaseSlug: undefined,
    songIsrc: col(row, "ISRC") || undefined,
    songTitle: albumOrTitle,
    streams,
    grossRevenue: royaltyAmount,
    netRevenue: royaltyAmount,
    currency: "USD",
    territory: undefined,
    rawRow: row,
  };
}

// ─── Apple ────────────────────────────────────────────────────────────────────

/**
 * Maps a single Apple Music / iTunes Connect CSV row to a RoyaltyStatement.
 *
 * Expected columns (from Apple Music for Artists CSV):
 *   Identifier, Title, Artist, Period, Plays, Streams, Earnings, Currency
 */
export function mapAppleRow(
  row: Record<string, string>
): Omit<RoyaltyStatement, "id" | "createdAt"> {
  const period = col(row, "Period", "Fiscal Period", "Start Date");
  const { periodStart, periodEnd } = parsePeriod(period || "2024-01");
  const earnings = parseNum(col(row, "Earnings", "Royalty Earned", "Extended Partner Share"));
  const streams = parseNullableInt(col(row, "Streams", "Plays", "Units"));

  return {
    source: "apple",
    periodStart,
    periodEnd,
    artistSlug: undefined,
    releaseSlug: undefined,
    songIsrc: col(row, "ISRC") || undefined,
    songTitle: col(row, "Title", "Content"),
    streams,
    grossRevenue: earnings,
    netRevenue: earnings,
    currency: col(row, "Currency") || "USD",
    territory: col(row, "Country Code", "Territory") || undefined,
    rawRow: row,
  };
}

// ─── Unified entry point ──────────────────────────────────────────────────────

/**
 * Parses a raw CSV text string and returns:
 *   - `source`: detected platform
 *   - `headers`: column names from the first row
 *   - `preview`: first 5 rows as raw objects (for UI preview)
 *   - `mapped`: all rows converted to RoyaltyStatement shape
 */
export function parseRoyaltyCSV(csvText: string): {
  source: DetectedSource;
  headers: string[];
  preview: Record<string, string>[];
  mapped: Omit<RoyaltyStatement, "id" | "createdAt">[];
} {
  const rows = parseCSV(csvText);
  if (rows.length === 0) {
    return { source: "unknown", headers: [], preview: [], mapped: [] };
  }

  const headers = getHeaders(rows);
  const source = detectSource(headers);
  const preview = rows.slice(0, 5);

  let mapped: Omit<RoyaltyStatement, "id" | "createdAt">[] = [];
  if (source === "distrokid") {
    mapped = rows.map(mapDistroKidRow);
  } else if (source === "bmi") {
    mapped = rows.map(mapBMIRow);
  } else if (source === "soundexchange") {
    mapped = rows.map(mapSoundExchangeRow);
  } else if (source === "apple") {
    mapped = rows.map(mapAppleRow);
  }
  // "unknown" and "manual" sources: mapped stays empty, user can still commit raw rows

  return { source, headers, preview, mapped };
}
