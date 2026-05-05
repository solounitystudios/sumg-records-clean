"use client"

import Link from "next/link"
import { useRef, useState, useTransition, useCallback } from "react"
import { processBMIImport, processDistroImport } from "@/app/actions/imports"
import type { ImportResult, ImportType } from "@/app/actions/imports"
import { detectConflicts, runCatalogImport } from "@/app/actions/catalog-import"
import type { RowConflict, RowAction, CatalogImportParams, BatchImportResult } from "@/lib/imports/types"
import { parseCSVText } from "@/lib/imports/csv"
import type { ImportEntityType, ColumnMapping, ImportPreview } from "@/lib/imports/types"
import { autoMapColumns, detectEntityType, getMissingRequiredFields } from "@/lib/imports/column-mapper"
import { getFieldDefs } from "@/lib/imports/field-defs"

// ─── Entity-type metadata ─────────────────────────────────────────────────────

interface EntityMeta {
  value:       ImportEntityType
  label:       string
  description: string
  columns:     string
  group:       'catalog' | 'rights'
  locked:      boolean
}

const ENTITY_TYPES: EntityMeta[] = [
  // Catalog row
  {
    value: 'artists',
    label: 'Artists',
    description: 'Import artist profiles from a spreadsheet',
    columns: 'Name, Bio, Genre, Spotify ID, Social links',
    group: 'catalog',
    locked: false,
  },
  {
    value: 'releases',
    label: 'Releases',
    description: 'Import albums, EPs, and singles',
    columns: 'Title, Artist, Release Date, UPC, Type',
    group: 'catalog',
    locked: false,
  },
  {
    value: 'songs',
    label: 'Songs',
    description: 'Import individual tracks and song metadata',
    columns: 'Title, Artist, ISRC, Track #, BPM, Duration',
    group: 'catalog',
    locked: false,
  },
  // Rights / Revenue row
  {
    value: 'bmi',
    label: 'BMI Works',
    description: 'BMI Songview catalog export',
    columns: 'Work Title, ISWC, Composer, Publisher, IPI',
    group: 'rights',
    locked: false,
  },
  {
    value: 'distro',
    label: 'Distribution',
    description: 'DistroKid/TuneCore earnings CSV',
    columns: 'Title, ISRC, Streams, Earnings, Store',
    group: 'rights',
    locked: false,
  },
  {
    value: 'soundexchange',
    label: 'SoundExchange',
    description: 'Scaffolded — format mapping coming soon',
    columns: 'Varies by statement type',
    group: 'rights',
    locked: true,
  },
]

// ─── Step types ───────────────────────────────────────────────────────────────

type Step = 'select' | 'map' | 'preview' | 'conflict' | 'result'

// New entity types that only have client-side preview (no DB writes yet)
const CATALOG_TYPES = new Set<ImportEntityType>(['artists', 'releases', 'songs'])
// Legacy types that go straight to DB via server actions
const LEGACY_TYPES  = new Set<ImportEntityType>(['bmi', 'distro', 'soundexchange'])

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPreview(
  file: File,
  entityType: ImportEntityType,
  mappings: ColumnMapping[],
  rawRows: string[][],
  rawHeaders: string[],
): ImportPreview {
  const fields = getFieldDefs(entityType)
  const requiredMissing = getMissingRequiredFields(mappings, entityType)

  const sampleRows = rawRows.slice(0, 10).map((row, idx) => {
    const raw: Record<string, string> = {}
    const mapped: Record<string, string> = {}
    const issues: string[] = []

    rawHeaders.forEach((h, i) => {
      raw[h] = row[i] ?? ''
    })

    mappings.forEach(m => {
      if (m.targetField) {
        mapped[m.targetField] = raw[m.csvHeader] ?? ''
      }
    })

    // Check required fields have values
    fields.filter(f => f.required).forEach(f => {
      if (!mapped[f.key]) {
        issues.push(`Missing required field: ${f.label}`)
      }
    })

    return { rowIndex: idx + 1, raw, mapped, issues }
  })

  const mappedCount   = mappings.filter(m => m.targetField !== null).length
  const unmappedCount = mappings.filter(m => m.targetField === null).length

  return {
    entityType,
    filename: file.name,
    totalRows: rawRows.length,
    columnMappings: mappings,
    sampleRows,
    stats: {
      mappedColumns:   mappedCount,
      unmappedColumns: unmappedCount,
      requiredMissing,
    },
  }
}

