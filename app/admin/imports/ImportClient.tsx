"use client"

import { useRef, useState, useTransition } from "react"
import { processBMIImport, processDistroImport } from "@/app/actions/imports"
import type { ImportResult, ImportType } from "@/app/actions/imports"
import { parseCSVText } from "@/lib/imports/csv"

const IMPORT_TYPES: { value: ImportType; label: string; description: string; columns: string }[] = [
  {
    value: "bmi",
    label: "BMI Catalog Export",
    description: "BMI Songview or catalog export. Updates songwriter credits, PRO assignment, composition status, and BMI work URLs on matched songs.",
    columns: "Work Title, ISWC, Composer, Publisher, IPI/CAE, Registration Status",
  },
  {
    value: "distro",
    label: "Distribution Export",
    description: "DistroKid, TuneCore, or generic distributor earnings CSV. Matches songs by ISRC and backfills missing ISRC values.",
    columns: "Title, Artists, ISRC, UPC, Quantity/Streams, Earnings (USD), Store",
  },
  {
    value: "soundexchange",
    label: "SoundExchange Report",
    description: "SoundExchange digital performance royalty statement. Scaffolded — format mapping coming soon.",
    columns: "Varies by statement type",
  },
]

interface PreviewState {
  importType: ImportType
  headers: string[]
  sampleRows: string[][]
  totalRows: number
  file: File
}

export function ImportClient() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedType, setSelectedType] = useState<ImportType>("bmi")
  const [preview, setPreview]     = useState<PreviewState | null>(null)
  const [result, setResult]       = useState<ImportResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const [parseError, setParseError] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError(null)
    setResult(null)
    setPreview(null)

    const reader = new FileReader()
    reader.onload = evt => {
      const text = evt.target?.result as string
      if (!text) { setParseError("Could not read file."); return }
      const parsed = parseCSVText(text)
      if (parsed.headers.length === 0) { setParseError("No headers found. Check file format."); return }
      setPreview({
        importType: selectedType,
        headers: parsed.headers,
        sampleRows: parsed.rows.slice(0, 5),
        totalRows: parsed.totalRows,
        file,
      })
    }
    reader.onerror = () => setParseError("Failed to read file.")
    reader.readAsText(file)
  }

  function handleProcess() {
    if (!preview) return
    const fd = new FormData()
    fd.set("file", preview.file)
    startTransition(async () => {
      let r: ImportResult
      if (preview.importType === "bmi") {
        r = await processBMIImport(fd)
      } else if (preview.importType === "distro") {
        r = await processDistroImport(fd)
      } else {
        r = { importType: preview.importType, totalRows: 0, matched: 0, created: 0, updated: 0, skipped: 0, errors: ["SoundExchange import not yet implemented."], logId: null }
      }
      setResult(r)
      setPreview(null)
    })
  }

  function reset() {
    setPreview(null)
    setResult(null)
    setParseError(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  const selectedMeta = IMPORT_TYPES.find(t => t.value === selectedType)!

  return (
    <div className="space-y-6">

      {/* Type selector */}
      {!preview && !result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {IMPORT_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setSelectedType(t.value)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  selectedType === t.value
                    ? "border-white/25 bg-white/[0.06]"
                    : "border-white/[0.07] bg-[#0d1016] hover:border-white/15"
                }`}
              >
                <p className="text-sm font-medium text-white/80">{t.label}</p>
                <p className="text-[10px] text-white/30 mt-1 leading-snug">{t.description}</p>
                <p className="text-[9px] text-white/20 mt-2 font-mono leading-snug">{t.columns}</p>
              </button>
            ))}
          </div>

          {/* File drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-white/10 rounded-2xl px-8 py-10 flex flex-col items-center gap-3 cursor-pointer hover:border-white/20 hover:bg-white/[0.02] transition-colors"
          >
            <div className="text-2xl text-white/20">↑</div>
            <p className="text-sm text-white/40">Click to select {selectedMeta.label}</p>
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
        </>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/70">{preview.file.name}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{preview.totalRows} rows · {preview.headers.length} columns · {IMPORT_TYPES.find(t => t.value === preview.importType)?.label}</p>
            </div>
            <button onClick={reset} className="text-xs text-white/30 hover:text-white/60 transition-colors">← Back</button>
          </div>

          {/* Column headers */}
          <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] px-4 py-3">
            <p className="text-[9px] text-white/25 uppercase tracking-wide mb-2">Detected Columns</p>
            <div className="flex flex-wrap gap-1.5">
              {preview.headers.map((h, i) => (
                <span key={i} className="text-[10px] font-mono px-2 py-0.5 bg-white/[0.05] rounded border border-white/[0.07] text-white/50">
                  {h}
                </span>
              ))}
            </div>
          </div>

          {/* Sample rows */}
          <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] overflow-x-auto">
            <p className="text-[9px] text-white/25 uppercase tracking-wide px-4 pt-3 pb-2">Preview (first {preview.sampleRows.length} rows)</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-t border-white/[0.05]">
                  {preview.headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left text-[10px] text-white/30 font-medium whitespace-nowrap border-r border-white/[0.04] last:border-r-0">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.sampleRows.map((row, ri) => (
                  <tr key={ri} className="border-t border-white/[0.04]">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-white/50 whitespace-nowrap max-w-[160px] overflow-hidden text-ellipsis border-r border-white/[0.03] last:border-r-0">
                        {cell || <span className="text-white/15">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleProcess}
              disabled={isPending}
              className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-50 disabled:cursor-wait"
            >
              {isPending ? "Processing…" : `Process ${preview.totalRows} Rows →`}
            </button>
            <button
              onClick={reset}
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] p-5">
            <p className="text-sm font-medium text-white/70 mb-4">Import Complete</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Rows",  value: result.totalRows },
                { label: "Matched",     value: result.matched,  color: "text-sky-400" },
                { label: "Updated",     value: result.updated,  color: "text-emerald-400" },
                { label: "Skipped",     value: result.skipped,  color: result.skipped > 0 ? "text-amber-400" : "text-white/40" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className={`text-xl font-semibold tabular-nums ${color ?? "text-white/70"}`}>{value}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            {result.logId && (
              <p className="text-[10px] text-white/20 mt-4">Log ID: <span className="font-mono">{result.logId}</span></p>
            )}
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4 space-y-1">
              <p className="text-xs text-amber-400 font-medium">{result.errors.length} error{result.errors.length !== 1 ? "s" : ""}</p>
              {result.errors.slice(0, 10).map((e, i) => (
                <p key={i} className="text-[11px] text-amber-400/60">{e}</p>
              ))}
            </div>
          )}

          <button
            onClick={reset}
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/70 transition hover:border-white/40 hover:text-white"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  )
}
