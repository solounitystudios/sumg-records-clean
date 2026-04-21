"use client";

/**
 * /admin/artists/[slug]/timeline
 *
 * Artist timeline intelligence system.
 *
 * Views: Timeline (chronological list) | Calendar | List
 * CRUD: Create / Edit / Delete items inline
 * Color-coded by type, filterable, lyric-engine eligible flagging
 */

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { FormField } from "@/components/admin/FormField";
import { useCmsStore } from "@/lib/cms/store";
import { useRole } from "@/lib/auth/use-role";
import {
  ArtistTimelineItem,
  TimelineItemType,
  TimelineItemStatus,
  TimelineItemVisibility,
} from "@/lib/types";
import { TIMELINE_TYPE_META } from "@/lib/cms/timeline";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = "timeline" | "list" | "calendar";

const ITEM_TYPES = Object.keys(TIMELINE_TYPE_META) as TimelineItemType[];

const STATUS_OPTIONS: TimelineItemStatus[] = [
  "draft",
  "confirmed",
  "completed",
  "cancelled",
];

const VISIBILITY_OPTIONS: TimelineItemVisibility[] = [
  "private",
  "team",
  "public",
];

// ─── Empty form defaults ──────────────────────────────────────────────────────

function emptyForm(artistSlug: string): Omit<
  ArtistTimelineItem,
  "id" | "createdAt" | "updatedAt"
> {
  return {
    artistSlug,
    type: "milestone",
    title: "",
    description: "",
    eventDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    status: "draft",
    visibility: "private",
    linkedReleaseSlug: "",
    linkedSongSlug: "",
    tags: [],
    importance: 5,
    lyricEngineEligible: false,
  };
}

// ─── Item card ────────────────────────────────────────────────────────────────

