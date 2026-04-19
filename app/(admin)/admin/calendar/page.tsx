"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { useCmsStore } from "@/lib/cms/store";
import { getReadinessScore } from "@/lib/cms/readiness";

// ─── Types ───────────────────────────────────────────────────────────────────

type EventType = "release_scheduled" | "song_scheduled" | "overdue_draft" | "readiness_warning";

interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD or "" for undated
  type: EventType;
  title: string;
  meta?: string;
  href: string;
  score?: number; // for readiness_warning
}

const EVENT_COLOR: Record<EventType, string> = {
  release_scheduled: "border-yellow-800/50 bg-yellow-950/20 text-yellow-300/80",
  song_scheduled:    "border-blue-800/50 bg-blue-950/20 text-blue-300/70",
  overdue_draft:     "border-red-900/40 bg-red-950/20 text-red-300/70",
  readiness_warning: "border-white/10 bg-white/[0.02] text-white/40",
};

const EVENT_LABEL: Record<EventType, string> = {
  release_scheduled: "Scheduled",
  song_scheduled:    "Song",
  overdue_draft:     "Overdue",
  readiness_warning: "Unready",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toYMD(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;
  // handles "2025-06-01" and ISO datetime strings
  return dateStr.slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfWeek(year: number, month: number) {
  // 0 = Sunday
  return new Date(year, month, 1).getDay();
}

// ─── Month view ──────────────────────────────────────────────────────────────

function MonthView({
  year,
  month,
  events,
}: {
  year: number;
  month: number;
  events: CalendarEvent[];
}) {
  const todayStr = today();
  const days = daysInMonth(year, month);
  const startDow = firstDayOfWeek(year, month);

  // Group events by date key
  const byDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((e) => {
      if (!e.date) return;
      if (e.date.slice(0, 7) !== `${year}-${String(month + 1).padStart(2, "0")}`) return;
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [events, year, month]);

  const monthLabel = new Date(year, month, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const cells: (number | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];

  // Pad to complete final row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-3">
      <p className="text-[11px] tracking-[0.2em] uppercase text-white/30">{monthLabel}</p>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-1.5 text-center text-[9px] tracking-[0.15em] uppercase text-white/20">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px bg-white/[0.03]">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`pad-${i}`} className="bg-neutral-950 min-h-[72px]" />;
          }
          const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayEvents = byDate[dateKey] ?? [];
          const isToday = dateKey === todayStr;
          const isPast = dateKey < todayStr;

          return (
            <div
              key={dateKey}
              className={`bg-neutral-950 min-h-[72px] p-1.5 border border-transparent ${
                isToday ? "border-white/15" : ""
              }`}
            >
              <p className={`text-[10px] font-mono mb-1 ${
                isToday
                  ? "text-white font-bold"
                  : isPast
                  ? "text-white/20"
                  : "text-white/40"
              }`}>
                {day}
              </p>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <Link
                    key={ev.id}
                    href={ev.href}
                    className={`block border text-[8px] px-1 py-0.5 truncate leading-tight transition-opacity hover:opacity-80 ${EVENT_COLOR[ev.type]}`}
                    title={ev.title}
                  >
                    {ev.title}
                  </Link>
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-[8px] text-white/20">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

function ListView({ events }: { events: CalendarEvent[] }) {
  const todayStr = today();

  // Separate dated and undated
  const dated = events.filter((e) => e.date).sort((a, b) => a.date.localeCompare(b.date));
  const undated = events.filter((e) => !e.date);

  const past = dated.filter((e) => e.date < todayStr);
  const upcoming = dated.filter((e) => e.date >= todayStr);

  function renderGroup(title: string, items: CalendarEvent[]) {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        <p className="text-[10px] tracking-[0.2em] uppercase text-white/25 pb-1 border-b border-white/5">
          {title} ({items.length})
        </p>
        {items.map((ev) => (
          <Link
            key={ev.id}
            href={ev.href}
            className={`flex items-start gap-4 p-2.5 border transition-opacity hover:opacity-80 ${EVENT_COLOR[ev.type]}`}
          >
            <div className="flex-shrink-0 w-24 text-right">
              <p className="text-[10px] font-mono">{ev.date || "—"}</p>
              <p className="text-[9px] tracking-[0.1em] uppercase opacity-60 mt-0.5">
                {EVENT_LABEL[ev.type]}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] truncate">{ev.title}</p>
              {ev.meta && (
                <p className="text-[10px] opacity-60 mt-0.5 truncate">{ev.meta}</p>
              )}
            </div>
            {ev.score !== undefined && (
              <span className="text-[10px] font-mono flex-shrink-0">{ev.score}%</span>
            )}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {renderGroup("Upcoming", upcoming)}
      {renderGroup("Needs Date / Undated", undated)}
      {renderGroup("Past / Overdue", past)}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminCalendarPage() {
  const { releases, songs } = useCmsStore();
  const [view, setView] = useState<"month" | "list">("list");
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const todayStr = today();

  // Build the unified events list
  const events: CalendarEvent[] = useMemo(() => {
    const evts: CalendarEvent[] = [];

    // ── Scheduled releases ──────────────────────────────────────────────────
    releases
      .filter((r) => r.status === "scheduled")
      .forEach((r) => {
        const date = toYMD(r.publishAt ?? r.releaseDate) ?? "";
        evts.push({
          id: `release-sched-${r.id}`,
          date,
          type: "release_scheduled",
          title: r.title,
          meta: `${r.artistName} — ${r.type}`,
          href: `/admin/releases/${r.slug}`,
        });
      });

    // ── Scheduled songs ─────────────────────────────────────────────────────
    songs
      .filter((s) => s.status === "scheduled" && s.publishAt)
      .forEach((s) => {
        const date = toYMD(s.publishAt) ?? "";
        evts.push({
          id: `song-sched-${s.id}`,
          date,
          type: "song_scheduled",
          title: s.title,
          meta: s.artistName,
          href: `/admin/songs/${s.slug}`,
        });
      });

    // ── Overdue drafts (releases with a releaseDate in the past) ────────────
    releases
      .filter((r) => r.status === "draft" && r.releaseDate && r.releaseDate < todayStr)
      .forEach((r) => {
        evts.push({
          id: `release-overdue-${r.id}`,
          date: r.releaseDate,
          type: "overdue_draft",
          title: r.title,
          meta: `${r.artistName} — release date passed`,
          href: `/admin/releases/${r.slug}`,
        });
      });

    // ── Overdue draft songs ─────────────────────────────────────────────────
    songs
      .filter((s) => s.status === "draft" && s.publishAt && s.publishAt < todayStr)
      .forEach((s) => {
        evts.push({
          id: `song-overdue-${s.id}`,
          date: toYMD(s.publishAt) ?? "",
          type: "overdue_draft",
          title: s.title,
          meta: `${s.artistName} — publish date passed`,
          href: `/admin/songs/${s.slug}`,
        });
      });

    // ── Releases missing readiness (not published, score < 100) ─────────────
    releases
      .filter((r) => r.status !== "published" && r.status !== "archived")
      .map((r) => ({ r, score: getReadinessScore(r, songs) }))
      .filter(({ score }) => score < 100)
      .forEach(({ r, score }) => {
        // Use release date as the calendar anchor (may be "")
        const date = toYMD(r.releaseDate) ?? "";
        evts.push({
          id: `readiness-${r.id}`,
          date,
          type: "readiness_warning",
          title: r.title,
          meta: `${r.artistName} — ${score}% ready`,
          href: `/admin/releases/${r.slug}`,
          score,
        });
      });

    return evts;
  }, [releases, songs, todayStr]);

  // Month navigation
  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  }

  // Stat counts
  const counts = {
    scheduled: releases.filter((r) => r.status === "scheduled").length
      + songs.filter((s) => s.status === "scheduled").length,
    overdue: releases.filter((r) => r.status === "draft" && r.releaseDate < todayStr).length,
    unready: releases.filter((r) => r.status !== "published" && r.status !== "archived" && getReadinessScore(r, songs) < 100).length,
  };

  return (
    <AdminShell title="Release Calendar">
      <div className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-yellow-800/30 bg-yellow-950/10 px-4 py-3">
            <p className="text-2xl font-black text-yellow-400/80">{counts.scheduled}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-yellow-400/40 mt-0.5">Scheduled</p>
          </div>
          <div className="border border-red-900/30 bg-red-950/10 px-4 py-3">
            <p className="text-2xl font-black text-red-400/70">{counts.overdue}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-red-400/40 mt-0.5">Overdue Drafts</p>
          </div>
          <div className="border border-white/5 px-4 py-3">
            <p className="text-2xl font-black text-white/50">{counts.unready}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/20 mt-0.5">Not Ready</p>
          </div>
        </div>

        {/* View toggle + month nav */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 border border-white/5">
            {(["list", "month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 text-[10px] tracking-[0.15em] uppercase transition-colors ${
                  view === v ? "bg-white/[0.06] text-white" : "text-white/30 hover:text-white/60"
                }`}
              >
                {v === "list" ? "↓ List" : "⊞ Month"}
              </button>
            ))}
          </div>

          {view === "month" && (
            <div className="flex items-center gap-3">
              <button
                onClick={prevMonth}
                className="text-[10px] tracking-[0.1em] uppercase text-white/30 hover:text-white transition-colors px-2"
              >
                ← Prev
              </button>
              <p className="text-[11px] tracking-[0.15em] uppercase text-white/40 min-w-[140px] text-center">
                {new Date(calYear, calMonth).toLocaleString("default", { month: "long", year: "numeric" })}
              </p>
              <button
                onClick={nextMonth}
                className="text-[10px] tracking-[0.1em] uppercase text-white/30 hover:text-white transition-colors px-2"
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {(Object.entries(EVENT_LABEL) as [EventType, string][]).map(([type, label]) => (
            <div key={type} className={`flex items-center gap-1.5 border px-2 py-0.5 text-[9px] tracking-[0.1em] uppercase ${EVENT_COLOR[type]}`}>
              <span>● {label}</span>
            </div>
          ))}
        </div>

        {/* View */}
        {view === "month" ? (
          <MonthView year={calYear} month={calMonth} events={events} />
        ) : (
          <ListView events={events} />
        )}

        {events.length === 0 && (
          <div className="border border-white/5 p-10 text-center">
            <p className="text-[11px] tracking-[0.2em] uppercase text-white/20">
              No scheduled, overdue, or unready items.
            </p>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
