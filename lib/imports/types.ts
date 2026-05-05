export type ImportEntityType = 'artists' | 'releases' | 'songs' | 'bmi' | 'distro' | 'soundexchange'

export interface ColumnMapping {
  csvHeader:   string        // original CSV column name
  targetField: string | null // matched DB field, null = ignored/unmapped
  confidence:  number        // 0–1 from auto-detection
  manuallySet: boolean
}

export interface ParsedImportRow {
  rowIndex: number
  raw:     Record<string, string>  // by CSV header
  mapped:  Record<string, string>  // by targetField
  issues:  string[]                // validation messages for this row
}

export interface ImportPreview {
  entityType:     ImportEntityType
  filename:       string
  totalRows:      number
  columnMappings: ColumnMapping[]
  sampleRows:     ParsedImportRow[]  // first 10
  stats: {
    mappedColumns:   number
    unmappedColumns: number
    requiredMissing: string[]
  }
}

export type ConflictStatus = 'new' | 'exact_match' | 'possible_match' | 'conflict' | 'invalid'
export type RowAction = 'import_as_new' | 'update_existing' | 'skip' | 'merge_later'

export interface RowConflict {
  rowIndex:        number
  status:          ConflictStatus
  confidence:      number
  matchedId?:      string
  matchedTitle?:   string
  matchedField?:   string
  conflictReason?: string
  action:          RowAction
}

export interface CatalogImportRow {
  rowIndex:   number
  mapped:     Record<string, string>
  action:     RowAction
  matchedId?: string
}

export interface CatalogImportParams {
  entityType: ImportEntityType
  filename:   string
  rows:       CatalogImportRow[]
}

export interface BatchImportResult {
  batchId:        string | null
  entityType:     ImportEntityType
  filename:       string
  createdCount:   number
  updatedCount:   number
  skippedCount:   number
  conflictCount:  number
  invalidCount:   number
  errors:         string[]
  createdRecords: { id: string; title: string; slug?: string }[]
  updatedRecords: { id: string; title: string; slug?: string }[]
}