function TimelineCard({
  item,
  canEdit,
  onEdit,
  onDelete,
}: {
  item: ArtistTimelineItem;
  canEdit: boolean;
  onEdit: (item: ArtistTimelineItem) => void;
  onDelete: (id: string) => void;
}) {
  const meta = TIMELINE_TYPE_META[item.type];

  return (
    <div className="border border-white/[0.06] p-4 space-y-2 relative">
      {/* Color stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5"
        style={{ backgroundColor: meta.color }}
      />

      <div className="flex items-start gap-3 pl-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className="text-[10px] tracking-[0.15em] uppercase"
              style={{ color: meta.color }}
            >
              {meta.icon} {meta.label}
            </span>
            <span className="text-[10px] font-mono text-white/20">
              {new Date(item.eventDate).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            {item.endDate && (
              <span className="text-[10px] font-mono text-white/15">
                →{" "}
                {new Date(item.endDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
            <span className="text-[10px] tracking-[0.1em] uppercase border border-white/[0.06] px-2 py-0.5 text-white/20">
              {item.status}
            </span>
            {item.lyricEngineEligible && (
              <span className="text-[10px] tracking-[0.1em] uppercase border border-purple-800/30 text-purple-400/50 px-2 py-0.5">
                ✦ Lyric Engine
              </span>
            )}
          </div>

          <p className="text-sm text-white/80 font-medium">{item.title}</p>

          {item.description && (
            <p className="text-[11px] text-white/40 mt-1 leading-relaxed">
              {item.description}
            </p>
          )}

          <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-white/20">
            <span>
              Importance:{" "}
              <span className="text-white/40">{item.importance}/10</span>
            </span>
            <span>
              Visibility:{" "}
              <span className="text-white/40">{item.visibility}</span>
            </span>
            {item.linkedReleaseSlug && (
              <span>
                Release:{" "}
                <a
                  href={`/admin/releases/${item.linkedReleaseSlug}`}
                  className="text-white/40 hover:text-white transition-colors underline underline-offset-2"
                >
                  {item.linkedReleaseSlug}
                </a>
              </span>
            )}
            {item.linkedSongSlug && (
              <span>
                Song:{" "}
                <a
                  href={`/admin/songs/${item.linkedSongSlug}`}
                  className="text-white/40 hover:text-white transition-colors underline underline-offset-2"
                >
                  {item.linkedSongSlug}
                </a>
              </span>
            )}
            {(item.tags ?? []).length > 0 && (
              <span>
                Tags:{" "}
                <span className="text-white/40">
                  {(item.tags ?? []).join(", ")}
                </span>
              </span>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onEdit(item)}
              className="text-[10px] text-white/25 hover:text-white transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete "${item.title}"?`)) onDelete(item.id);
              }}
              className="text-[10px] text-red-400/30 hover:text-red-400 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Item form ────────────────────────────────────────────────────────────────

function TimelineItemForm({
  initial,
  releases,
  songs,
  onSave,
  onCancel,
}: {
  initial: Omit<ArtistTimelineItem, "id" | "createdAt" | "updatedAt">;
  releases: { slug: string; title: string }[];
  songs: { slug: string; title: string }[];
  onSave: (
    data: Omit<ArtistTimelineItem, "id" | "createdAt" | "updatedAt">
  ) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({
      ...form,
      description: form.description || undefined,
      endDate: (form.endDate as string) || undefined,
      linkedReleaseSlug: (form.linkedReleaseSlug as string) || undefined,
      linkedSongSlug: (form.linkedSongSlug as string) || undefined,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-white/10 p-6 space-y-5 bg-white/[0.02]"
    >
      <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">
        {initial.title ? "Edit Timeline Item" : "New Timeline Item"}
      </p>

      {/* Type */}
      <div>
        <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-2">
          Type
        </p>
        <div className="flex flex-wrap gap-2">
          {ITEM_TYPES.map((t) => {
            const m = TIMELINE_TYPE_META[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => set("type", t)}
                className="text-[10px] tracking-[0.1em] uppercase border px-3 py-1.5 transition-all"
                style={
                  form.type === t
                    ? { borderColor: m.color, color: m.color }
                    : { borderColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)" }
                }
              >
                {m.icon} {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <FormField
        type="text"
        label="Title"
        required
        value={form.title}
        onChange={(v) => set("title", v)}
      />

      <FormField
        type="textarea"
        label="Description"
        rows={3}
        value={form.description ?? ""}
        onChange={(v) => set("description", v)}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="date"
          label="Event Date"
          required
          value={form.eventDate}
          onChange={(v) => set("eventDate", v)}
        />
        <FormField
          type="date"
          label="End Date (optional)"
          value={(form.endDate as string) ?? ""}
          onChange={(v) => set("endDate", v)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-2">
            Status
          </p>
          <select
            value={form.status}
            onChange={(e) =>
              set("status", e.target.value as TimelineItemStatus)
            }
            className="w-full bg-transparent border border-white/10 px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="bg-neutral-900">
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-2">
            Visibility
          </p>
          <select
            value={form.visibility}
            onChange={(e) =>
              set("visibility", e.target.value as TimelineItemVisibility)
            }
            className="w-full bg-transparent border border-white/10 px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none"
          >
            {VISIBILITY_OPTIONS.map((v) => (
              <option key={v} value={v} className="bg-neutral-900">
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Importance slider */}
      <div>
        <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-2">
          Importance{" "}
          <span className="text-white/40 normal-case tracking-normal">
            {form.importance}/10
          </span>
        </p>
        <input
          type="range"
          min={1}
          max={10}
          value={form.importance}
          onChange={(e) => set("importance", parseInt(e.target.value))}
          className="w-full accent-white/30"
        />
      </div>

      {/* Lyric engine toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="lyricEngine"
          checked={form.lyricEngineEligible}
          onChange={(e) => set("lyricEngineEligible", e.target.checked)}
          className="w-4 h-4 accent-purple-500"
        />
        <label
          htmlFor="lyricEngine"
          className="text-[11px] text-white/40 cursor-pointer select-none"
        >
          ✦ Lyric Engine Eligible — include in AI song-writing context
        </label>
      </div>

      {/* Linked entities */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-2">
            Linked Release
          </p>
          <select
            value={(form.linkedReleaseSlug as string) ?? ""}
            onChange={(e) =>
              set("linkedReleaseSlug", e.target.value || undefined)
            }
            className="w-full bg-transparent border border-white/10 px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none"
          >
            <option value="" className="bg-neutral-900">
              — None —
            </option>
            {releases.map((r) => (
              <option key={r.slug} value={r.slug} className="bg-neutral-900">
                {r.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-2">
            Linked Song
          </p>
          <select
            value={(form.linkedSongSlug as string) ?? ""}
            onChange={(e) =>
              set("linkedSongSlug", e.target.value || undefined)
            }
            className="w-full bg-transparent border border-white/10 px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none"
          >
            <option value="" className="bg-neutral-900">
              — None —
            </option>
            {songs.map((s) => (
              <option key={s.slug} value={s.slug} className="bg-neutral-900">
                {s.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <FormField
        type="text"
        label="Tags (comma separated)"
        value={(form.tags ?? []).join(", ")}
        placeholder="e.g. debut, breakthrough, pivot"
        onChange={(v) =>
          set(
            "tags",
            v
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          )
        }
      />

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="border border-white/20 px-6 py-2.5 text-[11px] tracking-[0.15em] uppercase text-white hover:bg-white/[0.06] transition-colors"
        >
          Save Item
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-[11px] tracking-[0.15em] uppercase text-white/25 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Calendar month view ──────────────────────────────────────────────────────

function CalendarView({ items }: { items: ArtistTimelineItem[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const itemsByDay = useMemo(() => {
    const map: Record<number, ArtistTimelineItem[]> = {};
    items.forEach((item) => {
      const d = new Date(item.eventDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(item);
      }
    });
    return map;
  }, [items, year, month]);

  const monthName = new Date(year, month).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            if (month === 0) { setMonth(11); setYear((y) => y - 1); }
            else setMonth((m) => m - 1);
          }}
          className="text-white/30 hover:text-white transition-colors text-lg"
        >
          ←
        </button>
        <p className="text-sm text-white/60 font-medium min-w-[12rem] text-center">
          {monthName}
        </p>
        <button
          onClick={() => {
            if (month === 11) { setMonth(0); setYear((y) => y + 1); }
            else setMonth((m) => m + 1);
          }}
          className="text-white/30 hover:text-white transition-colors text-lg"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-white/[0.04]">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div
            key={d}
            className="text-[10px] tracking-[0.1em] uppercase text-white/20 text-center py-2"
          >
            {d}
          </div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-neutral-950 h-16" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dayItems = itemsByDay[day] ?? [];
          const isToday =
            today.getDate() === day &&
            today.getMonth() === month &&
            today.getFullYear() === year;
          return (
            <div
              key={day}
              className={`bg-neutral-950 p-1.5 h-16 overflow-hidden ${
                isToday ? "ring-1 ring-white/20" : ""
              }`}
            >
              <p
                className={`text-[10px] font-mono mb-1 ${
                  isToday ? "text-white" : "text-white/25"
                }`}
              >
                {day}
              </p>
              {dayItems.slice(0, 2).map((item) => {
                const meta = TIMELINE_TYPE_META[item.type];
                return (
                  <div
                    key={item.id}
                    className="truncate text-[9px] px-1 py-0.5 mb-0.5"
                    style={{
                      backgroundColor: `${meta.color}20`,
                      color: meta.color,
                    }}
                    title={item.title}
                  >
                    {item.title}
                  </div>
                );
              })}
              {dayItems.length > 2 && (
                <p className="text-[9px] text-white/20">
                  +{dayItems.length - 2} more
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ArtistTimelinePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const {
    getArtistBySlug,
    getTimelineItemsForArtist,
    createTimelineItem,
    updateTimelineItem,
    deleteTimelineItem,
    releases,
    songs,
    notify,
  } = useCmsStore();

  const role = useRole();
  const canEdit = role.canEditContent;

  const artist = getArtistBySlug(slug);
  const allItems = getTimelineItemsForArtist(slug);

  const [view, setView] = useState<ViewMode>("timeline");
  const [filterType, setFilterType] = useState<TimelineItemType | "all">("all");
  const [filterLyric, setFilterLyric] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ArtistTimelineItem | null>(
    null
  );

  const filteredItems = useMemo(() => {
    let items = allItems;
    if (filterType !== "all")
      items = items.filter((i) => i.type === filterType);
    if (filterLyric) items = items.filter((i) => i.lyricEngineEligible);
    return items;
  }, [allItems, filterType, filterLyric]);

  const artistReleases = releases.filter((r) => r.artistSlug === slug);
  const artistSongs = songs.filter((s) => s.artistSlug === slug);

  if (!artist) {
    return (
      <AdminShell title="Artist Not Found">
        <p className="text-white/30 text-sm">
          No artist found with slug &ldquo;{slug}&rdquo;.
        </p>
        <a
          href="/admin/artists"
          className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white mt-4 block transition-colors"
        >
          ← Back to Artists
        </a>
      </AdminShell>
    );
  }

  async function handleCreate(
    data: Omit<ArtistTimelineItem, "id" | "createdAt" | "updatedAt">
  ) {
    try {
      await createTimelineItem(data);
      notify("success", `Timeline item "${data.title}" created.`);
      setShowForm(false);
    } catch {
      // Error toast already shown by store
    }
  }

  function handleUpdate(
    data: Omit<ArtistTimelineItem, "id" | "createdAt" | "updatedAt">
  ) {
    if (!editingItem) return;
    updateTimelineItem(editingItem.id, data);
    notify("success", `"${data.title}" updated.`);
    setEditingItem(null);
  }

  function handleDelete(id: string) {
    const item = allItems.find((i) => i.id === id);
    deleteTimelineItem(id);
    notify("success", `"${item?.title}" deleted.`);
  }

  return (
    <AdminShell title={`Timeline — ${artist.name}`}>
      <div className="max-w-4xl space-y-8">
        {/* Back */}
        <div className="flex items-center justify-between">
          <a
            href={`/admin/artists/${slug}`}
            className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors"
          >
            ← {artist.name}
          </a>
          <p className="text-[10px] font-mono text-white/20">
            {allItems.length} item{allItems.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          {/* View switcher */}
          <div className="flex border border-white/[0.06]">
            {(["timeline", "list", "calendar"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 text-[10px] tracking-[0.1em] uppercase transition-colors ${
                  view === v
                    ? "bg-white/[0.08] text-white"
                    : "text-white/25 hover:text-white/60"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) =>
              setFilterType(e.target.value as TimelineItemType | "all")
            }
            className="bg-transparent border border-white/[0.06] px-3 py-2 text-[10px] tracking-[0.1em] uppercase text-white/40 focus:outline-none"
          >
            <option value="all" className="bg-neutral-900">
              All Types
            </option>
            {ITEM_TYPES.map((t) => (
              <option key={t} value={t} className="bg-neutral-900">
                {TIMELINE_TYPE_META[t].label}
              </option>
            ))}
          </select>

          {/* Lyric engine filter */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterLyric}
              onChange={(e) => setFilterLyric(e.target.checked)}
              className="accent-purple-500"
            />
            <span className="text-[10px] tracking-[0.1em] uppercase text-white/30">
              ✦ Lyric Engine Only
            </span>
          </label>

          {canEdit && !showForm && !editingItem && (
            <button
              onClick={() => setShowForm(true)}
              className="ml-auto border border-white/15 px-5 py-2 text-[10px] tracking-[0.15em] uppercase text-white/50 hover:border-white/30 hover:text-white transition-colors"
            >
              + Add Item
            </button>
          )}
        </div>

        {/* Create form */}
        {showForm && canEdit && (
          <TimelineItemForm
            initial={emptyForm(slug)}
            releases={artistReleases}
            songs={artistSongs}
            onSave={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Edit form */}
        {editingItem && canEdit && (
          <TimelineItemForm
            initial={editingItem}
            releases={artistReleases}
            songs={artistSongs}
            onSave={handleUpdate}
            onCancel={() => setEditingItem(null)}
          />
        )}

        {/* Timeline / List view */}
        {view !== "calendar" && (
          <div className="space-y-2">
            {filteredItems.length === 0 ? (
              <p className="text-[11px] text-white/20 italic">
                No timeline items yet.{" "}
                {canEdit && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="underline underline-offset-2 hover:text-white/40 transition-colors"
                  >
                    Add one →
                  </button>
                )}
              </p>
            ) : (
              filteredItems.map((item) => (
                <TimelineCard
                  key={item.id}
                  item={item}
                  canEdit={canEdit}
                  onEdit={(i) => {
                    setShowForm(false);
                    setEditingItem(i);
                  }}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        )}

        {/* Calendar view */}
        {view === "calendar" && <CalendarView items={filteredItems} />}
      </div>
    </AdminShell>
  );
}
