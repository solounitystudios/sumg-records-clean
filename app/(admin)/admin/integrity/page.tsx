"use client";

import { AdminShell } from "@/components/admin/AdminShell";
import { useCmsStore } from "@/lib/cms/store";
import Link from "next/link";

// ─── Severity ─────────────────────────────────────────────────────────────────

type Severity = "critical" | "warning" | "info";

interface IntegrityIssue {
  id: string;
  severity: Severity;
  category: string;
  entity: string;
  entityHref: string;
  description: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function severityColor(s: Severity): string {
  if (s === "critical") return "text-red-400";
  if (s === "warning") return "text-yellow-400";
  return "text-blue-400";
}

function severityBg(s: Severity): string {
  if (s === "critical") return "bg-red-500/10 border-red-500/20";
  if (s === "warning") return "bg-yellow-500/10 border-yellow-500/20";
  return "bg-blue-500/10 border-blue-500/20";
}

function severityDot(s: Severity): string {
  if (s === "critical") return "bg-red-400";
  if (s === "warning") return "bg-yellow-400";
  return "bg-blue-400";
}

function severityLabel(s: Severity): string {
  if (s === "critical") return "Critical";
  if (s === "warning") return "Warning";
  return "Info";
}

// ─── Issue row ────────────────────────────────────────────────────────────────

function IssueRow({ issue }: { issue: IntegrityIssue }) {
  return (
    <Link
      href={issue.entityHref}
      className={`flex items-start gap-4 p-3 border transition-all hover:bg-white/[0.02] ${severityBg(issue.severity)}`}
    >
      <span className={`flex-shrink-0 mt-1.5 w-2 h-2 rounded-full ${severityDot(issue.severity)}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-white/60 leading-snug">{issue.description}</p>
        <p className="text-[10px] text-white/25 mt-0.5 font-mono">{issue.entity}</p>
      </div>
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <span className={`text-[9px] tracking-[0.2em] uppercase font-mono ${severityColor(issue.severity)}`}>
          {severityLabel(issue.severity)}
        </span>
        <span className="text-[9px] tracking-[0.15em] uppercase text-white/20">
          {issue.category}
        </span>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntegrityPage() {
  const { artists, brands, releases, songs, assets } = useCmsStore();

  const issues: IntegrityIssue[] = [];

  // ── Artists: missing hero image ──────────────────────────────────────────────
  for (const artist of artists) {
    const hasAttachedHero = assets.some(
      (a) => a.attachedTo?.some((x) => x.entityId === artist.id && x.role === "hero")
    );
    if (!artist.heroImageUrl && !hasAttachedHero) {
      issues.push({
        id: `artist-no-hero-${artist.id}`,
        severity: "warning",
        category: "Artists",
        entity: artist.name,
        entityHref: `/admin/artists/${artist.slug}`,
        description: `Artist "${artist.name}" has no hero image.`,
      });
    }
  }

  // ── Brands: no hero image ────────────────────────────────────────────────────
  for (const brand of brands) {
    const hasAttachedHero = assets.some(
      (a) => a.attachedTo?.some((x) => x.entityId === brand.id && x.role === "hero")
    );
    if (!brand.heroImageUrl && !hasAttachedHero) {
      issues.push({
        id: `brand-no-hero-${brand.id}`,
        severity: "warning",
        category: "Brands",
        entity: brand.name,
        entityHref: `/admin/brands/${brand.slug}`,
        description: `Brand "${brand.name}" has no hero image set.`,
      });
    }
  }

  // ── Brands: no featured assets ───────────────────────────────────────────────
  for (const brand of brands) {
    const hasAttachedAny = assets.some(
      (a) => a.attachedTo?.some((x) => x.entityId === brand.id)
    );
    const hasFeaturedIds = (brand.featuredAssetIds ?? []).length > 0;
    if (!hasAttachedAny && !hasFeaturedIds) {
      issues.push({
        id: `brand-no-assets-${brand.id}`,
        severity: "info",
        category: "Brands",
        entity: brand.name,
        entityHref: `/admin/brands/${brand.slug}`,
        description: `Brand "${brand.name}" has no gallery or featured assets attached.`,
      });
    }
  }

  // ── Releases: missing cover art ──────────────────────────────────────────────
  for (const release of releases) {
    if (release.status === "archived") continue;
    const hasCover =
      release.coverArtUrl ||
      assets.some((a) => a.attachedTo?.some((x) => x.entityId === release.id && x.role === "cover"));
    if (!hasCover) {
      issues.push({
        id: `release-no-cover-${release.id}`,
        severity: release.status === "published" ? "critical" : "warning",
        category: "Releases",
        entity: `${release.title} — ${release.artistName}`,
        entityHref: `/admin/releases/${release.slug}`,
        description: `Release "${release.title}" is missing cover art.`,
      });
    }
  }

  // ── Songs: missing audio ─────────────────────────────────────────────────────
  for (const song of songs) {
    if (song.status === "archived") continue;
    if (!song.audioUrl && !song.mediaAssetId) {
      issues.push({
        id: `song-no-audio-${song.id}`,
        severity: song.status === "published" ? "critical" : "warning",
        category: "Songs",
        entity: `${song.title} — ${song.artistName}`,
        entityHref: `/admin/songs/${song.slug}`,
        description: `Song "${song.title}" has no audio file.`,
      });
    }
  }

  // ── Songs: without release link ──────────────────────────────────────────────
  for (const song of songs) {
    if (song.status === "archived") continue;
    if (!song.releaseSlug) {
      issues.push({
        id: `song-no-release-${song.id}`,
        severity: "info",
        category: "Songs",
        entity: `${song.title} — ${song.artistName}`,
        entityHref: `/admin/songs/${song.slug}`,
        description: `Song "${song.title}" is not linked to any release (standalone single).`,
      });
    }
  }

  // ── Assets: orphaned ────────────────────────────────────────────────────────
  for (const asset of assets) {
    if ((asset.attachedTo ?? []).length === 0) {
      issues.push({
        id: `asset-orphan-${asset.id}`,
        severity: "info",
        category: "Media",
        entity: asset.filename,
        entityHref: `/admin/media`,
        description: `Asset "${asset.filename}" is not attached to any entity (orphaned).`,
      });
    }
  }

  // ── Deduplicate ──────────────────────────────────────────────────────────────
  const seen = new Set<string>();
  const deduped = issues.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });

  // Sort: critical → warning → info
  const sorted = deduped.sort((a, b) => {
    const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  const critCount = sorted.filter((i) => i.severity === "critical").length;
  const warnCount = sorted.filter((i) => i.severity === "warning").length;
  const infoCount = sorted.filter((i) => i.severity === "info").length;

  const categories = Array.from(new Set(sorted.map((i) => i.category)));

  return (
    <AdminShell title="System Integrity">
      <div className="max-w-3xl space-y-8">

        {/* Back */}
        <a
          href="/admin"
          className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors"
        >
          ← Dashboard
        </a>

        {/* Summary tiles */}
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-2xl font-black text-red-400">{critCount}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-red-400/60 mt-1">Critical</p>
          </div>
          <div className="border border-yellow-500/20 bg-yellow-500/5 p-4">
            <p className="text-2xl font-black text-yellow-400">{warnCount}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-yellow-400/60 mt-1">Warnings</p>
          </div>
          <div className="border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-2xl font-black text-blue-400">{infoCount}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-blue-400/60 mt-1">Info</p>
          </div>
        </div>

        {/* All clear */}
        {sorted.length === 0 && (
          <div className="border border-green-500/20 bg-green-500/5 p-8 text-center">
            <p className="text-2xl font-black text-green-400 mb-2">✓</p>
            <p className="text-[11px] tracking-[0.2em] uppercase text-green-400/60">
              No integrity issues found
            </p>
          </div>
        )}

        {/* Issues grouped by category */}
        {categories.map((cat) => {
          const catIssues = sorted.filter((i) => i.category === cat);
          return (
            <div key={cat} className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] tracking-[0.3em] uppercase text-white/25">{cat}</p>
                <span className="text-[10px] font-mono text-white/20">
                  {catIssues.length} issue{catIssues.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-1">
                {catIssues.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} />
                ))}
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div className="border-t border-white/5 pt-6">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/15 mb-4">Legend</p>
          <div className="space-y-2">
            {(["critical", "warning", "info"] as Severity[]).map((s) => (
              <div key={s} className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${severityDot(s)}`} />
                <span className={`text-[10px] uppercase tracking-[0.15em] ${severityColor(s)}`}>
                  {severityLabel(s)}
                </span>
                <span className="text-[10px] text-white/20">—</span>
                <span className="text-[10px] text-white/30">
                  {s === "critical"
                    ? "Published content is missing required data"
                    : s === "warning"
                    ? "Should be resolved before publishing"
                    : "Non-blocking — worth addressing"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
