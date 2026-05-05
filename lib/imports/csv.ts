export interface ParsedCSV {
  headers: string[]
  rows: string[][]
  totalRows: number
  delimiter: "," | "\t"
}

function detectDelimiter(line: string): "," | "\t" {
  const tabs   = (line.match(/\t/g) ?? []).length
  const commas = (line.match(/,/g) ?? []).length
  return tabs > commas ? "\t" : ","
}

function parseLine(line: string, delim: "," | "\t"): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === delim && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

export function parseCSVText(text: string): ParsedCSV {
  // Split on \r\n (Windows), \r (old Mac / DistroKid TSV), or \n (Unix).
  // \r?\n only handles the first two; bare \r breaks DistroKid exports.
  const lines = text.split(/\r\n|\r|\n/).filter(l => l.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [], totalRows: 0, delimiter: "," }

  const delim = detectDelimiter(lines[0])
  const headers = parseLine(lines[0], delim)
  const rows = lines.slice(1).map(l => parseLine(l, delim))

  if (process.env.NODE_ENV !== "production") {
    console.log("[parseCSVText] delimiter:", delim === "\t" ? "TAB" : "COMMA",
      "| rows:", rows.length, "| cols:", headers.length,
      "| first header:", headers[0] ?? "(none)")
  }

  return { headers, rows, totalRows: rows.length, delimiter: delim }
}

export function csvToObjects(parsed: ParsedCSV): Record<string, string>[] {
  return parsed.rows.map(row =>
    Object.fromEntries(parsed.headers.map((h, i) => [h, row[i] ?? ""]))
  )
}
