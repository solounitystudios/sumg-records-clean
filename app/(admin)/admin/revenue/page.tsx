"use client";

/**
 * /admin/revenue — Revenue intelligence dashboard.
 *
 * Five panels sourced from `royalty_statements` (Supabase) and the CMS store:
 *   1. Monthly Revenue     — net revenue by period (bar chart)
 *   2. Streams             — stream counts by period (bar chart)
 *   3. Catalog Growth      — cumulative releases over time (step chart)
 *   4. Projected Royalties — last-3-month avg × 12 (KPI tile)
 *   5. Release Performance — ranked table by total net revenue
 *
 * Data is loaded client-side via Supabase; falls back gracefully when
 * Supabase is not configured (shows empty state + import prompt).
 */

import { useState, useEffect, useMemo } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useCmsStore } from "@/lib/cms/store";
import { getRoyaltyStatements } from "@/lib/cms/index";
import { exportRoyaltiesToCSV } from "@/lib/utils/export";
import { RoyaltyStatement } from "@/lib/types";
import Link from "next/link";

// ─── Chart primitives ─────────────────────────────────────────────────────────

/**
 * Inline SVG bar chart.
 * `data` is an array of { label, value } objects.
 * Height of each bar is proportional to the max value.
 */
function BarChart({
  data,
  height = 120,
  color = "rgba(74,222,128,0.7)",
  formatValue = (v: number) => String(v),
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = 100 / (data.length * 2 - 1); // each bar + gap

  return (
    <div className="w-full overflow-hidden">
      <svg
        width="100%"
        viewBox={`0 0 100 ${height + 20}`}
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        {data.map((d, i) => {
          const barHeight = (d.value / max) * height;
          const x = i * barW * 2;
          const y = height - barHeight;
          return (
            <g key={i}>
              <rect
                x={`${x}%`}
                y={y}
                width={`${barW}%`}
                height={barHeight}
                fill={color}
                opacity={0.85}
              />
            </g>
          );
        })}
        {/* Baseline */}
        <line x1="0" y1={height} x2="100%" y2={height} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between mt-1" style={{ gap: "2px" }}>
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 text-center text-[8px] text-white/20 font-mono truncate"
            title={`${d.label}: ${formatValue(d.value)}`}
          >
            {formatAxisLabel(d.label, i, data.length)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Formats an axis label for a bar chart depending on available space.
 * - With 12 or fewer bars: shows "MM" portion of "YYYY-MM"
 * - With more bars: shows the middle 5 chars every 3rd label to avoid overlap
 */
function formatAxisLabel(label: string, index: number, totalCount: number): string {
  if (totalCount <= 12) {
    // "YYYY-MM" → show just "MM"
    return label.slice(5);
  }
  // Show abbreviated label every 3rd index to prevent crowding
  return index % 3 === 0 ? label.slice(2, 7) : "";
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Panel({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-white/5 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/30">{title}</p>
          {subtitle && (
            <p className="text-[10px] text-white/20 mt-0.5">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── KPI tile ─────────────────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "green" | "blue" | "yellow" | "purple" | "none";
}) {
  const colorClass =
    accent === "green"
      ? "text-green-400"
      : accent === "blue"
      ? "text-blue-400"
      : accent === "yellow"
      ? "text-yellow-400"
      : accent === "purple"
      ? "text-purple-400"
      : "text-white";
  return (
    <div className="border border-white/5 bg-white/[0.015] p-4">
      <p className={`text-2xl font-black ${colorClass}`}>{value}</p>
      <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-white/20 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/** Groups statements by YYYY-MM and sums net_revenue. Returns last N months. */
function groupByMonth(
  statements: RoyaltyStatement[],
  field: "netRevenue" | "streams",
  months = 12
): { label: string; value: number }[] {
  const map = new Map<string, number>();
  for (const s of statements) {
    const month = s.periodStart.slice(0, 7); // "YYYY-MM"
    const val = field === "streams" ? (s.streams ?? 0) : s.netRevenue;
    map.set(month, (map.get(month) ?? 0) + val);
  }

  // Sort months and take last N
  const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const recent = sorted.slice(-months);
  return recent.map(([label, value]) => ({ label, value }));
}

/** Groups releases by YYYY-MM and builds a cumulative count series. */
function catalogGrowthSeries(
  releaseDates: string[],
  months = 24
): { label: string; value: number }[] {
  const map = new Map<string, number>();
  for (const d of releaseDates) {
    const month = d.slice(0, 7);
    map.set(month, (map.get(month) ?? 0) + 1);
  }
  const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const recent = sorted.slice(-months);
  let cumulative = 0;
  return recent.map(([label, count]) => {
    cumulative += count;
    return { label, value: cumulative };
  });
}

/** Groups statements by releaseSlug and sums net revenue. */
function groupByRelease(
  statements: RoyaltyStatement[]
): { slug: string; title: string; netRevenue: number; streams: number }[] {
  const map = new Map<
    string,
    { title: string; netRevenue: number; streams: number }
  >();

  for (const s of statements) {
    const key = s.releaseSlug ?? s.songTitle ?? "Unknown";
    const existing = map.get(key) ?? {
      title: s.releaseSlug ? s.releaseSlug : s.songTitle,
      netRevenue: 0,
      streams: 0,
    };
    existing.netRevenue += s.netRevenue;
    existing.streams += s.streams ?? 0;
    map.set(key, existing);
  }

  return [...map.entries()]
    .map(([slug, v]) => ({ slug, ...v }))
    .sort((a, b) => b.netRevenue - a.netRevenue)
    .slice(0, 20);
}

/** Returns projected annual royalties based on last 3 months average. */
function projectedAnnual(statements: RoyaltyStatement[]): number {
  const recentMonths = groupByMonth(statements, "netRevenue", 3);
  if (recentMonths.length === 0) return 0;
  const avg = recentMonths.reduce((s, r) => s + r.value, 0) / recentMonths.length;
  return avg * 12;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RevenuePage() {
  const { releases } = useCmsStore();
  const [statements, setStatements] = useState<RoyaltyStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    getRoyaltyStatements()
      .then((rows) => {
        setStatements(rows);
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────────

  const monthlyRevenue = useMemo(() => groupByMonth(statements, "netRevenue", 12), [statements]);
  const monthlyStreams = useMemo(() => groupByMonth(statements, "streams", 12), [statements]);
  const catalogGrowth = useMemo(
    () =>
      catalogGrowthSeries(
        releases.map((r) => r.releaseDate).filter(Boolean)
      ),
    [releases]
  );
  const releasePerformance = useMemo(() => groupByRelease(statements), [statements]);
  const projectedRoyalties = useMemo(() => projectedAnnual(statements), [statements]);

  const totalNetRevenue = useMemo(
    () => statements.reduce((s, r) => s + r.netRevenue, 0),
    [statements]
  );
  const totalStreams = useMemo(
    () => statements.reduce((s, r) => s + (r.streams ?? 0), 0),
    [statements]
  );

  const isEmpty = !loading && statements.length === 0;

  return (
    <AdminShell title="Revenue">
      <div className="space-y-8">
        {/* Back */}
        <Link
          href="/admin"
          className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors"
        >
          ← Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-white/70">
              Revenue Intelligence
            </h2>
            <p className="text-[11px] text-white/35 mt-1 leading-relaxed">
              Royalty statements from DistroKid, BMI, SoundExchange, and Apple Music.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {statements.length > 0 && (
              <button
                onClick={() => exportRoyaltiesToCSV(statements)}
                className="px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-colors"
              >
                Export CSV
              </button>
            )}
            <Link
              href="/admin/import"
              className="px-4 py-1.5 text-[10px] tracking-[0.15em] uppercase border border-green-700/40 text-green-400/70 hover:text-green-300 hover:border-green-600/50 transition-colors"
            >
              + Import Statements
            </Link>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="border border-white/5 py-16 text-center">
            <p className="text-[12px] text-white/20 animate-pulse">Loading revenue data…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="border border-red-700/30 bg-red-500/5 px-5 py-4">
            <p className="text-[11px] text-red-400/70">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {isEmpty && !error && (
          <div className="border border-white/5 py-16 text-center space-y-4">
            <p className="text-[13px] text-white/20">No royalty statements imported yet.</p>
            <p className="text-[11px] text-white/15 max-w-md mx-auto leading-relaxed">
              Export a CSV from DistroKid, BMI, SoundExchange, or Apple Music for Artists,
              then import it here to see real revenue data.
            </p>
            <Link
              href="/admin/import"
              className="inline-block mt-2 px-5 py-2 text-[10px] tracking-[0.15em] uppercase border border-green-700/40 text-green-400/70 hover:text-green-300 transition-colors"
            >
              Import your first statement →
            </Link>
          </div>
        )}

        {/* ── KPI summary row ──────────────────────────────────────────────── */}
        {!loading && statements.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiTile
              label="Total Net Revenue"
              value={fmtCurrency(totalNetRevenue)}
              accent="green"
            />
            <KpiTile
              label="Total Streams"
              value={fmtNumber(totalStreams)}
              accent="blue"
            />
            <KpiTile
              label="Projected Annual"
              value={fmtCurrency(projectedRoyalties)}
              sub="Based on last 3-month avg"
              accent="yellow"
            />
            <KpiTile
              label="Statement Rows"
              value={fmtNumber(statements.length)}
              accent="none"
            />
          </div>
        )}

        {/* ── Charts + table ───────────────────────────────────────────────── */}
        {!loading && statements.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Monthly Revenue */}
            <Panel
              title="Monthly Revenue"
              subtitle={`Last ${monthlyRevenue.length} periods · net USD`}
            >
              {monthlyRevenue.length > 0 ? (
                <BarChart
                  data={monthlyRevenue}
                  color="rgba(74,222,128,0.65)"
                  formatValue={fmtCurrency}
                />
              ) : (
                <p className="text-[11px] text-white/20 py-8 text-center">No data</p>
              )}
            </Panel>

            {/* Streams */}
            <Panel
              title="Monthly Streams"
              subtitle={`Last ${monthlyStreams.length} periods · DistroKid rows`}
            >
              {monthlyStreams.some((d) => d.value > 0) ? (
                <BarChart
                  data={monthlyStreams}
                  color="rgba(96,165,250,0.65)"
                  formatValue={fmtNumber}
                />
              ) : (
                <p className="text-[11px] text-white/20 py-8 text-center">
                  No stream data (streams are included in DistroKid exports only)
                </p>
              )}
            </Panel>

            {/* Catalog Growth */}
            <Panel
              title="Catalog Growth"
              subtitle={`${releases.length} total releases · cumulative`}
            >
              {catalogGrowth.length > 0 ? (
                <BarChart
                  data={catalogGrowth}
                  color="rgba(192,132,252,0.65)"
                  formatValue={(v) => `${v} releases`}
                />
              ) : (
                <p className="text-[11px] text-white/20 py-8 text-center">
                  No release date data
                </p>
              )}
            </Panel>

            {/* Projected Royalties */}
            <Panel
              title="Projected Annual Royalties"
              subtitle="3-month trailing average × 12"
            >
              <div className="space-y-4">
                <p className="text-4xl font-black text-yellow-400">
                  {fmtCurrency(projectedRoyalties)}
                </p>
                <div className="space-y-2">
                  {groupByMonth(statements, "netRevenue", 3).map((m) => (
                    <div key={m.label} className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-white/30">{m.label}</span>
                      <span className="text-[10px] font-mono text-white/50">
                        {fmtCurrency(m.value)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-white/20 leading-relaxed">
                  Projection = average of last 3 periods × 12.
                  Actual royalties depend on streaming volumes, rate changes, and PRO distributions.
                </p>
              </div>
            </Panel>
          </div>
        )}

        {/* ── Release Performance table ────────────────────────────────────── */}
        {!loading && releasePerformance.length > 0 && (
          <Panel
            title="Release Performance"
            subtitle="Ranked by net revenue across all imported statements"
          >
            <div className="overflow-x-auto">
              {/* Headers */}
              <div className="min-w-[600px] grid grid-cols-12 gap-2 px-3 py-2 text-[9px] tracking-[0.2em] uppercase text-white/20 border-b border-white/5 bg-white/[0.01]">
                <span className="col-span-1">#</span>
                <span className="col-span-5">Release / Track</span>
                <span className="col-span-3">Streams</span>
                <span className="col-span-3">Net Revenue</span>
              </div>

              <div className="min-w-[600px] divide-y divide-white/[0.03]">
                {releasePerformance.map((r, i) => {
                  const maxRev = releasePerformance[0]?.netRevenue ?? 1;
                  const barPct = Math.round((r.netRevenue / maxRev) * 100);
                  return (
                    <div
                      key={r.slug}
                      className="grid grid-cols-12 gap-2 px-3 py-3 items-center hover:bg-white/[0.02] transition-colors"
                    >
                      <span className="col-span-1 text-[10px] font-mono text-white/20">
                        {i + 1}
                      </span>
                      <div className="col-span-5 min-w-0">
                        <p className="text-[11px] text-white/60 truncate">{r.title}</p>
                        {/* Mini bar */}
                        <div className="mt-1 h-0.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500/40 rounded-full"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>
                      <span className="col-span-3 text-[10px] font-mono text-blue-400/50">
                        {fmtNumber(r.streams)}
                      </span>
                      <span className="col-span-3 text-[10px] font-mono text-green-400/60">
                        {fmtCurrency(r.netRevenue)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>
        )}

        {/* ── Source breakdown ─────────────────────────────────────────────── */}
        {!loading && statements.length > 0 && (
          <Panel title="Statement Sources" subtitle="By import origin">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(["distrokid", "bmi", "soundexchange", "apple", "manual"] as const).map((src) => {
                const count = statements.filter((s) => s.source === src).length;
                if (count === 0) return null;
                const rev = statements
                  .filter((s) => s.source === src)
                  .reduce((s, r) => s + r.netRevenue, 0);
                return (
                  <div key={src} className="border border-white/8 bg-white/[0.015] p-3">
                    <p className="text-[9px] tracking-[0.15em] uppercase text-white/25 mb-2">
                      {src}
                    </p>
                    <p className="text-base font-black text-white/60">{fmtCurrency(rev)}</p>
                    <p className="text-[10px] text-white/25 mt-1">{count} rows</p>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}
      </div>
    </AdminShell>
  );
}
