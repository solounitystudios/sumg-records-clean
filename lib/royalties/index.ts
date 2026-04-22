/**
 * lib/royalties/index.ts
 *
 * Server-side data access for the royalty platform:
 *   • royalty_earnings  — per-song/platform/period gross amounts
 *   • royalty_splits    — participant split configurations
 *   • royalty_payouts   — pending/paid payout records
 *
 * All functions fall back gracefully to empty arrays when Supabase is not
 * configured (local dev without a DB).
 */

import { createClient } from "@supabase/supabase-js";
import {
  RoyaltyEarning,
  RoyaltySplit,
  RoyaltyPayout,
  RoyaltyMonthlySummary,
  PayoutStatus,
} from "@/lib/types";

// ─── Supabase client ──────────────────────────────────────────────────────────

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url?.startsWith("https://") || !key) return null;
  return createClient(url, key);
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEarning(r: any): RoyaltyEarning {
  return {
    id: r.id,
    songSlug: r.song_slug ?? undefined,
    releaseSlug: r.release_slug ?? undefined,
    artistSlug: r.artist_slug,
    title: r.title ?? "",
    platform: r.platform,
    periodMonth: r.period_month,
    grossAmount: Number(r.gross_amount ?? 0),
    currency: r.currency ?? "USD",
    streams: r.streams ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSplit(r: any): RoyaltySplit {
  return {
    id: r.id,
    songSlug: r.song_slug ?? undefined,
    releaseSlug: r.release_slug ?? undefined,
    participantType: r.participant_type ?? "artist",
    participantSlug: r.participant_slug ?? undefined,
    participantName: r.participant_name,
    splitPct: Number(r.split_pct ?? 0),
    role: r.role ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPayout(r: any): RoyaltyPayout {
  return {
    id: r.id,
    participantType: r.participant_type ?? "artist",
    participantSlug: r.participant_slug ?? undefined,
    participantName: r.participant_name,
    periodMonth: r.period_month,
    grossAmount: Number(r.gross_amount ?? 0),
    netAmount: Number(r.net_amount ?? 0),
    currency: r.currency ?? "USD",
    status: r.status ?? "pending",
    paidAt: r.paid_at ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ─── Earnings ─────────────────────────────────────────────────────────────────

/** Return all earnings rows, newest period first. */
export async function getAllEarnings(): Promise<RoyaltyEarning[]> {
  const sb = getClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("royalty_earnings")
    .select("*")
    .order("period_month", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[royalties] getAllEarnings:", error.message);
    return [];
  }
  return (data ?? []).map(rowToEarning);
}

/** Return earnings for a specific period (YYYY-MM). */
export async function getEarningsForPeriod(
  periodMonth: string
): Promise<RoyaltyEarning[]> {
  const sb = getClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("royalty_earnings")
    .select("*")
    .eq("period_month", periodMonth)
    .order("gross_amount", { ascending: false });
  if (error) {
    console.error("[royalties] getEarningsForPeriod:", error.message);
    return [];
  }
  return (data ?? []).map(rowToEarning);
}

/** Insert a new earning row. */
export async function insertEarning(
  earning: Omit<RoyaltyEarning, "id" | "createdAt">
): Promise<RoyaltyEarning | null> {
  const sb = getClient();
  if (!sb) return null;
  const id = crypto.randomUUID();
  const { data, error } = await sb
    .from("royalty_earnings")
    .insert({
      id,
      song_slug: earning.songSlug ?? null,
      release_slug: earning.releaseSlug ?? null,
      artist_slug: earning.artistSlug,
      title: earning.title,
      platform: earning.platform,
      period_month: earning.periodMonth,
      gross_amount: earning.grossAmount,
      currency: earning.currency,
      streams: earning.streams ?? null,
      notes: earning.notes ?? null,
    })
    .select()
    .maybeSingle();
  if (error) {
    console.error("[royalties] insertEarning:", error.message);
    return null;
  }
  return data ? rowToEarning(data) : null;
}

/** Delete an earning row by id. */
export async function deleteEarning(id: string): Promise<boolean> {
  const sb = getClient();
  if (!sb) return false;
  const { error } = await sb.from("royalty_earnings").delete().eq("id", id);
  if (error) {
    console.error("[royalties] deleteEarning:", error.message);
    return false;
  }
  return true;
}

// ─── Splits ───────────────────────────────────────────────────────────────────

/** Return all split configs, ordered by participant name. */
export async function getAllSplits(): Promise<RoyaltySplit[]> {
  const sb = getClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("royalty_splits")
    .select("*")
    .order("participant_name", { ascending: true });
  if (error) {
    console.error("[royalties] getAllSplits:", error.message);
    return [];
  }
  return (data ?? []).map(rowToSplit);
}

/** Return splits for a specific song slug. */
export async function getSplitsForSong(songSlug: string): Promise<RoyaltySplit[]> {
  const sb = getClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("royalty_splits")
    .select("*")
    .eq("song_slug", songSlug)
    .order("split_pct", { ascending: false });
  if (error) {
    console.error("[royalties] getSplitsForSong:", error.message);
    return [];
  }
  return (data ?? []).map(rowToSplit);
}

/** Insert a new split config row. */
export async function insertSplit(
  split: Omit<RoyaltySplit, "id" | "createdAt" | "updatedAt">
): Promise<RoyaltySplit | null> {
  const sb = getClient();
  if (!sb) return null;
  const id = crypto.randomUUID();
  const ts = new Date().toISOString();
  const { data, error } = await sb
    .from("royalty_splits")
    .insert({
      id,
      song_slug: split.songSlug ?? null,
      release_slug: split.releaseSlug ?? null,
      participant_type: split.participantType,
      participant_slug: split.participantSlug ?? null,
      participant_name: split.participantName,
      split_pct: split.splitPct,
      role: split.role ?? null,
      created_at: ts,
      updated_at: ts,
    })
    .select()
    .maybeSingle();
  if (error) {
    console.error("[royalties] insertSplit:", error.message);
    return null;
  }
  return data ? rowToSplit(data) : null;
}

/** Update a split row. */
export async function updateSplit(
  id: string,
  patch: Partial<Omit<RoyaltySplit, "id" | "createdAt" | "updatedAt">>
): Promise<RoyaltySplit | null> {
  const sb = getClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("royalty_splits")
    .update({
      participant_type: patch.participantType,
      participant_slug: patch.participantSlug ?? null,
      participant_name: patch.participantName,
      split_pct: patch.splitPct,
      role: patch.role ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) {
    console.error("[royalties] updateSplit:", error.message);
    return null;
  }
  return data ? rowToSplit(data) : null;
}

/** Delete a split config by id. */
export async function deleteSplit(id: string): Promise<boolean> {
  const sb = getClient();
  if (!sb) return false;
  const { error } = await sb.from("royalty_splits").delete().eq("id", id);
  if (error) {
    console.error("[royalties] deleteSplit:", error.message);
    return false;
  }
  return true;
}

// ─── Payouts ──────────────────────────────────────────────────────────────────

/** Return all payouts, newest period first. */
export async function getAllPayouts(): Promise<RoyaltyPayout[]> {
  const sb = getClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("royalty_payouts")
    .select("*")
    .order("period_month", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[royalties] getAllPayouts:", error.message);
    return [];
  }
  return (data ?? []).map(rowToPayout);
}

/** Return payouts with a specific status. */
export async function getPayoutsByStatus(
  status: PayoutStatus
): Promise<RoyaltyPayout[]> {
  const sb = getClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("royalty_payouts")
    .select("*")
    .eq("status", status)
    .order("period_month", { ascending: false });
  if (error) {
    console.error("[royalties] getPayoutsByStatus:", error.message);
    return [];
  }
  return (data ?? []).map(rowToPayout);
}

/** Insert a payout row. */
export async function insertPayout(
  payout: Omit<RoyaltyPayout, "id" | "createdAt" | "updatedAt">
): Promise<RoyaltyPayout | null> {
  const sb = getClient();
  if (!sb) return null;
  const id = crypto.randomUUID();
  const ts = new Date().toISOString();
  const { data, error } = await sb
    .from("royalty_payouts")
    .insert({
      id,
      participant_type: payout.participantType,
      participant_slug: payout.participantSlug ?? null,
      participant_name: payout.participantName,
      period_month: payout.periodMonth,
      gross_amount: payout.grossAmount,
      net_amount: payout.netAmount,
      currency: payout.currency,
      status: payout.status,
      paid_at: payout.paidAt ?? null,
      notes: payout.notes ?? null,
      created_at: ts,
      updated_at: ts,
    })
    .select()
    .maybeSingle();
  if (error) {
    console.error("[royalties] insertPayout:", error.message);
    return null;
  }
  return data ? rowToPayout(data) : null;
}

/** Update a payout's status (e.g. mark as paid). */
export async function updatePayoutStatus(
  id: string,
  status: PayoutStatus,
  paidAt?: string
): Promise<RoyaltyPayout | null> {
  const sb = getClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("royalty_payouts")
    .update({
      status,
      paid_at: paidAt ?? (status === "paid" ? new Date().toISOString() : null),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) {
    console.error("[royalties] updatePayoutStatus:", error.message);
    return null;
  }
  return data ? rowToPayout(data) : null;
}

/** Delete a payout by id. */
export async function deletePayout(id: string): Promise<boolean> {
  const sb = getClient();
  if (!sb) return false;
  const { error } = await sb.from("royalty_payouts").delete().eq("id", id);
  if (error) {
    console.error("[royalties] deletePayout:", error.message);
    return false;
  }
  return true;
}

// ─── Monthly summary (in-memory computation) ──────────────────────────────────

/**
 * Compute a RoyaltyMonthlySummary for a given period from pre-fetched data.
 * This is pure computation — no additional DB calls.
 */
export function computeMonthlySummary(
  periodMonth: string,
  earnings: RoyaltyEarning[],
  payouts: RoyaltyPayout[]
): RoyaltyMonthlySummary {
  const periodEarnings = earnings.filter((e) => e.periodMonth === periodMonth);
  const periodPayouts = payouts.filter((p) => p.periodMonth === periodMonth);

  const totalGross = periodEarnings.reduce((s, e) => s + e.grossAmount, 0);
  const currency =
    periodEarnings.find((e) => e.currency)?.currency ?? "USD";

  const earningsByPlatform: Record<string, number> = {};
  for (const e of periodEarnings) {
    earningsByPlatform[e.platform] =
      (earningsByPlatform[e.platform] ?? 0) + e.grossAmount;
  }

  // Group by song slug/title for per-song breakdown
  const bySong: Record<string, { title: string; songSlug?: string; gross: number }> = {};
  for (const e of periodEarnings) {
    const key = e.songSlug ?? e.releaseSlug ?? e.title;
    if (!bySong[key]) {
      bySong[key] = { title: e.title, songSlug: e.songSlug, gross: 0 };
    }
    bySong[key].gross += e.grossAmount;
  }
  const earningsBySong = Object.values(bySong).sort((a, b) => b.gross - a.gross);

  const pendingPayouts = periodPayouts.filter((p) => p.status === "pending");
  const pendingPayoutTotal = pendingPayouts.reduce((s, p) => s + p.netAmount, 0);

  return {
    periodMonth,
    totalGross,
    currency,
    earningsByPlatform,
    earningsBySong,
    payouts: periodPayouts,
    pendingPayoutCount: pendingPayouts.length,
    pendingPayoutTotal,
  };
}

/**
 * Return all distinct period months found in earnings, sorted newest first.
 */
export function distinctPeriods(earnings: RoyaltyEarning[]): string[] {
  const periods = [...new Set(earnings.map((e) => e.periodMonth))];
  return periods.sort((a, b) => (b > a ? 1 : -1));
}