function buildAllMappedRows(
  rHeaders: string[],
  rRows: string[][],
  cms: ColumnMapping[],
): { rowIndex: number; mapped: Record<string, string> }[] {
  return rRows.map((row, idx) => {
    const mapped: Record<string, string> = {}
    cms.forEach(m => {
      if (m.targetField) {
        const colIdx = rHeaders.indexOf(m.csvHeader)
        mapped[m.targetField] = colIdx >= 0 ? (row[colIdx] ?? '') : ''
      }
    })
    return { rowIndex: idx + 1, mapped }
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 0.9) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        auto
      </span>
    )
  }
  if (confidence >= 0.5) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
        ~match
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/[0.04] text-white/30 border border-white/[0.07]">
      unmapped
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    new:            { label: 'new',            className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    exact_match:    { label: 'exact match',    className: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
    possible_match: { label: 'possible match', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    conflict:       { label: 'conflict',       className: 'bg-red-500/10 text-red-400 border-red-500/20' },
    invalid:        { label: 'invalid',        className: 'bg-white/[0.04] text-white/30 border-white/[0.07]' },
  }
  const cfg = configs[status] ?? configs.invalid
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono border ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

interface PhaseBarProps {
  entityType: ImportEntityType
  totalRows: number
  onProcess: () => void
  onDetect: () => void
  isPending: boolean
  isDetecting: boolean
}

function PhaseBar({ entityType, totalRows, onProcess, onDetect, isPending, isDetecting }: PhaseBarProps) {
  const isCatalog = CATALOG_TYPES.has(entityType)
  const isLegacy  = LEGACY_TYPES.has(entityType)

  const phases = [
    { label: 'Parse & Map',        done: true,  locked: false },
    { label: 'Conflict Detection', done: false, locked: isCatalog ? false : true },
    { label: 'Write to Database',  done: false, locked: true  },
    { label: 'BMI Matching',       done: false, locked: true  },
    { label: 'Dashboard Warnings', done: false, locked: true  },
  ]

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] p-5 space-y-4">
      <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/30">Import Pipeline</p>

      {/* Phase steps */}
      <div className="flex gap-0">
        {phases.map((phase, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            {/* Connector line + dot */}
            <div className="flex items-center w-full">
              {i > 0 && (
                <div className={`flex-1 h-px ${phase.done ? 'bg-emerald-500/50' : 'bg-white/[0.07]'}`} />
              )}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 border ${
                  phase.done
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-white/[0.03] border-white/[0.08] text-white/20'
                }`}
              >
                {phase.done ? '✓' : String(i + 1)}
              </div>
              {i < phases.length - 1 && (
                <div className={`flex-1 h-px ${phase.done ? 'bg-emerald-500/50' : 'bg-white/[0.07]'}`} />
              )}
            </div>
            <p className={`text-[9px] text-center leading-tight ${phase.done ? 'text-emerald-400/70' : 'text-white/20'}`}>
              {phase.label}
            </p>
            {i === 2 && phase.locked && (
              <span className="text-[8px] text-white/20 border border-white/[0.06] rounded px-1 py-0.5">
                no writes yet
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Action */}
      <div className="pt-1 flex items-center gap-3">
        {isLegacy && entityType !== 'soundexchange' && (
          <button
            onClick={onProcess}
            disabled={isPending}
            className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-50 disabled:cursor-wait"
          >
            {isPending ? 'Processing…' : `Process ${totalRows} Rows →`}
          </button>
        )}

        {entityType === 'soundexchange' && (
          <button
            disabled
            className="rounded-full bg-white/[0.05] border border-white/[0.08] px-6 py-2.5 text-sm font-medium text-white/30 cursor-not-allowed"
          >
            Process {totalRows} Rows →
          </button>
        )}

        {isCatalog && (
          <div className="flex items-center gap-3">
            <button
              onClick={onDetect}
              disabled={isPending || isDetecting}
              className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-50 disabled:cursor-wait"
            >
              {isDetecting ? 'Detecting…' : `Detect Conflicts in ${totalRows} Rows →`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ImportClient() {
  const fileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  // Step machine
  const [step, setStep] = useState<Step>('select')

  // Selection step state
  const [selectedType,  setSelectedType]  = useState<ImportEntityType>('artists')
  const [parseError,    setParseError]    = useState<string | null>(null)
  const [isDragging,    setIsDragging]    = useState(false)

  // Map step state
  const [mappings,      setMappings]      = useState<ColumnMapping[]>([])
  const [rawHeaders,    setRawHeaders]    = useState<string[]>([])
  const [rawRows,       setRawRows]       = useState<string[][]>([])
  const [currentFile,   setCurrentFile]   = useState<File | null>(null)
  const [detectedType,  setDetectedType]  = useState<ImportEntityType | null>(null)

  // Preview step state
  const [preview,       setPreview]       = useState<ImportPreview | null>(null)

  // Legacy BMI/Distro processing
  const [result,        setResult]        = useState<ImportResult | null>(null)
  const [isPending,     startTransition]  = useTransition()

  // Conflict detection state
  const [conflicts,     setConflicts]     = useState<RowConflict[]>([])
  const [rowActions,    setRowActions]    = useState<Record<number, RowAction>>({})
  const [batchResult,   setBatchResult]   = useState<BatchImportResult | null>(null)
  const [isDetecting,   setIsDetecting]   = useState(false)
  const [isImporting,   setIsImporting]   = useState(false)
  const [detectError,   setDetectError]   = useState<string | null>(null)

  // ── Parse file and go to map step ──────────────────────────────────────────

  const parseAndGoToMap = useCallback((file: File, entityType: ImportEntityType) => {
    setParseError(null)
    setResult(null)
    setPreview(null)

    const reader = new FileReader()
    reader.onload = evt => {
      const text = evt.target?.result as string
      if (!text) { setParseError('Could not read file.'); return }

      const parsed = parseCSVText(text)
      if (parsed.headers.length === 0) { setParseError('No headers found. Check file format.'); return }

      const detected = detectEntityType(parsed.headers)
      const finalType = entityType

      setDetectedType(detected.type !== entityType ? detected.type : null)
      setRawHeaders(parsed.headers)
      setRawRows(parsed.rows)
      setCurrentFile(file)
      setSelectedType(finalType)
      setMappings(autoMapColumns(parsed.headers, finalType))
      setStep('map')
    }
    reader.onerror = () => setParseError('Failed to read file.')
    reader.readAsText(file)
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    parseAndGoToMap(file, selectedType)
    // Reset file input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Drag-and-drop handlers ─────────────────────────────────────────────────

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }
  function handleDragLeave() {
    setIsDragging(false)
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) parseAndGoToMap(file, selectedType)
  }

  // ── Map step: update a single mapping ──────────────────────────────────────

  function updateMapping(csvHeader: string, newTargetField: string | null) {
    setMappings(prev => {
      // If claiming a field already used, clear it from the other mapping
      const updated = prev.map(m => {
        if (m.csvHeader === csvHeader) {
          return { ...m, targetField: newTargetField, manuallySet: true, confidence: newTargetField ? 1.0 : 0 }
        }
        // Clear duplicate
        if (newTargetField && m.targetField === newTargetField) {
          return { ...m, targetField: null, confidence: 0, manuallySet: true }
        }
        return m
      })
      return updated
    })
  }

  // ── Map step: go to preview ────────────────────────────────────────────────

  function handleGoToPreview() {
    if (!currentFile) return
    const built = buildPreview(currentFile, selectedType, mappings, rawRows, rawHeaders)
    setPreview(built)
    setStep('preview')
  }

  // ── Preview step: process (BMI/Distro only) ────────────────────────────────

  function handleProcess() {
    if (!preview || !currentFile) return
    const fd = new FormData()
    fd.set('file', currentFile)
    startTransition(async () => {
      let r: ImportResult
      if (preview.entityType === 'bmi') {
        r = await processBMIImport(fd)
      } else if (preview.entityType === 'distro') {
        r = await processDistroImport(fd)
      } else {
        r = {
          importType: preview.entityType as ImportType,
          totalRows: 0,
          matched: 0,
          created: 0,
          updated: 0,
          skipped: 0,
          errors: ['SoundExchange import not yet implemented.'],
          logId: null,
        }
      }
      setResult(r)
      setStep('select')
    })
  }

  // ── Conflict detection ─────────────────────────────────────────────────────

  async function handleDetectConflicts() {
    if (!preview) return
    setIsDetecting(true)
    setDetectError(null)
    try {
      const allMapped = buildAllMappedRows(rawHeaders, rawRows, mappings)
      const results = await detectConflicts(preview.entityType, allMapped)
      setConflicts(results)
      // Initialize rowActions from suggested actions
      const initial: Record<number, RowAction> = {}
      results.forEach(c => { initial[c.rowIndex] = c.action })
      setRowActions(initial)
      setStep('conflict')
    } catch (e) {
      setDetectError(e instanceof Error ? e.message : 'Detection failed')
    } finally {
      setIsDetecting(false)
    }
  }

  // ── Run import ─────────────────────────────────────────────────────────────

  async function handleRunImport() {
    if (!preview || !currentFile) return
    setIsImporting(true)
    try {
      const allMapped = buildAllMappedRows(rawHeaders, rawRows, mappings)
      const rows: CatalogImportParams['rows'] = conflicts.map(c => {
        const action = rowActions[c.rowIndex] ?? c.action
        const mappedRow = allMapped.find(r => r.rowIndex === c.rowIndex)
        return {
          rowIndex:  c.rowIndex,
          mapped:    mappedRow?.mapped ?? {},
          action,
          matchedId: c.matchedId,
        }
      })
      const importResult = await runCatalogImport({
        entityType: preview.entityType,
        filename:   preview.filename,
        rows,
      })
      setBatchResult(importResult)
      setStep('result')
    } catch (e) {
      setDetectError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  function reset() {
    setStep('select')
    setPreview(null)
    setResult(null)
    setParseError(null)
    setMappings([])
    setRawHeaders([])
    setRawRows([])
    setCurrentFile(null)
    setDetectedType(null)
    setConflicts([])
    setRowActions({})
    setBatchResult(null)
    setDetectError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  const missingRequired = getMissingRequiredFields(mappings, selectedType)
  const fields          = getFieldDefs(selectedType)

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── STEP: SELECT ─────────────────────────────────────────────────── */}
      {step === 'select' && (
        <>
          {/* Catalog row */}
          <div className="space-y-2">
            <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/30">Catalog</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {ENTITY_TYPES.filter(t => t.group === 'catalog').map(t => (
                <button
                  key={t.value}
                  type="button"
                  disabled={t.locked}
                  onClick={() => !t.locked && setSelectedType(t.value)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    t.locked
                      ? 'border-white/[0.04] bg-[#0d1016] opacity-40 cursor-not-allowed'
                      : selectedType === t.value
                        ? 'border-violet-500/40 bg-violet-500/[0.07]'
                        : 'border-white/[0.07] bg-[#0d1016] hover:border-white/15'
                  }`}
                >
                  <p className={`text-sm font-medium ${selectedType === t.value && !t.locked ? 'text-violet-300' : 'text-white/80'}`}>
                    {t.label}
                  </p>
                  <p className="text-[10px] text-white/30 mt-1 leading-snug">{t.description}</p>
                  <p className="text-[9px] text-white/20 mt-2 font-mono leading-snug">{t.columns}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Rights / Revenue row */}
          <div className="space-y-2">
            <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-white/30">Rights / Revenue</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {ENTITY_TYPES.filter(t => t.group === 'rights').map(t => (
                <button
                  key={t.value}
                  type="button"
                  disabled={t.locked}
                  onClick={() => !t.locked && setSelectedType(t.value)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    t.locked
                      ? 'border-white/[0.04] bg-[#0d1016] opacity-40 cursor-not-allowed'
                      : selectedType === t.value
                        ? 'border-violet-500/40 bg-violet-500/[0.07]'
                        : 'border-white/[0.07] bg-[#0d1016] hover:border-white/15'
                  }`}
                >
                  <p className={`text-sm font-medium ${selectedType === t.value && !t.locked ? 'text-violet-300' : 'text-white/80'}`}>
                    {t.label}
                  </p>
                  <p className="text-[10px] text-white/30 mt-1 leading-snug">{t.description}</p>
                  <p className="text-[9px] text-white/20 mt-2 font-mono leading-snug">{t.columns}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          <div
            ref={dropRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl px-8 py-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
              isDragging
                ? 'border-violet-500/40 bg-violet-500/[0.05]'
                : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
            }`}
          >
            <div className="text-2xl text-white/20">↑</div>
            <p className="text-sm text-white/40">
              Click to select or drag &amp; drop a{' '}
              <span className="text-white/60">
                {ENTITY_TYPES.find(t => t.value === selectedType)?.label}
              </span>{' '}
              CSV
            </p>
            <p className="text-[10px] text-white/20">CSV or TSV file</p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,.txt"
            className="hidden"
            onChange={handleFileChange}
          />

          {parseError && (
            <p className="text-xs text-red-400 border border-red-500/20 bg-red-500/5 rounded-xl px-4 py-2">
              {parseError}
            </p>
          )}

          {/* Result panel (for BMI/Distro after successful import) */}
          {result && (
            <div className="space-y-4 pt-2">
              <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] p-5">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 mb-4">Import Complete</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Rows', value: result.totalRows, color: undefined },
                    { label: 'Created',    value: result.created,   color: result.created > 0 ? 'text-violet-400' : 'text-white/40' },
                    { label: 'Updated',    value: result.updated,   color: result.updated > 0 ? 'text-emerald-400' : 'text-white/40' },
                    { label: 'Skipped',    value: result.skipped,   color: result.skipped > 0 ? 'text-amber-400' : 'text-white/40' },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <p className={`text-xl font-semibold tabular-nums font-mono ${color ?? 'text-white/70'}`}>{value}</p>
                      <p className="text-[9px] text-white/30 mt-0.5 uppercase tracking-wider">{label}</p>
                    </div>
                  ))}
                </div>
                {(result.createdArtists !== undefined || result.createdReleases !== undefined || result.createdSongs !== undefined || result.updatedSongs !== undefined) && (
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-white/[0.04] pt-3">
                    {[
                      { label: 'Artists created',  value: result.createdArtists  ?? 0 },
                      { label: 'Releases created', value: result.createdReleases ?? 0 },
                      { label: 'Songs created',    value: result.createdSongs    ?? 0 },
                      { label: 'Songs updated',    value: result.updatedSongs    ?? 0 },
                    ].map(({ label, value }) => (
                      <span key={label} className="text-[10px] font-mono text-white/30">
                        <span className="text-white/60">{value}</span> {label}
                      </span>
                    ))}
                  </div>
                )}
                {result.logId && (
                  <p className="text-[9px] text-white/20 mt-4 font-mono">Log: <span>{result.logId}</span></p>
                )}
              </div>

              {result.updatedEntities && result.updatedEntities.length > 0 && (
                <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400/70">
                      Updated Records ({result.updatedEntities.length})
                    </p>
                    <Link
                      href="/admin/songs"
                      className="text-[9px] font-mono text-emerald-400/40 hover:text-emerald-400/80 transition-colors duration-150 tracking-wider"
                    >
                      View All Songs →
                    </Link>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {result.updatedEntities.slice(0, 20).map(e => (
                      <Link
                        key={e.id}
                        href={e.slug ? `/admin/songs/${e.id}/edit` : '/admin/songs'}
                        className="flex items-center gap-2 px-2 py-1.5 -mx-2 rounded hover:bg-emerald-500/[0.06] transition-all duration-150 group"
                      >
                        <span className="h-1 w-1 rounded-full bg-emerald-400/40 shrink-0" />
                        <span className="text-[11px] text-emerald-400/70 group-hover:text-emerald-400/90 transition-colors duration-150 truncate">
                          {e.title}
                        </span>
                        <span className="text-[9px] font-mono text-emerald-400/25 ml-auto shrink-0 group-hover:text-emerald-400/50 transition-colors duration-150">→</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4 space-y-1">
                  <p className="text-[10px] font-mono text-amber-400 tracking-wider">
                    {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}
                  </p>
                  {result.errors.slice(0, 10).map((e, i) => (
                    <p key={i} className="text-[11px] text-amber-400/60">{e}</p>
                  ))}
                </div>
              )}

              {result.skippedReasons && result.skippedReasons.length > 0 && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] font-mono text-white/30 tracking-wider mb-2">
                    {result.skippedReasons.length} skipped row{result.skippedReasons.length !== 1 ? 's' : ''}
                  </p>
                  <div className="space-y-0.5 max-h-32 overflow-y-auto">
                    {result.skippedReasons.slice(0, 20).map((r, i) => (
                      <p key={i} className="text-[10px] text-white/25 font-mono">{r}</p>
                    ))}
                    {result.skippedReasons.length > 20 && (
                      <p className="text-[10px] text-white/20 font-mono">…and {result.skippedReasons.length - 20} more</p>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={reset}
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/70 transition-all duration-150 hover:border-white/40 hover:text-white"
              >
                Import Another File
              </button>
            </div>
          )}
        </>
      )}

      {/* ── STEP: MAP ────────────────────────────────────────────────────── */}
      {step === 'map' && currentFile && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/70">{currentFile.name}</p>
              <p className="text-[10px] text-white/30 mt-0.5">
                {rawRows.length} rows · {rawHeaders.length} columns ·{' '}
                <span className="text-violet-400/60">
                  {ENTITY_TYPES.find(t => t.value === selectedType)?.label}
                </span>
              </p>
            </div>
            <button
              onClick={reset}
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              ← Back
            </button>
          </div>

          {/* Auto-detect override prompt */}
          {detectedType && detectedType !== selectedType && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3 flex items-center justify-between gap-4">
              <p className="text-[11px] text-amber-300/80">
                This CSV looks like{' '}
                <span className="font-medium text-amber-200">
                  {ENTITY_TYPES.find(t => t.value === detectedType)?.label}
                </span>{' '}
                — currently mapping as{' '}
                <span className="font-medium">
                  {ENTITY_TYPES.find(t => t.value === selectedType)?.label}
                </span>
              </p>
              <button
                onClick={() => {
                  if (!currentFile || !detectedType) return
                  setSelectedType(detectedType)
                  setMappings(autoMapColumns(rawHeaders, detectedType))
                  setDetectedType(null)
                }}
                className="text-[10px] text-amber-400 border border-amber-500/30 rounded-full px-3 py-1 hover:bg-amber-500/10 transition-colors whitespace-nowrap"
              >
                Switch to {ENTITY_TYPES.find(t => t.value === detectedType)?.label}
              </button>
            </div>
          )}

          {/* Summary bar */}
          <div className="flex flex-wrap items-center gap-3 text-[10px]">
            <span className="text-emerald-400/70">
              {mappings.filter(m => m.targetField).length} columns mapped
            </span>
            <span className="text-white/20">·</span>
            <span className="text-white/40">
              {mappings.filter(m => !m.targetField).length} unmapped
            </span>
            {missingRequired.length > 0 && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-red-400/70">
                  Required missing:{' '}
                  {missingRequired.map(k => fields.find(f => f.key === k)?.label ?? k).join(', ')}
                </span>
              </>
            )}
          </div>

          {/* Mapping table */}
          <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_1fr_auto] px-4 py-2 border-b border-white/[0.05]">
              <span className="text-[9px] text-white/25 uppercase tracking-wide">CSV Column</span>
              <span />
              <span className="text-[9px] text-white/25 uppercase tracking-wide">Target Field</span>
              <span className="text-[9px] text-white/25 uppercase tracking-wide text-right">Confidence</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {mappings.map(m => (
                <div
                  key={m.csvHeader}
                  className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3 px-4 py-2.5"
                >
                  {/* CSV header pill */}
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-white/[0.04] rounded border border-white/[0.06] text-white/50 truncate">
                    {m.csvHeader}
                  </span>

                  {/* Arrow */}
                  <span className="text-white/20 text-xs">→</span>

                  {/* Target field select */}
                  <select
                    value={m.targetField ?? ''}
                    onChange={e => updateMapping(m.csvHeader, e.target.value || null)}
                    className="bg-[#0d1016] border border-white/[0.08] rounded-md px-2 py-1 text-[11px] text-white/60 focus:outline-none focus:border-violet-500/40 focus:text-white/80 transition-colors w-full"
                  >
                    <option value="">Ignore / Skip</option>
                    {fields.map(f => (
                      <option key={f.key} value={f.key}>
                        {f.label}{f.required ? ' *' : ''}
                      </option>
                    ))}
                  </select>

                  {/* Confidence badge */}
                  <div className="flex justify-end">
                    <ConfidenceBadge confidence={m.confidence} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white"
            >
              ← Back
            </button>
            <button
              onClick={handleGoToPreview}
              disabled={missingRequired.length > 0}
              className="rounded-full bg-violet-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Preview Rows →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: PREVIEW ─────────────────────────────────────────────────── */}
      {step === 'preview' && preview && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/70">{preview.filename}</p>
              <p className="text-[10px] text-white/30 mt-0.5">
                {preview.totalRows} rows · {ENTITY_TYPES.find(t => t.value === preview.entityType)?.label}
              </p>
            </div>
            <button
              onClick={() => setStep('map')}
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              ← Edit Mapping
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Rows',       value: String(preview.totalRows)             },
              { label: 'Mapped Columns',   value: String(preview.stats.mappedColumns)   },
              { label: 'Required Fields',  value: preview.stats.requiredMissing.length === 0 ? 'All present' : `${preview.stats.requiredMissing.length} missing` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-white/[0.07] bg-[#0d1016] px-4 py-3">
                <p className="text-base font-semibold text-white/70 font-mono tabular-nums">{value}</p>
                <p className="text-[9px] text-white/30 mt-0.5 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>

          {/* Sample rows table */}
          {(() => {
            const mappedFields = preview.columnMappings
              .filter(m => m.targetField !== null)
              .map(m => ({ csvHeader: m.csvHeader, targetField: m.targetField as string }))
            const fieldLabels = getFieldDefs(preview.entityType)

            return (
              <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] overflow-x-auto">
                <p className="text-[9px] text-white/25 uppercase tracking-wide px-4 pt-3 pb-2">
                  Preview — first {preview.sampleRows.length} rows
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-t border-white/[0.05]">
                      {mappedFields.map(mf => {
                        const fieldLabel = fieldLabels.find(f => f.key === mf.targetField)?.label ?? mf.targetField
                        return (
                          <th
                            key={mf.targetField}
                            className="px-3 py-2 text-left text-[10px] text-white/30 font-medium whitespace-nowrap border-r border-white/[0.04] last:border-r-0"
                          >
                            {fieldLabel}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sampleRows.map(row => (
                      <tr
                        key={row.rowIndex}
                        className={`border-t border-white/[0.04] ${row.issues.length > 0 ? 'border-l-2 border-l-amber-500/40' : ''}`}
                      >
                        {mappedFields.map(mf => (
                          <td
                            key={mf.targetField}
                            className="px-3 py-2 text-white/50 whitespace-nowrap max-w-[160px] overflow-hidden text-ellipsis border-r border-white/[0.03] last:border-r-0"
                          >
                            {row.mapped[mf.targetField] || (
                              <span className="text-white/15">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}

          {detectError && (
            <p className="text-xs text-red-400 border border-red-500/20 bg-red-500/5 rounded-xl px-4 py-2">{detectError}</p>
          )}

          {/* Phase progress bar + actions */}
          <PhaseBar
            entityType={preview.entityType}
            totalRows={preview.totalRows}
            onProcess={handleProcess}
            onDetect={handleDetectConflicts}
            isPending={isPending}
            isDetecting={isDetecting}
          />

          {/* Start Over */}
          <button
            onClick={reset}
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white"
          >
            ← Start Over
          </button>
        </div>
      )}

      {/* ── STEP: CONFLICT ───────────────────────────────────────────────── */}
      {step === 'conflict' && preview && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/70">{preview.filename}</p>
              <p className="text-[10px] text-white/30 mt-0.5">
                {conflicts.length} rows analyzed · {ENTITY_TYPES.find(t => t.value === preview.entityType)?.label}
              </p>
            </div>
            <button onClick={() => setStep('preview')} className="text-xs text-white/30 hover:text-white/60 transition-colors">
              ← Back
            </button>
          </div>

          {/* Summary counts */}
          {(() => {
            const buckets = [
              { label: 'New',         status: 'new',            color: 'text-emerald-400' },
              { label: 'Exact Match', status: 'exact_match',    color: 'text-sky-400' },
              { label: 'Possible',    status: 'possible_match', color: 'text-amber-400' },
              { label: 'Conflict',    status: 'conflict',       color: 'text-red-400' },
              { label: 'Invalid',     status: 'invalid',        color: 'text-white/30' },
            ]
            return (
              <div className="grid grid-cols-5 gap-2">
                {buckets.map(({ label, status, color }) => {
                  const count = conflicts.filter(c => c.status === status).length
                  return (
                    <div key={status} className="rounded-xl border border-white/[0.07] bg-[#0d1016] px-3 py-3 text-center">
                      <p className={`text-xl font-semibold font-mono tabular-nums ${color}`}>{count}</p>
                      <p className="text-[9px] text-white/30 mt-1 uppercase tracking-wider leading-tight">{label}</p>
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {/* Row table */}
          <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
            <div className="overflow-x-auto" style={{ maxHeight: '480px', overflowY: 'auto' }}>
              <table className="w-full text-xs" style={{ minWidth: '720px' }}>
                <thead>
                  <tr className="border-b border-white/[0.05] bg-[#0d1016]" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    {['#', 'Title', 'Artist / Writer', 'Status', 'Conf.', 'Matched Record', 'Action'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[9px] text-white/30 font-medium uppercase tracking-wide whitespace-nowrap border-r border-white/[0.04] last:border-r-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {conflicts.map(c => {
                    const allMapped = buildAllMappedRows(rawHeaders, rawRows, mappings)
                    const rowData = allMapped.find(r => r.rowIndex === c.rowIndex)?.mapped ?? {}
                    const title  = rowData.title  || rowData.name  || '—'
                    const artist = rowData.artist_name || rowData.writer_name || '—'
                    const action = rowActions[c.rowIndex] ?? c.action
                    const canUpdate = !!c.matchedId
                    return (
                      <tr key={c.rowIndex} className="border-t border-white/[0.03] hover:bg-white/[0.01]">
                        <td className="px-3 py-2 text-white/20 font-mono border-r border-white/[0.03]">{c.rowIndex}</td>
                        <td className="px-3 py-2 text-white/60 max-w-[160px] truncate border-r border-white/[0.03]" title={title}>{title}</td>
                        <td className="px-3 py-2 text-white/40 max-w-[140px] truncate border-r border-white/[0.03]" title={artist}>{artist}</td>
                        <td className="px-3 py-2 border-r border-white/[0.03]"><StatusBadge status={c.status} /></td>
                        <td className="px-3 py-2 text-white/30 font-mono border-r border-white/[0.03]">{Math.round(c.confidence * 100)}%</td>
                        <td className="px-3 py-2 border-r border-white/[0.03]">
                          {c.matchedTitle ? (
                            <span className="text-white/40 truncate block max-w-[140px]" title={c.matchedTitle}>
                              {c.matchedTitle}
                              {c.matchedField && <span className="text-white/20 ml-1">via {c.matchedField}</span>}
                            </span>
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                          {c.conflictReason && (
                            <span className="text-[9px] text-amber-400/50 block mt-0.5 truncate max-w-[140px]" title={c.conflictReason}>
                              {c.conflictReason}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={action}
                            onChange={e => setRowActions(prev => ({ ...prev, [c.rowIndex]: e.target.value as RowAction }))}
                            className="bg-[#0d1016] border border-white/[0.08] rounded-md px-2 py-1 text-[10px] text-white/60 focus:outline-none focus:border-violet-500/40 transition-colors"
                          >
                            <option value="import_as_new">Import as New</option>
                            <option value="update_existing" disabled={!canUpdate}>Update Existing</option>
                            <option value="skip">Skip</option>
                            <option value="merge_later">Merge Later</option>
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {detectError && (
            <p className="text-xs text-red-400 border border-red-500/20 bg-red-500/5 rounded-xl px-4 py-2">{detectError}</p>
          )}

          {/* Actions */}
          {(() => {
            const writeCount = Object.values(rowActions).filter(a => a === 'import_as_new' || a === 'update_existing').length
            const skipCount  = Object.values(rowActions).filter(a => a === 'skip').length
            const deferCount = Object.values(rowActions).filter(a => a === 'merge_later').length
            return (
              <div className="flex items-center gap-4 flex-wrap">
                <button
                  onClick={handleRunImport}
                  disabled={isImporting || writeCount === 0}
                  className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isImporting ? 'Importing…' : `Import ${writeCount} Rows →`}
                </button>
                <p className="text-[10px] text-white/30">
                  {writeCount} will write · {skipCount} skipped · {deferCount} deferred
                </p>
              </div>
            )
          })()}
        </div>
      )}

      {/* ── STEP: RESULT ─────────────────────────────────────────────────── */}
      {step === 'result' && batchResult && (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-white/70">Import Complete</p>
            <p className="text-[10px] text-white/30 mt-0.5">{batchResult.filename}</p>
          </div>

          {/* Summary counts */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Created',   value: batchResult.createdCount,  color: 'text-emerald-400' },
              { label: 'Updated',   value: batchResult.updatedCount,  color: 'text-sky-400' },
              { label: 'Skipped',   value: batchResult.skippedCount,  color: 'text-white/40' },
              { label: 'Conflicts', value: batchResult.conflictCount, color: 'text-amber-400' },
              { label: 'Invalid',   value: batchResult.invalidCount,  color: 'text-white/25' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-white/[0.07] bg-[#0d1016] px-4 py-3 text-center">
                <p className={`text-2xl font-semibold font-mono tabular-nums ${color}`}>{value}</p>
                <p className="text-[9px] text-white/30 mt-0.5 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>

          {/* Created records */}
          {batchResult.createdRecords.length > 0 && (
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] p-4">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400/70 mb-3">
                Created ({batchResult.createdRecords.length})
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {batchResult.createdRecords.slice(0, 20).map(r => (
                  <div key={r.id} className="flex items-center gap-2 text-[11px]">
                    <span className="h-1 w-1 rounded-full bg-emerald-400/40 shrink-0" />
                    <span className="text-emerald-400/70 truncate">{r.title}</span>
                    {r.slug && <span className="text-emerald-400/25 font-mono text-[9px] ml-auto shrink-0">/{r.slug}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Updated records */}
          {batchResult.updatedRecords.length > 0 && (
            <div className="rounded-xl border border-sky-500/15 bg-sky-500/[0.03] p-4">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-sky-400/70 mb-3">
                Updated ({batchResult.updatedRecords.length})
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {batchResult.updatedRecords.slice(0, 20).map(r => (
                  <div key={r.id} className="flex items-center gap-2 text-[11px]">
                    <span className="h-1 w-1 rounded-full bg-sky-400/40 shrink-0" />
                    <span className="text-sky-400/70 truncate">{r.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {batchResult.errors.length > 0 && (
            <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4 space-y-1">
              <p className="text-[10px] font-mono text-amber-400 tracking-wider">
                {batchResult.errors.length} error{batchResult.errors.length !== 1 ? 's' : ''}
              </p>
              {batchResult.errors.slice(0, 10).map((e, i) => (
                <p key={i} className="text-[11px] text-amber-400/60">{e}</p>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="flex flex-wrap gap-3 pt-1">
            {(batchResult.entityType === 'releases') && (
              <Link href="/admin/releases" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white">
                View Releases →
              </Link>
            )}
            {(batchResult.entityType === 'songs') && (
              <Link href="/admin/songs" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white">
                View Songs →
              </Link>
            )}
            {(batchResult.entityType === 'artists') && (
              <Link href="/admin/artists" className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white">
                View Artists →
              </Link>
            )}
            <button
              onClick={reset}
              className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white"
            >
              Import Another File
            </button>
          </div>

          {batchResult.batchId && (
            <p className="text-[9px] text-white/20 font-mono">Batch: {batchResult.batchId}</p>
          )}
        </div>
      )}

    </div>
  )
}
