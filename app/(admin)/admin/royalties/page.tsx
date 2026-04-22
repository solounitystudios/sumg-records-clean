"use client";

/**
 * /admin/royalties — Royalty Platform
 *
 * Full earnings tracking, split configuration, payout management, and
 * downloadable monthly statements. Goal: trust + transparency.
 *
 * Tabs:
 *   Overview  — monthly summary, top earners, pending payouts summary
 *   Earnings  — per song/platform earnings table + add form
 *   Splits    — artist/producer split configs per song/release
 *   Payouts   — pending/processing/paid payout records
 *   Statements — downloadable monthly CSV statements
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  RoyaltyEarning,
  RoyaltySplit,
  RoyaltyPayout,
  RoyaltyPlatform,
  PayoutStatus,
} from "@/lib/types";
import {
  getAllEarnings,
  getAllSplits,
  getAllPayouts,
  insertEarning,
  deleteEarning,
  insertSplit,
  updateSplit,
  deleteSplit,
  insertPayout,
  updatePayoutStatus,
  deletePayout,
  computeMonthlySummary,
  distinctPeriods,
} from "@/lib/royalties/index";
import {
  exportEarningsToCSV,
  exportSplitsToCSV,
  exportMonthlyStatementToCSV,
} from "@/lib/utils/export";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS: RoyaltyPlatform[] = [
  "Spotify",
  "Apple Music",
  "YouTube Music",
  "Amazon Music",
  "Tidal",
  "Deezer",
  "SoundExchange",
  "BMI",
  "ASCAP",
  "SESAC",
  "DistroKid",
  "Other",
];

const PAYOUT_STATUSES: PayoutStatus[] = ["pending", "processing", "paid", "cancelled"];

type Tab = "overview" | "earnings" | "splits" | "payouts" | "statements";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtAmount(n: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(n);
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

function payoutStatusColor(s: PayoutStatus): string {
  if (s === "paid") return "border-green-800/40 text-green-400/60";
  if (s === "processing") return "border-yellow-800/40 text-yellow-400/60";
  if (s === "cancelled") return "border-red-800/40 text-red-400/40";
  return "border-white/10 text-white/35";
}

function payoutStatusLabel(s: PayoutStatus): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-[10px] tracking-[0.2em] uppercase px-4 py-2 border-b-2 transition-colors ${
        active
          ? "border-white/40 text-white/80"
          : "border-transparent text-white/25 hover:text-white/50"
      }`}
    >
      {label}
    </button>
  );
}

function SummaryCard({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: string | number;
  accent?: "green" | "yellow" | "red" | "blue";
  sub?: string;
}) {
  const color =
    accent === "green"
      ? "text-green-400"
      : accent === "yellow"
      ? "text-yellow-400"
      : accent === "red"
      ? "text-red-400"
      : accent === "blue"
      ? "text-sky-400"
      : "text-white";
  return (
    <div className="border border-white/5 bg-white/[0.01] p-4">
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-white/20 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoyaltiesPage() {
  // ── Data state ────────────────────────────────────────────────────────────
  const [earnings, setEarnings] = useState<RoyaltyEarning[]>([]);
  const [splits, setSplits] = useState<RoyaltySplit[]>([]);
  const [payouts, setPayouts] = useState<RoyaltyPayout[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Tab state ─────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>("overview");

  // ── Filter state ──────────────────────────────────────────────────────────
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterArtist, setFilterArtist] = useState<string>("all");
  const [filterPayoutStatus, setFilterPayoutStatus] = useState<string>("all");

  // ── Form state — Add Earning ──────────────────────────────────────────────
  const [showAddEarning, setShowAddEarning] = useState(false);
  const [eTitle, setETitle] = useState("");
  const [eSongSlug, setESongSlug] = useState("");
  const [eArtistSlug, setEArtistSlug] = useState("");
  const [ePlatform, setEPlatform] = useState<RoyaltyPlatform>("Spotify");
  const [ePeriod, setEPeriod] = useState("");
  const [eGross, setEGross] = useState("");
  const [eCurrency, setECurrency] = useState("USD");
  const [eStreams, setEStreams] = useState("");
  const [eNotes, setENotes] = useState("");
  const [eSaving, setESaving] = useState(false);

  // ── Form state — Add Split ────────────────────────────────────────────────
  const [showAddSplit, setShowAddSplit] = useState(false);
  const [sSongSlug, setSSongSlug] = useState("");
  const [sReleaseSlug, setSReleaseSlug] = useState("");
  const [sParticipantType, setSParticipantType] = useState<"artist" | "producer" | "other">("artist");
  const [sParticipantSlug, setSParticipantSlug] = useState("");
  const [sParticipantName, setSParticipantName] = useState("");
  const [sSplitPct, setSSplitPct] = useState("");
  const [sRole, setSRole] = useState("");
  const [sSaving, setSSaving] = useState(false);

  // ── Form state — Add Payout ───────────────────────────────────────────────
  const [showAddPayout, setShowAddPayout] = useState(false);
  const [pParticipantType, setPParticipantType] = useState<"artist" | "producer" | "other">("artist");
  const [pParticipantSlug, setPParticipantSlug] = useState("");
  const [pParticipantName, setPParticipantName] = useState("");
  const [pPeriod, setPPeriod] = useState("");
  const [pGross, setPGross] = useState("");
  const [pNet, setPNet] = useState("");
  const [pCurrency, setPCurrency] = useState("USD");
  const [pStatus, setPStatus] = useState<PayoutStatus>("pending");
  const [pNotes, setPNotes] = useState("");
  const [pSaving, setPSaving] = useState(false);

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const [e, sp, py] = await Promise.all([
      getAllEarnings(),
      getAllSplits(),
      getAllPayouts(),
    ]);
    setEarnings(e);
    setSplits(sp);
    setPayouts(py);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const periods = useMemo(() => distinctPeriods(earnings), [earnings]);

  const activePeriod = useMemo(
    () => (filterPeriod !== "all" ? filterPeriod : periods[0] ?? ""),
    [filterPeriod, periods]
  );

  const monthlySummary = useMemo(
    () =>
      activePeriod
        ? computeMonthlySummary(activePeriod, earnings, payouts)
        : null,
    [activePeriod, earnings, payouts]
  );

  // Overview totals
  const totalGrossAllTime = useMemo(
    () => earnings.reduce((s, e) => s + e.grossAmount, 0),
    [earnings]
  );
  const pendingPayouts = useMemo(
    () => payouts.filter((p) => p.status === "pending"),
    [payouts]
  );
  const pendingTotal = useMemo(
    () => pendingPayouts.reduce((s, p) => s + p.netAmount, 0),
    [pendingPayouts]
  );

  // Top songs by total gross
  const topSongs = useMemo(() => {
    const map: Record<string, { title: string; gross: number }> = {};
    for (const e of earnings) {
      const key = e.songSlug ?? e.title;
      if (!map[key]) map[key] = { title: e.title, gross: 0 };
      map[key].gross += e.grossAmount;
    }
    return Object.entries(map)
      .map(([, v]) => v)
      .sort((a, b) => b.gross - a.gross)
      .slice(0, 5);
  }, [earnings]);

  // Filtered earnings
  const filteredEarnings = useMemo(() => {
    let list = earnings;
    if (filterPeriod !== "all") list = list.filter((e) => e.periodMonth === filterPeriod);
    if (filterPlatform !== "all") list = list.filter((e) => e.platform === filterPlatform);
    if (filterArtist !== "all") list = list.filter((e) => e.artistSlug === filterArtist);
    return list;
  }, [earnings, filterPeriod, filterPlatform, filterArtist]);

  // Filtered payouts
  const filteredPayouts = useMemo(() => {
    if (filterPayoutStatus === "all") return payouts;
    return payouts.filter((p) => p.status === filterPayoutStatus);
  }, [payouts, filterPayoutStatus]);

  // Artist slugs for filter dropdown
  const artistSlugs = useMemo(
    () => [...new Set(earnings.map((e) => e.artistSlug))].sort(),
    [earnings]
  );

  // Splits grouped by song/release for display
  const splitsGrouped = useMemo(() => {
    const map: Record<string, RoyaltySplit[]> = {};
    for (const s of splits) {
      const key = s.songSlug ?? s.releaseSlug ?? "unscoped";
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return Object.entries(map).map(([key, items]) => ({ key, items }));
  }, [splits]);

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleAddEarning(ev: React.FormEvent) {
    ev.preventDefault();
    if (!eTitle || !eArtistSlug || !ePeriod || !eGross) return;
    setESaving(true);
    await insertEarning({
      title: eTitle,
      songSlug: eSongSlug || undefined,
      artistSlug: eArtistSlug,
      platform: ePlatform,
      periodMonth: ePeriod,
      grossAmount: parseFloat(eGross),
      currency: eCurrency,
      streams: eStreams ? parseInt(eStreams) : undefined,
      notes: eNotes || undefined,
    });
    await loadData();
    setShowAddEarning(false);
    setETitle(""); setESongSlug(""); setEArtistSlug(""); setEPeriod("");
    setEGross(""); setECurrency("USD"); setEStreams(""); setENotes("");
    setESaving(false);
  }

  async function handleDeleteEarning(id: string) {
    if (!confirm("Delete this earning row?")) return;
    await deleteEarning(id);
    setEarnings((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleAddSplit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!sParticipantName || !sSplitPct) return;
    setSSaving(true);
    await insertSplit({
      songSlug: sSongSlug || undefined,
      releaseSlug: sReleaseSlug || undefined,
      participantType: sParticipantType,
      participantSlug: sParticipantSlug || undefined,
      participantName: sParticipantName,
      splitPct: parseFloat(sSplitPct),
      role: sRole || undefined,
    });
    await loadData();
    setShowAddSplit(false);
    setSSongSlug(""); setSReleaseSlug(""); setSParticipantSlug("");
    setSParticipantName(""); setSSplitPct(""); setSRole("");
    setSSaving(false);
  }

  async function handleDeleteSplit(id: string) {
    if (!confirm("Delete this split configuration?")) return;
    await deleteSplit(id);
    setSplits((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleAddPayout(ev: React.FormEvent) {
    ev.preventDefault();
    if (!pParticipantName || !pPeriod || !pGross) return;
    setPSaving(true);
    await insertPayout({
      participantType: pParticipantType,
      participantSlug: pParticipantSlug || undefined,
      participantName: pParticipantName,
      periodMonth: pPeriod,
      grossAmount: parseFloat(pGross),
      netAmount: parseFloat(pNet || pGross),
      currency: pCurrency,
      status: pStatus,
      notes: pNotes || undefined,
    });
    await loadData();
    setShowAddPayout(false);
    setPParticipantSlug(""); setPParticipantName(""); setPPeriod("");
    setPGross(""); setPNet(""); setPCurrency("USD"); setPNotes("");
    setPSaving(false);
  }

  async function handleMarkPaid(id: string) {
    await updatePayoutStatus(id, "paid");
    setPayouts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: "paid", paidAt: new Date().toISOString() }
          : p
      )
    );
  }

  async function handleDeletePayout(id: string) {
    if (!confirm("Delete this payout record?")) return;
    await deletePayout(id);
    setPayouts((prev) => prev.filter((p) => p.id !== id));
  }

  // ─── Input style ─────────────────────────────────────────────────────────
  const inp =
    "bg-neutral-900 border border-white/10 text-white/80 text-xs px-3 py-2 w-full focus:outline-none focus:border-white/30 placeholder:text-white/20";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <AdminShell title="Royalty Platform">
      <div className="space-y-6">
        {/* Back */}
        <Link
          href="/admin"
          className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors"
        >
          ← Dashboard
        </Link>

        {/* Header */}
        <div>
          <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-white/70">
            Royalty Platform
          </h2>
          <p className="text-[11px] text-white/35 mt-1 leading-relaxed">
            Per-song earnings, platform revenue, artist &amp; producer splits,
            pending payouts, and downloadable statements. Trust + transparency.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-white/5">
          {(["overview", "earnings", "splits", "payouts", "statements"] as Tab[]).map(
            (t) => (
              <TabBtn
                key={t}
                label={t.charAt(0).toUpperCase() + t.slice(1)}
                active={tab === t}
                onClick={() => setTab(t)}
              />
            )
          )}
        </div>

        {loading && (
          <p className="text-[11px] text-white/30 animate-pulse">Loading royalty data…</p>
        )}

        {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
        {!loading && tab === "overview" && (
          <div className="space-y-6">
            {/* Period selector */}
            <div className="flex items-center gap-3">
              <label className="text-[10px] tracking-[0.15em] uppercase text-white/30">
                Period
              </label>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="bg-neutral-900 border border-white/10 text-white/70 text-xs px-3 py-1.5 focus:outline-none"
              >
                <option value="all">All time</option>
                {periods.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryCard
                label="Total Gross"
                value={
                  filterPeriod === "all"
                    ? fmtAmount(totalGrossAllTime)
                    : fmtAmount(monthlySummary?.totalGross ?? 0)
                }
                accent="green"
              />
              <SummaryCard
                label="Pending Payouts"
                value={pendingPayouts.length}
                accent={pendingPayouts.length > 0 ? "yellow" : undefined}
                sub={fmtAmount(pendingTotal)}
              />
              <SummaryCard
                label="Songs w/ Earnings"
                value={[...new Set(earnings.map((e) => e.songSlug ?? e.title))].length}
              />
              <SummaryCard
                label="Split Configs"
                value={splits.length}
              />
            </div>

            {/* Top songs */}
            {topSongs.length > 0 && (
              <div className="border border-white/5 p-5">
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mb-4">
                  Top Earners (all time)
                </p>
                <div className="space-y-2">
                  {topSongs.map((s, i) => (
                    <div
                      key={s.title}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-white/20 w-4">
                          {i + 1}
                        </span>
                        <span className="text-[11px] text-white/60">{s.title}</span>
                      </div>
                      <span className="text-[11px] font-mono text-green-400/70">
                        {fmtAmount(s.gross)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Platform breakdown for selected period */}
            {monthlySummary && filterPeriod !== "all" && Object.keys(monthlySummary.earningsByPlatform).length > 0 && (
              <div className="border border-white/5 p-5">
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 mb-4">
                  Platform Breakdown — {filterPeriod}
                </p>
                <div className="space-y-2">
                  {Object.entries(monthlySummary.earningsByPlatform)
                    .sort(([, a], [, b]) => b - a)
                    .map(([platform, amount]) => (
                      <div key={platform} className="flex items-center justify-between">
                        <span className="text-[11px] text-white/50">{platform}</span>
                        <span className="text-[11px] font-mono text-white/60">
                          {fmtAmount(amount)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Pending payouts list */}
            {pendingPayouts.length > 0 && (
              <div className="border border-yellow-500/10 p-5">
                <p className="text-[10px] tracking-[0.2em] uppercase text-yellow-400/40 mb-4">
                  {pendingPayouts.length} Pending Payout{pendingPayouts.length !== 1 ? "s" : ""}
                  {" — "}{fmtAmount(pendingTotal)}
                </p>
                <div className="space-y-2">
                  {pendingPayouts.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-white/60">{p.participantName}</span>
                        <span className="text-[10px] text-white/25 ml-2">{p.periodMonth}</span>
                      </div>
                      <span className="text-[11px] font-mono text-yellow-400/60">
                        {fmtAmount(p.netAmount, p.currency)}
                      </span>
                    </div>
                  ))}
                </div>
                {pendingPayouts.length > 5 && (
                  <button
                    onClick={() => { setTab("payouts"); setFilterPayoutStatus("pending"); }}
                    className="mt-3 text-[10px] tracking-[0.15em] uppercase text-white/20 hover:text-white/50 transition-colors"
                  >
                    View all {pendingPayouts.length} →
                  </button>
                )}
              </div>
            )}

            {earnings.length === 0 && (
              <div className="border border-white/5 py-12 text-center">
                <p className="text-[13px] text-white/20">No earnings recorded yet.</p>
                <button
                  onClick={() => setTab("earnings")}
                  className="mt-3 text-[10px] tracking-[0.2em] uppercase text-white/20 hover:text-white/50 transition-colors"
                >
                  Add First Earning →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── EARNINGS ──────────────────────────────────────────────────── */}
        {!loading && tab === "earnings" && (
          <div className="space-y-5">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="bg-neutral-900 border border-white/10 text-white/60 text-xs px-3 py-1.5 focus:outline-none"
              >
                <option value="all">All periods</option>
                {periods.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                className="bg-neutral-900 border border-white/10 text-white/60 text-xs px-3 py-1.5 focus:outline-none"
              >
                <option value="all">All platforms</option>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                value={filterArtist}
                onChange={(e) => setFilterArtist(e.target.value)}
                className="bg-neutral-900 border border-white/10 text-white/60 text-xs px-3 py-1.5 focus:outline-none"
              >
                <option value="all">All artists</option>
                {artistSlugs.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <button
                onClick={() => exportEarningsToCSV(filteredEarnings)}
                className="ml-auto text-[10px] tracking-[0.15em] uppercase text-white/25 hover:text-white/60 transition-colors border border-white/10 px-3 py-1.5"
              >
                Export CSV
              </button>
              <button
                onClick={() => setShowAddEarning(true)}
                className="text-[10px] tracking-[0.15em] uppercase text-white/70 hover:text-white transition-colors border border-white/20 px-3 py-1.5"
              >
                + Add Earning
              </button>
            </div>

            {/* Add form */}
            {showAddEarning && (
              <form
                onSubmit={handleAddEarning}
                className="border border-white/10 bg-white/[0.01] p-5 space-y-4"
              >
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">
                  Add Earning Row
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <input
                    placeholder="Title / Song name *"
                    value={eTitle}
                    onChange={(e) => setETitle(e.target.value)}
                    className={inp}
                    required
                  />
                  <input
                    placeholder="Song slug (optional)"
                    value={eSongSlug}
                    onChange={(e) => setESongSlug(e.target.value)}
                    className={inp}
                  />
                  <input
                    placeholder="Artist slug *"
                    value={eArtistSlug}
                    onChange={(e) => setEArtistSlug(e.target.value)}
                    className={inp}
                    required
                  />
                  <select
                    value={ePlatform}
                    onChange={(e) => setEPlatform(e.target.value as RoyaltyPlatform)}
                    className={inp}
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Period YYYY-MM *"
                    value={ePeriod}
                    onChange={(e) => setEPeriod(e.target.value)}
                    className={inp}
                    pattern="\d{4}-\d{2}"
                    required
                  />
                  <input
                    placeholder="Gross amount *"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={eGross}
                    onChange={(e) => setEGross(e.target.value)}
                    className={inp}
                    required
                  />
                  <input
                    placeholder="Currency (USD)"
                    value={eCurrency}
                    onChange={(e) => setECurrency(e.target.value)}
                    className={inp}
                  />
                  <input
                    placeholder="Streams (optional)"
                    type="number"
                    min="0"
                    value={eStreams}
                    onChange={(e) => setEStreams(e.target.value)}
                    className={inp}
                  />
                  <input
                    placeholder="Notes (optional)"
                    value={eNotes}
                    onChange={(e) => setENotes(e.target.value)}
                    className={inp}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={eSaving}
                    className="text-[10px] tracking-[0.2em] uppercase text-white/70 border border-white/20 px-4 py-2 hover:text-white transition-colors disabled:opacity-40"
                  >
                    {eSaving ? "Saving…" : "Save Earning"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddEarning(false)}
                    className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white/50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Table */}
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/20">
              {filteredEarnings.length} rows
              {filteredEarnings.length > 0 && (
                <span className="ml-3 text-green-400/50">
                  {fmtAmount(filteredEarnings.reduce((s, e) => s + e.grossAmount, 0))} total
                </span>
              )}
            </p>

            {filteredEarnings.length === 0 ? (
              <div className="border border-white/5 py-12 text-center">
                <p className="text-[13px] text-white/20">
                  {earnings.length === 0 ? "No earnings recorded yet." : "No results for current filters."}
                </p>
              </div>
            ) : (
              <div className="border border-white/5 overflow-x-auto">
                <div className="min-w-[900px]">
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[9px] tracking-[0.2em] uppercase text-white/20 border-b border-white/5 bg-white/[0.01]">
                    <span className="col-span-1">Period</span>
                    <span className="col-span-3">Title</span>
                    <span className="col-span-2">Artist</span>
                    <span className="col-span-2">Platform</span>
                    <span className="col-span-1">Streams</span>
                    <span className="col-span-2 text-right">Gross</span>
                    <span className="col-span-1" />
                  </div>
                  <div className="divide-y divide-white/[0.03]">
                    {filteredEarnings.map((e) => (
                      <div
                        key={e.id}
                        className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-white/[0.02] transition-colors"
                      >
                        <span className="col-span-1 text-[10px] font-mono text-white/30">
                          {e.periodMonth}
                        </span>
                        <span className="col-span-3 text-[11px] text-white/70 truncate">
                          {e.title}
                        </span>
                        <span className="col-span-2 text-[10px] text-white/40 truncate">
                          {e.artistSlug}
                        </span>
                        <span className="col-span-2 text-[10px] text-white/40">
                          {e.platform}
                        </span>
                        <span className="col-span-1 text-[10px] font-mono text-white/30">
                          {e.streams != null ? fmtNum(e.streams) : "—"}
                        </span>
                        <span className="col-span-2 text-[11px] font-mono text-green-400/70 text-right">
                          {fmtAmount(e.grossAmount, e.currency)}
                        </span>
                        <div className="col-span-1 flex justify-end">
                          <button
                            onClick={() => handleDeleteEarning(e.id)}
                            className="text-[10px] text-white/15 hover:text-red-400/60 transition-colors"
                            title="Delete"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SPLITS ────────────────────────────────────────────────────── */}
        {!loading && tab === "splits" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/20">
                {splits.length} split configuration{splits.length !== 1 ? "s" : ""}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => exportSplitsToCSV(splits)}
                  className="text-[10px] tracking-[0.15em] uppercase text-white/25 hover:text-white/60 transition-colors border border-white/10 px-3 py-1.5"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => setShowAddSplit(true)}
                  className="text-[10px] tracking-[0.15em] uppercase text-white/70 hover:text-white transition-colors border border-white/20 px-3 py-1.5"
                >
                  + Add Split
                </button>
              </div>
            </div>

            {/* Note */}
            <div className="border border-white/[0.06] bg-white/[0.01] px-4 py-3">
              <p className="text-[10px] text-white/30 leading-relaxed">
                Configure split percentages per song or release. The sum of all
                splits for a given song should equal 100%. Used to compute each
                participant&apos;s share when generating payouts.
              </p>
            </div>

            {/* Add form */}
            {showAddSplit && (
              <form
                onSubmit={handleAddSplit}
                className="border border-white/10 bg-white/[0.01] p-5 space-y-4"
              >
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">
                  Add Split Config
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <input
                    placeholder="Song slug (optional)"
                    value={sSongSlug}
                    onChange={(e) => setSSongSlug(e.target.value)}
                    className={inp}
                  />
                  <input
                    placeholder="Release slug (optional)"
                    value={sReleaseSlug}
                    onChange={(e) => setSReleaseSlug(e.target.value)}
                    className={inp}
                  />
                  <select
                    value={sParticipantType}
                    onChange={(e) =>
                      setSParticipantType(e.target.value as "artist" | "producer" | "other")
                    }
                    className={inp}
                  >
                    <option value="artist">Artist</option>
                    <option value="producer">Producer</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    placeholder="Participant name *"
                    value={sParticipantName}
                    onChange={(e) => setSParticipantName(e.target.value)}
                    className={inp}
                    required
                  />
                  <input
                    placeholder="Participant slug (optional)"
                    value={sParticipantSlug}
                    onChange={(e) => setSParticipantSlug(e.target.value)}
                    className={inp}
                  />
                  <input
                    placeholder="Split % (0–100) *"
                    type="number"
                    step="0.001"
                    min="0"
                    max="100"
                    value={sSplitPct}
                    onChange={(e) => setSSplitPct(e.target.value)}
                    className={inp}
                    required
                  />
                  <input
                    placeholder="Role (e.g. Lead Artist)"
                    value={sRole}
                    onChange={(e) => setSRole(e.target.value)}
                    className={inp}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={sSaving}
                    className="text-[10px] tracking-[0.2em] uppercase text-white/70 border border-white/20 px-4 py-2 hover:text-white transition-colors disabled:opacity-40"
                  >
                    {sSaving ? "Saving…" : "Save Split"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddSplit(false)}
                    className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white/50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {splits.length === 0 ? (
              <div className="border border-white/5 py-12 text-center">
                <p className="text-[13px] text-white/20">No split configs yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {splitsGrouped.map(({ key, items }) => {
                  const total = items.reduce((s, i) => s + i.splitPct, 0);
                  return (
                    <div key={key} className="border border-white/5">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.01]">
                        <p className="text-[10px] tracking-[0.15em] uppercase text-white/40 font-mono">
                          {key}
                        </p>
                        <span
                          className={`text-[10px] font-mono ${
                            Math.abs(total - 100) < 0.1
                              ? "text-green-400/50"
                              : "text-yellow-400/60"
                          }`}
                        >
                          {total.toFixed(1)}% total
                        </span>
                      </div>
                      <div className="divide-y divide-white/[0.03]">
                        {items.map((s) => (
                          <div
                            key={s.id}
                            className="grid grid-cols-12 gap-2 px-4 py-3 items-center"
                          >
                            <span className="col-span-3 text-[11px] text-white/70">
                              {s.participantName}
                            </span>
                            <span className="col-span-2 text-[10px] text-white/35">
                              {s.participantType}
                            </span>
                            <span className="col-span-3 text-[10px] text-white/30 truncate">
                              {s.role ?? "—"}
                            </span>
                            <span className="col-span-2 text-[11px] font-mono text-sky-400/70 text-right">
                              {s.splitPct}%
                            </span>
                            <div className="col-span-2 flex justify-end">
                              <button
                                onClick={() => handleDeleteSplit(s.id)}
                                className="text-[10px] text-white/15 hover:text-red-400/60 transition-colors"
                                title="Delete"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── PAYOUTS ───────────────────────────────────────────────────── */}
        {!loading && tab === "payouts" && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <select
                value={filterPayoutStatus}
                onChange={(e) => setFilterPayoutStatus(e.target.value)}
                className="bg-neutral-900 border border-white/10 text-white/60 text-xs px-3 py-1.5 focus:outline-none"
              >
                <option value="all">All statuses</option>
                {PAYOUT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {payoutStatusLabel(s)}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowAddPayout(true)}
                className="ml-auto text-[10px] tracking-[0.15em] uppercase text-white/70 hover:text-white transition-colors border border-white/20 px-3 py-1.5"
              >
                + Add Payout
              </button>
            </div>

            {/* Add form */}
            {showAddPayout && (
              <form
                onSubmit={handleAddPayout}
                className="border border-white/10 bg-white/[0.01] p-5 space-y-4"
              >
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">
                  Add Payout Record
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <select
                    value={pParticipantType}
                    onChange={(e) =>
                      setPParticipantType(e.target.value as "artist" | "producer" | "other")
                    }
                    className={inp}
                  >
                    <option value="artist">Artist</option>
                    <option value="producer">Producer</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    placeholder="Participant name *"
                    value={pParticipantName}
                    onChange={(e) => setPParticipantName(e.target.value)}
                    className={inp}
                    required
                  />
                  <input
                    placeholder="Participant slug (optional)"
                    value={pParticipantSlug}
                    onChange={(e) => setPParticipantSlug(e.target.value)}
                    className={inp}
                  />
                  <input
                    placeholder="Period YYYY-MM *"
                    value={pPeriod}
                    onChange={(e) => setPPeriod(e.target.value)}
                    pattern="\d{4}-\d{2}"
                    className={inp}
                    required
                  />
                  <input
                    placeholder="Gross amount *"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={pGross}
                    onChange={(e) => setPGross(e.target.value)}
                    className={inp}
                    required
                  />
                  <input
                    placeholder="Net amount (defaults to gross)"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={pNet}
                    onChange={(e) => setPNet(e.target.value)}
                    className={inp}
                  />
                  <input
                    placeholder="Currency (USD)"
                    value={pCurrency}
                    onChange={(e) => setPCurrency(e.target.value)}
                    className={inp}
                  />
                  <select
                    value={pStatus}
                    onChange={(e) => setPStatus(e.target.value as PayoutStatus)}
                    className={inp}
                  >
                    {PAYOUT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {payoutStatusLabel(s)}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Notes (optional)"
                    value={pNotes}
                    onChange={(e) => setPNotes(e.target.value)}
                    className={inp}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={pSaving}
                    className="text-[10px] tracking-[0.2em] uppercase text-white/70 border border-white/20 px-4 py-2 hover:text-white transition-colors disabled:opacity-40"
                  >
                    {pSaving ? "Saving…" : "Save Payout"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddPayout(false)}
                    className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white/50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <p className="text-[10px] tracking-[0.2em] uppercase text-white/20">
              {filteredPayouts.length} payout{filteredPayouts.length !== 1 ? "s" : ""}
              {filteredPayouts.length > 0 && (
                <span className="ml-3 text-white/30">
                  {fmtAmount(filteredPayouts.reduce((s, p) => s + p.netAmount, 0))} net
                </span>
              )}
            </p>

            {filteredPayouts.length === 0 ? (
              <div className="border border-white/5 py-12 text-center">
                <p className="text-[13px] text-white/20">No payouts found.</p>
              </div>
            ) : (
              <div className="border border-white/5 overflow-x-auto">
                <div className="min-w-[900px]">
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[9px] tracking-[0.2em] uppercase text-white/20 border-b border-white/5 bg-white/[0.01]">
                    <span className="col-span-1">Period</span>
                    <span className="col-span-2">Participant</span>
                    <span className="col-span-1">Type</span>
                    <span className="col-span-1">Gross</span>
                    <span className="col-span-1">Net</span>
                    <span className="col-span-1">Currency</span>
                    <span className="col-span-2">Status</span>
                    <span className="col-span-1">Paid</span>
                    <span className="col-span-2 text-right">Actions</span>
                  </div>
                  <div className="divide-y divide-white/[0.03]">
                    {filteredPayouts.map((p) => (
                      <div
                        key={p.id}
                        className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-white/[0.02] transition-colors"
                      >
                        <span className="col-span-1 text-[10px] font-mono text-white/30">
                          {p.periodMonth}
                        </span>
                        <span className="col-span-2 text-[11px] text-white/70 truncate">
                          {p.participantName}
                        </span>
                        <span className="col-span-1 text-[10px] text-white/35">
                          {p.participantType}
                        </span>
                        <span className="col-span-1 text-[10px] font-mono text-white/40">
                          {fmtAmount(p.grossAmount, p.currency)}
                        </span>
                        <span className="col-span-1 text-[10px] font-mono text-white/60">
                          {fmtAmount(p.netAmount, p.currency)}
                        </span>
                        <span className="col-span-1 text-[10px] font-mono text-white/30">
                          {p.currency}
                        </span>
                        <div className="col-span-2">
                          <span
                            className={`text-[9px] tracking-[0.1em] uppercase border px-1.5 py-0.5 ${payoutStatusColor(
                              p.status
                            )}`}
                          >
                            {payoutStatusLabel(p.status)}
                          </span>
                        </div>
                        <span className="col-span-1 text-[10px] font-mono text-white/20">
                          {p.paidAt ? p.paidAt.slice(0, 10) : "—"}
                        </span>
                        <div className="col-span-2 flex justify-end gap-3">
                          {p.status === "pending" && (
                            <button
                              onClick={() => handleMarkPaid(p.id)}
                              className="text-[10px] tracking-[0.1em] uppercase text-green-400/40 hover:text-green-400 transition-colors"
                            >
                              Mark Paid
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePayout(p.id)}
                            className="text-[10px] text-white/15 hover:text-red-400/60 transition-colors"
                            title="Delete"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STATEMENTS ────────────────────────────────────────────────── */}
        {!loading && tab === "statements" && (
          <div className="space-y-5">
            <div className="border border-white/[0.06] bg-white/[0.01] px-4 py-3">
              <p className="text-[10px] text-white/30 leading-relaxed">
                Download a monthly statement CSV for any period. Each statement
                includes earnings detail by song &amp; platform and a payout
                summary for that month — suitable for sharing with artists and
                producers.
              </p>
            </div>

            {periods.length === 0 ? (
              <div className="border border-white/5 py-12 text-center">
                <p className="text-[13px] text-white/20">
                  No earnings recorded. Add earnings first to generate statements.
                </p>
              </div>
            ) : (
              <div className="border border-white/5 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[9px] tracking-[0.2em] uppercase text-white/20 border-b border-white/5 bg-white/[0.01]">
                  <span className="col-span-2">Period</span>
                  <span className="col-span-2">Gross</span>
                  <span className="col-span-2">Top Platform</span>
                  <span className="col-span-2">Payouts</span>
                  <span className="col-span-2">Pending</span>
                  <span className="col-span-2 text-right">Download</span>
                </div>
                <div className="divide-y divide-white/[0.03]">
                  {periods.map((period) => {
                    const summary = computeMonthlySummary(period, earnings, payouts);
                    const topPlatform = Object.entries(summary.earningsByPlatform).sort(
                      ([, a], [, b]) => b - a
                    )[0];
                    return (
                      <div
                        key={period}
                        className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-white/[0.02] transition-colors"
                      >
                        <span className="col-span-2 text-[11px] font-mono text-white/60">
                          {period}
                        </span>
                        <span className="col-span-2 text-[11px] font-mono text-green-400/70">
                          {fmtAmount(summary.totalGross, summary.currency)}
                        </span>
                        <span className="col-span-2 text-[10px] text-white/40">
                          {topPlatform ? topPlatform[0] : "—"}
                        </span>
                        <span className="col-span-2 text-[10px] font-mono text-white/40">
                          {summary.payouts.length} total
                        </span>
                        <span
                          className={`col-span-2 text-[10px] font-mono ${
                            summary.pendingPayoutCount > 0
                              ? "text-yellow-400/60"
                              : "text-white/20"
                          }`}
                        >
                          {summary.pendingPayoutCount} pending
                        </span>
                        <div className="col-span-2 flex justify-end">
                          <button
                            onClick={() =>
                              exportMonthlyStatementToCSV(period, earnings, payouts)
                            }
                            className="text-[10px] tracking-[0.15em] uppercase text-white/30 hover:text-white/70 transition-colors border border-white/10 px-3 py-1"
                          >
                            ↓ CSV
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Export all */}
            {periods.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={() => exportEarningsToCSV(earnings)}
                  className="text-[10px] tracking-[0.15em] uppercase text-white/25 hover:text-white/60 transition-colors border border-white/10 px-3 py-1.5"
                >
                  Export All Earnings CSV
                </button>
                <button
                  onClick={() => exportSplitsToCSV(splits)}
                  className="text-[10px] tracking-[0.15em] uppercase text-white/25 hover:text-white/60 transition-colors border border-white/10 px-3 py-1.5"
                >
                  Export All Splits CSV
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
