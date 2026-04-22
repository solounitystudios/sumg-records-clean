"use client";

/**
 * MusicBrainzEnrichPanel
 *
 * Admin panel component that lets a CMS user trigger on-demand MusicBrainz
 * enrichment for a single song and displays one of four outcome states:
 *
 *   enriched  — MBID (and optionally duration) written to Supabase
 *   ambiguous — multiple plausible matches; candidates shown for review
 *   miss      — no match found in MusicBrainz
 *   error     — network / logic failure; message shown
 *
 * The component calls POST /api/musicbrainz/enrich and is self-contained.
 * It does not use the Zustand CMS store — the page should reload after a
 * successful enrichment if it needs fresh data.
 */

import { useState } from "react";
import type { MusicBrainzRecording } from "@/lib/integrations/musicbrainz";

// ─── API response types ───────────────────────────────────────────────────────

type EnrichResponse =
  | { status: "enriched"; mbid: string; durationWritten: string | null }
  | { status: "ambiguous"; reason: string; candidates: MusicBrainzRecording[] }
  | { status: "miss" }
  | { status: "error"; error: string };

// ─── Sub-components ───────────────────────────────────────────────────────────

function CandidateRow({ rec }: { rec: MusicBrainzRecording }) {
  const mbUrl = `https://musicbrainz.org/recording/${rec.mbid}`;
  return (
    <div className="border border-white/[0.06] p-3 space-y-1 text-[11px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white/70 truncate font-medium">{rec.title}</p>
          <p className="text-white/35 truncate">{rec.artistName ?? "—"}</p>
        </div>
        <div className="flex-shrink-0 text-right space-y-0.5">
          {rec.duration && (
            <p className="font-mono text-white/30">{rec.duration}</p>
          )}
          {rec.firstReleaseDate && (
            <p className="text-white/20">{rec.firstReleaseDate.slice(0, 4)}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 pt-1">
        <p className="font-mono text-[10px] text-white/20 truncate">{rec.mbid}</p>
        <a
          href={mbUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-[10px] tracking-[0.1em] uppercase text-white/20 hover:text-white/60 transition-colors"
        >
          ↗ MusicBrainz
        </a>
      </div>
      {rec.isrcs.length > 0 && (
        <p className="font-mono text-[10px] text-white/20">
          ISRC: {rec.isrcs.join(", ")}
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface MusicBrainzEnrichPanelProps {
  songId: string;
  /** Current MBID if the song is already enriched (controls idle state label). */
  existingMbid?: string | null;
}

export function MusicBrainzEnrichPanel({
  songId,
  existingMbid,
}: MusicBrainzEnrichPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnrichResponse | null>(null);

  async function handleEnrich() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/musicbrainz/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId }),
      });

      const json = (await res.json()) as EnrichResponse;
      setResult(json);
    } catch {
      setResult({ status: "error", error: "Network error — check console." });
    } finally {
      setLoading(false);
    }
  }

  // ── Idle state ──────────────────────────────────────────────────────────────
  const idleLabel = existingMbid
    ? "Re-run MusicBrainz lookup"
    : "Enrich from MusicBrainz";

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-0.5">
            MusicBrainz
          </p>
          {existingMbid && !result && (
            <p className="font-mono text-[11px] text-white/30 truncate">
              {existingMbid}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleEnrich}
          disabled={loading}
          className="flex-shrink-0 border border-white/10 px-4 py-2 text-[10px] tracking-[0.15em] uppercase text-white/40 hover:border-white/30 hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          {loading ? "Looking up…" : idleLabel}
        </button>
      </div>

      {/* Result states */}
      {result && (
        <div className="border border-white/[0.06] bg-white/[0.01] p-4 space-y-3">

          {/* ── Enriched ───────────────────────────────────────────────────── */}
          {result.status === "enriched" && (
            <div className="space-y-2">
              <p className="text-[10px] tracking-[0.2em] uppercase text-green-400/70">
                ✓ Enriched
              </p>
              <p className="font-mono text-[11px] text-white/50">{result.mbid}</p>
              {result.durationWritten && (
                <p className="text-[11px] text-white/35">
                  Duration written:{" "}
                  <span className="font-mono">{result.durationWritten}</span>
                </p>
              )}
              <p className="text-[10px] text-white/20">
                Reload the page to see updated metadata.
              </p>
            </div>
          )}

          {/* ── Ambiguous ──────────────────────────────────────────────────── */}
          {result.status === "ambiguous" && (
            <div className="space-y-3">
              <p className="text-[10px] tracking-[0.2em] uppercase text-yellow-400/70">
                ⚠ Ambiguous — review required
              </p>
              <p className="text-[11px] text-white/40">{result.reason}</p>
              <p className="text-[10px] text-white/25">
                Nothing was written. Pick the correct recording on MusicBrainz,
                then set the MBID manually.
              </p>
              {result.candidates.length > 0 && (
                <div className="space-y-2 pt-1">
                  {result.candidates.map((c) => (
                    <CandidateRow key={c.mbid} rec={c} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Miss ───────────────────────────────────────────────────────── */}
          {result.status === "miss" && (
            <div className="space-y-1">
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">
                ◌ No match found
              </p>
              <p className="text-[11px] text-white/25">
                MusicBrainz returned no result for this song. Check the title
                and artist name spelling, or add an ISRC for a more reliable
                lookup.
              </p>
            </div>
          )}

          {/* ── Error ──────────────────────────────────────────────────────── */}
          {result.status === "error" && (
            <div className="space-y-1">
              <p className="text-[10px] tracking-[0.2em] uppercase text-red-400/70">
                ✕ Error
              </p>
              <p className="text-[11px] font-mono text-red-300/60 break-all">
                {result.error}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
