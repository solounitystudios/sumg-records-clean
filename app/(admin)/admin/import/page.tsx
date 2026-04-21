"use client";

/**
 * /admin/import — CSV import wizard for royalty statements.
 *
 * Step 1 — Upload: drag-and-drop or file-picker for a CSV file.
 * Step 2 — Preview: auto-detects source (DistroKid / BMI / SoundExchange /
 *           Apple); shows first 5 rows and mapped field summary.
 * Step 3 — Commit: inserts all rows into the `royalty_statements` Supabase
 *           table and reports success / failure.
 *
 * Supported formats:
 *   DistroKid  — "Earnings" CSV export (Reports → Earnings → Download CSV)
 *   BMI        — Royalty statement CSV
 *   SoundExchange — Digital performance statement CSV
 *   Apple      — Apple Music for Artists CSV
 */

import { useState, useCallback } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { insertRoyaltyStatements } from "@/lib/cms/index";
import { parseRoyaltyCSV, DetectedSource } from "@/lib/revenue/parser";
import { RoyaltyStatement } from "@/lib/types";
import Link from "next/link";

// ─── Source labels ────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<DetectedSource, string> = {
  distrokid: "DistroKid",
  bmi: "BMI",
  soundexchange: "SoundExchange",
  apple: "Apple Music",
  manual: "Manual",
  unknown: "Unknown / Unrecognized",
};

