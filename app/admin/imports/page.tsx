import { requireAdmin } from "@/lib/auth"
import { getImportLogs } from "@/app/actions/imports"
import { ImportClient } from "./ImportClient"

export const metadata = { title: "Imports — SUMG Admin" }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

const TYPE_LABEL: Record<string, string> = {
  bmi:          "BMI",
  distro:       "Distribution",
  soundexchange: "SoundExchange",
}

export default async function ImportsPage() {
  await requireAdmin()

  const logs = await getImportLogs()

  return (
    <div className="px-6 py-8 max-w-4xl">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-lg font-semibold tracking-tight">Imports</h1>
        <p className="text-xs text-white/35 mt-1">
          Import BMI catalog exports, distribution statements, and rights data from CSV/TSV files.
        </p>
      </div>

      {/* Import UI */}
      <div className="mb-10">
        <ImportClient />
      </div>

      {/* Import log */}
      <div>
        <h2 className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/40 mb-4">
          Import History
        </h2>

        {logs.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-[#0d1016] px-5 py-6 text-center">
            <p className="text-xs text-white/25">No imports yet.</p>
            {/* If import_logs table is missing, the page still loads gracefully */}
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
            <div className="grid grid-cols-6 px-5 py-2 border-b border-white/[0.05]">
              {["Date", "Type", "File", "Rows", "Updated", "Errors"].map(h => (
                <span key={h} className="text-[9px] text-white/25 uppercase tracking-wide">{h}</span>
              ))}
            </div>
            <div className="divide-y divide-white/[0.04]">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {logs.map((log: any) => (
                <div key={log.id} className="grid grid-cols-6 px-5 py-3 items-center">
                  <span className="text-[10px] text-white/40">{formatDate(log.imported_at)}</span>
                  <span className="text-[10px] text-white/50">{TYPE_LABEL[log.import_type] ?? log.import_type}</span>
                  <span className="text-[10px] text-white/35 truncate font-mono">{log.filename}</span>
                  <span className="text-xs tabular-nums text-white/50">{log.total_rows}</span>
                  <span className="text-xs tabular-nums text-emerald-400">{log.updated_rows}</span>
                  <span className={`text-xs tabular-nums ${log.error_count > 0 ? "text-red-400" : "text-white/25"}`}>
                    {log.error_count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 space-y-1.5">
          <p className="text-[10px] text-white/20">
            <span className="text-white/35">BMI Import</span> — matches songs by title, updates composer credits, PRO assignment, composition status, and BMI Work URL.
          </p>
          <p className="text-[10px] text-white/20">
            <span className="text-white/35">Distribution Import</span> — matches songs by ISRC or title, backfills missing ISRCs, records stream counts.
          </p>
          <p className="text-[10px] text-white/20">
            <span className="text-white/35">SoundExchange</span> — scaffolded. Format mapping requires a statement sample to complete.
          </p>
        </div>
      </div>

    </div>
  )
}
