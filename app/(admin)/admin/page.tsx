import { AdminShell } from "@/components/admin/AdminShell";
import { artists } from "@/data/artists";
import { producers } from "@/data/producers";
import { brands } from "@/data/brands";
import { releases as rawReleases } from "@/data/releases";
import { songs as rawSongs } from "@/data/songs";
import { getReadinessScore } from "@/lib/cms/readiness";
import Link from "next/link";

export const metadata = { title: "Dashboard — SUMG Admin" };

// ─── Stat tile ───────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: number | string;
  href: string;
  accent?: "green" | "yellow" | "red";
}) {
  const accentClass =
    accent === "green"
      ? "text-green-400/80"
      : accent === "yellow"
      ? "text-yellow-400/80"
      : accent === "red"
      ? "text-red-400/70"
      : "text-white";
  return (
    <Link
      href={href}
      className="border border-white/5 p-5 hover:border-white/10 hover:bg-white/[0.02] transition-all duration-200 block"
    >
      <p className={`text-3xl font-black mb-1 ${accentClass}`}>{value}</p>
      <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">{label}</p>
    </Link>
  );
}

// ─── List row ────────────────────────────────────────────────────────────────

function ListRow({
  label,
  meta,
  href,
  badge,
  badgeColor = "text-white/30",
}: {
  label: string;
  meta?: string;
  href: string;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between border-b border-white/[0.04] py-2.5 hover:bg-white/[0.01] transition-colors px-1 group"
    >
      <div className="min-w-0">
        <p className="text-[12px] text-white/60 group-hover:text-white/90 transition-colors truncate">
          {label}
        </p>
        {meta && (
          <p className="text-[10px] text-white/20 mt-0.5 truncate">{meta}</p>
        )}
      </div>
      {badge && (
        <span className={`text-[10px] font-mono flex-shrink-0 ml-3 ${badgeColor}`}>{badge}</span>
      )}
    </Link>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] tracking-[0.3em] uppercase text-white/25">{title}</p>
        {href && (
          <Link
            href={href}
            className="text-[10px] tracking-[0.1em] uppercase text-white/15 hover:text-white/40 transition-colors"
          >
            View all →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  // Compute stats from seed data (will be replaced by store in client components)
  const publishedReleases = rawReleases.filter(
    (r) => r.status === "published" && r.isVisible
  );
  const draftReleases = rawReleases.filter((r) => r.status === "draft");
  const scheduledReleases = rawReleases.filter((r) => r.status === "scheduled");
  const archivedReleases = rawReleases.filter((r) => r.status === "archived");

  const songsWithoutAudio = rawSongs.filter((s) => !s.audioUrl);
  const publishedSongs = rawSongs.filter(
    (s) => s.status === "published" && s.isVisible
  );

  // Releases not at 100% readiness
  const unreadyReleases = rawReleases
    .filter((r) => r.status !== "archived")
    .map((r) => ({ release: r, score: getReadinessScore(r, rawSongs) }))
    .filter(({ score }) => score < 100)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Latest edited releases (by updatedAt desc)
  const latestEdited = [...rawReleases]
    .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))
    .slice(0, 5);

  return (
    <AdminShell title="Dashboard">
      <div className="space-y-8">
        {/* ── Primary stats ────────────────────────────────────────────────── */}
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-4">
            Overview
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile
              label="Artists"
              value={artists.length}
              href="/admin/artists"
            />
            <StatTile
              label="Producers"
              value={producers.length}
              href="/admin/producers"
            />
            <StatTile
              label="Brands"
              value={brands.length}
              href="/admin/brands"
            />
            <StatTile
              label="Songs"
              value={rawSongs.length}
              href="/admin/songs"
            />
          </div>
        </div>

        {/* ── Release health ───────────────────────────────────────────────── */}
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-4">
            Releases
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatTile
              label="Published"
              value={publishedReleases.length}
              href="/admin/releases?tab=published"
              accent="green"
            />
            <StatTile
              label="Scheduled"
              value={scheduledReleases.length}
              href="/admin/releases?tab=scheduled"
              accent="yellow"
            />
            <StatTile
              label="Draft"
              value={draftReleases.length}
              href="/admin/releases?tab=draft"
            />
            <StatTile
              label="Archived"
              value={archivedReleases.length}
              href="/admin/releases?tab=archived"
            />
          </div>
        </div>

        {/* ── Two-column panels ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Readiness warnings */}
          <Section title="Releases Missing Readiness" href="/admin/releases">
            {unreadyReleases.length === 0 ? (
              <p className="text-[11px] text-white/20 italic py-2">
                All active releases are ready ✓
              </p>
            ) : (
              unreadyReleases.map(({ release, score }) => (
                <ListRow
                  key={release.id}
                  label={release.title}
                  meta={`${release.artistName} — ${release.type}`}
                  href={`/admin/releases/${release.slug}`}
                  badge={`${score}%`}
                  badgeColor={
                    score >= 66
                      ? "text-yellow-400/60"
                      : "text-red-400/60"
                  }
                />
              ))
            )}
          </Section>

          {/* Songs missing audio */}
          <Section title="Songs Missing Audio" href="/admin/songs">
            {songsWithoutAudio.length === 0 ? (
              <p className="text-[11px] text-white/20 italic py-2">
                All songs have audio ✓
              </p>
            ) : (
              songsWithoutAudio.slice(0, 5).map((s) => (
                <ListRow
                  key={s.id}
                  label={s.title}
                  meta={`${s.artistName}${s.releaseName ? ` — ${s.releaseName}` : ""}`}
                  href={`/admin/songs/${s.slug}`}
                  badge="No audio"
                  badgeColor="text-red-400/50"
                />
              ))
            )}
            {songsWithoutAudio.length > 5 && (
              <p className="text-[10px] text-white/20 pt-2">
                +{songsWithoutAudio.length - 5} more
              </p>
            )}
          </Section>

          {/* Latest edited */}
          <Section title="Recently Edited Releases" href="/admin/releases">
            {latestEdited.map((r) => (
              <ListRow
                key={r.id}
                label={r.title}
                meta={r.updatedAt.slice(0, 10)}
                href={`/admin/releases/${r.slug}`}
                badge={r.status}
                badgeColor={
                  r.status === "published"
                    ? "text-green-400/60"
                    : r.status === "scheduled"
                    ? "text-yellow-400/60"
                    : "text-white/20"
                }
              />
            ))}
          </Section>

          {/* Scheduled releases */}
          <Section title="Scheduled Releases" href="/admin/releases">
            {scheduledReleases.length === 0 ? (
              <p className="text-[11px] text-white/20 italic py-2">
                No scheduled releases.
              </p>
            ) : (
              scheduledReleases.map((r) => (
                <ListRow
                  key={r.id}
                  label={r.title}
                  meta={r.publishAt ? `Publishes: ${r.publishAt.slice(0, 10)}` : "No publish date set"}
                  href={`/admin/releases/${r.slug}`}
                  badge={r.publishAt ? r.publishAt.slice(0, 10) : "—"}
                  badgeColor="text-yellow-400/50"
                />
              ))
            )}
          </Section>
        </div>

        {/* ── Songs at-a-glance ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatTile
            label="Published Songs"
            value={publishedSongs.length}
            href="/admin/songs"
            accent="green"
          />
          <StatTile
            label="Songs Missing Audio"
            value={songsWithoutAudio.length}
            href="/admin/songs"
            accent={songsWithoutAudio.length > 0 ? "red" : undefined}
          />
          <StatTile
            label="Upload Media"
            value="→"
            href="/admin/media"
          />
        </div>

        {/* ── Quick actions ────────────────────────────────────────────────── */}
        <div className="border-t border-white/5 pt-8">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25 mb-6">
            Quick Actions
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "New Release", href: "/admin/releases/new" },
              { label: "New Song", href: "/admin/songs/new" },
              { label: "New Artist", href: "/admin/artists/new" },
              { label: "Upload Media", href: "/admin/media" },
              { label: "Manage Brands", href: "/admin/brands" },
              { label: "Manage Producers", href: "/admin/producers" },
              { label: "Homepage Config", href: "/admin/homepage" },
              { label: "System Integrity", href: "/admin/integrity" },
              { label: "View Public Site", href: "/" },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="border border-white/5 px-5 py-4 text-[11px] tracking-[0.15em] uppercase text-white/40 hover:text-white hover:border-white/15 hover:bg-white/[0.02] transition-all duration-200 block"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