const SOURCE_COLORS: Record<DetectedSource, string> = {
  distrokid: "border-green-700/40 text-green-400/70 bg-green-500/5",
  bmi: "border-blue-700/40 text-blue-400/70 bg-blue-500/5",
  soundexchange: "border-purple-700/40 text-purple-400/70 bg-purple-500/5",
  apple: "border-pink-700/40 text-pink-400/70 bg-pink-500/5",
  manual: "border-white/15 text-white/40 bg-white/[0.02]",
  unknown: "border-red-700/40 text-red-400/50 bg-red-500/5",
};

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-6 h-6 flex items-center justify-center text-[10px] font-black border ${
          done
            ? "border-green-700/50 text-green-400 bg-green-500/10"
            : active
            ? "border-white/30 text-white bg-white/[0.06]"
            : "border-white/8 text-white/20"
        }`}
      >
        {done ? "✓" : n}
      </div>
    </div>
  );
}

function Steps({ current }: { current: 1 | 2 | 3 }) {
  const labels = ["Upload", "Preview", "Commit"];
  return (
    <div className="flex items-center gap-4">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          {i > 0 && <div className="w-8 h-px bg-white/8" />}
          <StepDot n={i + 1} active={current === i + 1} done={current > i + 1} />
          <span
            className={`text-[10px] tracking-[0.15em] uppercase ${
              current === i + 1
                ? "text-white/60"
                : current > i + 1
                ? "text-green-400/50"
                : "text-white/20"
            }`}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Mini table ───────────────────────────────────────────────────────────────

function PreviewTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Record<string, string>[];
}) {
  const visibleHeaders = headers.slice(0, 8); // cap at 8 cols for readability
  return (
    <div className="overflow-x-auto border border-white/5">
      <table className="min-w-full text-[10px]">
        <thead>
          <tr className="border-b border-white/5 bg-white/[0.01]">
            {visibleHeaders.map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left tracking-[0.1em] uppercase text-white/25 font-medium whitespace-nowrap"
              >
                {h}
              </th>
            ))}
            {headers.length > 8 && (
              <th className="px-3 py-2 text-left text-white/15">
                +{headers.length - 8} more
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.03]">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-white/[0.01]">
              {visibleHeaders.map((h) => (
                <td
                  key={h}
                  className="px-3 py-2 text-white/40 font-mono whitespace-nowrap max-w-[160px] overflow-hidden text-ellipsis"
                >
                  {row[h] ?? ""}
                </td>
              ))}
              {headers.length > 8 && <td />}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Mapped summary ───────────────────────────────────────────────────────────

function MappedSummary({
  rows,
}: {
  rows: Omit<RoyaltyStatement, "id" | "createdAt">[];
}) {
  const totalNet = rows.reduce((s, r) => s + r.netRevenue, 0);
  const totalStreams = rows.reduce((s, r) => s + (r.streams ?? 0), 0);
  const periods = [...new Set(rows.map((r) => r.periodStart.slice(0, 7)))].sort();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="border border-white/8 bg-white/[0.02] p-4">
        <p className="text-xl font-black text-white">{rows.length}</p>
        <p className="text-[10px] tracking-[0.15em] uppercase text-white/30 mt-1">Rows</p>
      </div>
      <div className="border border-green-700/30 bg-green-500/5 p-4">
        <p className="text-xl font-black text-green-400">
          ${totalNet.toFixed(2)}
        </p>
        <p className="text-[10px] tracking-[0.15em] uppercase text-green-400/50 mt-1">
          Net Revenue
        </p>
      </div>
      <div className="border border-blue-700/30 bg-blue-500/5 p-4">
        <p className="text-xl font-black text-blue-400">
          {totalStreams.toLocaleString()}
        </p>
        <p className="text-[10px] tracking-[0.15em] uppercase text-blue-400/50 mt-1">
          Streams
        </p>
      </div>
      <div className="border border-white/8 bg-white/[0.02] p-4">
        <p className="text-xl font-black text-white/60">{periods.length}</p>
        <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mt-1">
          Periods
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [parseError, setParseError] = useState<string>("");

  // Step 2
  const [detectedSource, setDetectedSource] = useState<DetectedSource>("unknown");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [mappedRows, setMappedRows] = useState<Omit<RoyaltyStatement, "id" | "createdAt">[]>([]);

  // Step 3
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{
    success: boolean;
    count?: number;
    error?: string;
  } | null>(null);

  // ── File handling ────────────────────────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setParseError("Only CSV files are supported.");
      return;
    }
    setFileName(file.name);
    setParseError("");

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const { source, headers, preview, mapped } = parseRoyaltyCSV(text);
        setDetectedSource(source);
        setCsvHeaders(headers);
        setPreviewRows(preview);
        setMappedRows(mapped);
        setStep(2);
      } catch (err) {
        setParseError(`Failed to parse CSV: ${String(err)}`);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  // ── Commit ──────────────────────────────────────────────────────────────────

  const handleCommit = useCallback(async () => {
    setCommitting(true);
    setCommitResult(null);
    try {
      const count = await insertRoyaltyStatements(mappedRows);
      setCommitResult({ success: true, count });
      setStep(3);
    } catch (err) {
      setCommitResult({ success: false, error: String(err) });
      setStep(3);
    } finally {
      setCommitting(false);
    }
  }, [mappedRows]);

  // ── Reset ───────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setStep(1);
    setFileName("");
    setParseError("");
    setDetectedSource("unknown");
    setCsvHeaders([]);
    setPreviewRows([]);
    setMappedRows([]);
    setCommitResult(null);
  };

  return (
    <AdminShell title="Import">
      <div className="space-y-8 max-w-5xl">
        {/* Back */}
        <Link
          href="/admin/revenue"
          className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors"
        >
          ← Revenue
        </Link>

        {/* Header */}
        <div>
          <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-white/70">
            Import Royalty Statements
          </h2>
          <p className="text-[11px] text-white/35 mt-1 leading-relaxed max-w-2xl">
            Upload a CSV export from DistroKid, BMI, SoundExchange, or Apple Music for Artists.
            The importer auto-detects the source and maps all rows to the SUMG royalty data model.
          </p>
        </div>

        {/* Step indicator */}
        <Steps current={step} />

        {/* ── Step 1 — Upload ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed transition-colors px-8 py-16 text-center cursor-pointer ${
                dragging
                  ? "border-white/30 bg-white/[0.03]"
                  : "border-white/10 hover:border-white/20 hover:bg-white/[0.01]"
              }`}
              onClick={() => document.getElementById("csv-file-input")?.click()}
            >
              <p className="text-2xl mb-3 text-white/20">↑</p>
              <p className="text-[12px] text-white/50">
                Drop a CSV file here, or{" "}
                <span className="underline underline-offset-2 text-white/60">browse</span>
              </p>
              <p className="text-[10px] text-white/25 mt-2">
                Supported: DistroKid · BMI · SoundExchange · Apple Music
              </p>
              <input
                id="csv-file-input"
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>

            {parseError && (
              <p className="text-[11px] text-red-400/70 border border-red-700/30 px-4 py-3">
                {parseError}
              </p>
            )}

            {/* Ingestion notes */}
            <div className="border border-white/[0.06] bg-white/[0.01] px-5 py-4">
              <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-3">
                How to export from each platform
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-white/35 leading-relaxed">
                <div>
                  <p className="text-white/50 font-medium mb-1">DistroKid</p>
                  <p>Reports → Earnings → select date range → Download CSV</p>
                </div>
                <div>
                  <p className="text-white/50 font-medium mb-1">BMI</p>
                  <p>Royalty Statements → select period → Export CSV</p>
                </div>
                <div>
                  <p className="text-white/50 font-medium mb-1">SoundExchange</p>
                  <p>Royalties → Statement History → Download CSV</p>
                </div>
                <div>
                  <p className="text-white/50 font-medium mb-1">Apple Music</p>
                  <p>Apple Music for Artists → Analytics → Download CSV</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2 — Preview ────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            {/* File + source */}
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] tracking-[0.15em] uppercase text-white/25">File</p>
                <p className="text-[12px] text-white/60 mt-1 font-mono">{fileName}</p>
              </div>
              <div className="ml-8">
                <p className="text-[10px] tracking-[0.15em] uppercase text-white/25">
                  Detected source
                </p>
                <span
                  className={`inline-block mt-1 text-[10px] tracking-[0.1em] uppercase border px-2 py-0.5 ${SOURCE_COLORS[detectedSource]}`}
                >
                  {SOURCE_LABELS[detectedSource]}
                </span>
              </div>
            </div>

            {detectedSource === "unknown" && (
              <div className="border border-yellow-700/30 bg-yellow-500/5 px-4 py-3">
                <p className="text-[11px] text-yellow-400/70">
                  Source format not recognized. The importer could not identify this CSV as a
                  DistroKid, BMI, SoundExchange, or Apple Music export. Rows will not be
                  automatically mapped — commit will be disabled. Verify the column headers
                  match the expected format or use a different export.
                </p>
              </div>
            )}

            {/* Mapped summary */}
            {mappedRows.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/20">
                  Mapped summary ({mappedRows.length} rows)
                </p>
                <MappedSummary rows={mappedRows} />
              </div>
            )}

            {/* Raw CSV preview */}
            <div className="space-y-2">
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/20">
                Raw CSV preview — first {previewRows.length} rows of {csvHeaders.length} columns
              </p>
              <PreviewTable headers={csvHeaders} rows={previewRows} />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-[10px] tracking-[0.15em] uppercase border border-white/10 text-white/35 hover:text-white/60 hover:border-white/20 transition-colors"
              >
                ← Back
              </button>
              <button
                disabled={detectedSource === "unknown" || mappedRows.length === 0 || committing}
                onClick={handleCommit}
                className="px-6 py-2 text-[10px] tracking-[0.15em] uppercase border border-green-700/50 text-green-400/80 hover:text-green-300 hover:border-green-600/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {committing
                  ? "Importing…"
                  : `Import ${mappedRows.length} rows →`}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3 — Result ──────────────────────────────────────────────── */}
        {step === 3 && commitResult && (
          <div className="space-y-6">
            {commitResult.success ? (
              <div className="border border-green-700/40 bg-green-500/5 px-6 py-8 text-center">
                <p className="text-3xl font-black text-green-400 mb-2">
                  {commitResult.count ?? mappedRows.length}
                </p>
                <p className="text-[12px] text-green-400/60 tracking-[0.1em] uppercase">
                  Rows imported successfully
                </p>
                <p className="text-[11px] text-white/30 mt-3">
                  Source: {SOURCE_LABELS[detectedSource]}
                </p>
              </div>
            ) : (
              <div className="border border-red-700/40 bg-red-500/5 px-6 py-6">
                <p className="text-[12px] text-red-400/80 font-medium mb-2">Import failed</p>
                <p className="text-[11px] text-red-400/50 font-mono leading-relaxed">
                  {commitResult.error}
                </p>
              </div>
            )}

            <div className="flex items-center gap-4">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-[10px] tracking-[0.15em] uppercase border border-white/10 text-white/35 hover:text-white/60 hover:border-white/20 transition-colors"
              >
                Import another file
              </button>
              <Link
                href="/admin/revenue"
                className="px-4 py-2 text-[10px] tracking-[0.15em] uppercase border border-white/10 text-white/35 hover:text-white/60 hover:border-white/20 transition-colors"
              >
                View Revenue Dashboard →
              </Link>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
