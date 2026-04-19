"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  FormField,
  FormSection,
  SaveButton,
  DangerButton,
  StatusBadge,
} from "@/components/admin/FormField";
import { useCmsStore } from "@/lib/cms/store";
import { CMSSong, ReleaseStatus } from "@/lib/types";

// ─── Producer multi-picker ───────────────────────────────────────────────────

function ProducerPicker({
  attached,
  allProducers,
  onToggle,
}: {
  attached: string[];
  allProducers: { id: string; slug: string; name: string }[];
  onToggle: (slug: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-3">
        Producers{" "}
        <span className="text-white/15">(toggle to add/remove)</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {allProducers.map((p) => {
          const isActive = attached.includes(p.slug);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p.slug)}
              className={`border px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase transition-all duration-150 ${
                isActive
                  ? "border-white/30 bg-white/[0.06] text-white"
                  : "border-white/[0.06] text-white/30 hover:border-white/15 hover:text-white/60"
              }`}
            >
              {isActive && <span className="mr-1">✓</span>}
              {p.name}
            </button>
          );
        })}
        {allProducers.length === 0 && (
          <p className="text-[10px] text-white/20 italic">
            No producers in library.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditSongPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const {
    getSongBySlug,
    updateSong,
    deleteSong,
    notify,
    artists,
    releases,
    producers,
    getAssetsForEntity,
  } = useCmsStore();

  const song = getSongBySlug(slug);

  const [form, setForm] = useState<{
    title: string;
    slug: string;
    artistSlug: string;
    releaseSlug: string;
    genre: string;
    duration: string;
    audioUrl: string;
    lyrics: string;
    trackNumber: string;
    isExplicit: boolean;
    status: ReleaseStatus;
    isVisible: boolean;
    featuredOnHomepage: boolean;
    publishAt: string;
  } | null>(null);
  const [producerSlugs, setProducerSlugs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!song) return;
    setForm({
      title: song.title,
      slug: song.slug,
      artistSlug: song.artistSlug,
      releaseSlug: song.releaseSlug ?? "",
      genre: song.genre ?? "",
      duration: song.duration ?? "",
      audioUrl: song.audioUrl ?? "",
      lyrics: song.lyrics ?? "",
      trackNumber: song.trackNumber ? String(song.trackNumber) : "",
      isExplicit: song.isExplicit ?? false,
      status: song.status,
      isVisible: song.isVisible,
      featuredOnHomepage: song.featuredOnHomepage ?? false,
      publishAt: song.publishAt ?? "",
    });
    setProducerSlugs(song.producerSlugs ?? []);
  }, [song]);

  if (!song || !form) {
    return (
      <AdminShell title="Song Not Found">
        <p className="text-white/30 text-sm">
          No song found with slug &ldquo;{slug}&rdquo;.
        </p>
        <a
          href="/admin/songs"
          className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white mt-4 block transition-colors"
        >
          ← Back to Songs
        </a>
      </AdminShell>
    );
  }

  const attachedAudio = getAssetsForEntity("song", song.id).filter(
    (a) => a.type === "audio"
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function set(key: string, value: any) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function handleSave() {
    if (!song || !form) return;
    setSaving(true);
    const artist = artists.find((a) => a.slug === form.artistSlug);
    const release = releases.find((r) => r.slug === form.releaseSlug);
    updateSong(song.id, {
      title: form.title,
      slug: form.slug,
      artistSlug: form.artistSlug,
      artistName: artist?.name ?? song.artistName,
      releaseSlug: form.releaseSlug || undefined,
      releaseName: release?.title ?? song.releaseName,
      producerSlugs: producerSlugs.length ? producerSlugs : undefined,
      genre: form.genre || undefined,
      duration: form.duration || undefined,
      audioUrl: form.audioUrl || undefined,
      lyrics: form.lyrics || undefined,
      trackNumber: form.trackNumber ? parseInt(form.trackNumber) : undefined,
      isExplicit: form.isExplicit,
      status: form.status,
      isVisible: form.isVisible,
      publishAt: form.publishAt || undefined,
      featuredOnHomepage: form.featuredOnHomepage,
    });
    notify("success", `"${form.title}" saved.`);
    setSaving(false);
  }

  function handleDelete() {
    if (!song) return;
    if (confirm(`Delete "${song.title}"? This cannot be undone.`)) {
      deleteSong(song.id);
      notify("success", `"${song.title}" deleted.`);
      router.push("/admin/songs");
    }
  }

  function toggleProducer(s: string) {
    setProducerSlugs((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  const isLive = song.status === "published" && song.isVisible;

  return (
    <AdminShell title={`Edit — ${song.title}`}>
      <div className="max-w-xl space-y-10">
        {/* Back + status */}
        <div className="flex items-center justify-between">
          <a
            href="/admin/songs"
            className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors"
          >
            ← Songs
          </a>
          <div className="flex items-center gap-3">
            <StatusBadge status={song.status} />
            {isLive && (
              <a
                href={`/songs/${song.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono text-white/25 hover:text-white transition-colors"
              >
                ↗ View Live
              </a>
            )}
          </div>
        </div>

        {/* Publish status bar */}
        <div
          className={`border px-5 py-3 text-[11px] ${
            isLive
              ? "border-green-800/40 bg-green-950/20 text-green-300/70"
              : "border-white/5 text-white/20"
          }`}
        >
          {isLive
            ? "✓ This song is live. It appears on the artist page and release tracklist."
            : "◯ This song is not public. Set status to Published to make it visible."}
        </div>

        {/* Song info */}
        <FormSection title="Song Info">
          <FormField
            type="text"
            label="Title"
            required
            value={form.title}
            onChange={(v) => set("title", v)}
          />
          <FormField
            type="text"
            label="Slug"
            required
            mono
            value={form.slug}
            hint="/songs/[slug]"
            onChange={(v) => set("slug", v)}
          />

          {/* Artist */}
          <div>
            <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-2">Artist</p>
            <select
              value={form.artistSlug}
              onChange={(e) => set("artistSlug", e.target.value)}
              className="w-full bg-transparent border border-white/10 px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-colors"
            >
              <option value="" className="bg-neutral-900">— Select artist —</option>
              {artists.map((a) => (
                <option key={a.id} value={a.slug} className="bg-neutral-900">
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Release */}
          <div>
            <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-2">
              Release <span className="text-white/15">(optional)</span>
            </p>
            <select
              value={form.releaseSlug}
              onChange={(e) => set("releaseSlug", e.target.value)}
              className="w-full bg-transparent border border-white/10 px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-colors"
            >
              <option value="" className="bg-neutral-900">— Standalone single —</option>
              {releases.map((r) => (
                <option key={r.id} value={r.slug} className="bg-neutral-900">
                  {r.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField
              type="text"
              label="Genre"
              value={form.genre}
              onChange={(v) => set("genre", v)}
            />
            <FormField
              type="text"
              label="Duration"
              value={form.duration}
              placeholder="e.g. 3:24"
              mono
              onChange={(v) => set("duration", v)}
            />
            <FormField
              type="number"
              label="Track #"
              value={form.trackNumber}
              onChange={(v) => set("trackNumber", v)}
            />
          </div>

          <FormField
            type="url"
            label="Audio URL"
            value={form.audioUrl}
            placeholder="https://…"
            mono
            onChange={(v) => set("audioUrl", v)}
          />

          {/* Linked media assets */}
          {attachedAudio.length > 0 && (
            <div className="border border-white/5 p-3 space-y-1">
              <p className="text-[10px] tracking-[0.15em] uppercase text-white/20 mb-2">
                Linked Audio Assets
              </p>
              {attachedAudio.map((a) => (
                <p key={a.id} className="text-xs text-white/40 truncate font-mono">
                  {a.filename}
                </p>
              ))}
            </div>
          )}
        </FormSection>

        {/* Relations */}
        <FormSection title="Relations">
          <ProducerPicker
            attached={producerSlugs}
            allProducers={producers}
            onToggle={toggleProducer}
          />
        </FormSection>

        {/* Lyrics */}
        <FormSection title="Lyrics">
          <FormField
            type="textarea"
            label="Lyrics"
            rows={10}
            value={form.lyrics}
            placeholder="Paste or type lyrics here…"
            onChange={(v) => set("lyrics", v)}
          />
        </FormSection>

        {/* Publish */}
        <FormSection title="Publish Settings">
          <FormField
            type="select"
            label="Status"
            value={form.status}
            onChange={(v) => set("status", v as ReleaseStatus)}
            options={[
              { value: "draft", label: "Draft — not visible" },
              { value: "scheduled", label: "Scheduled" },
              { value: "published", label: "Published — live now" },
              { value: "archived", label: "Archived" },
            ]}
          />
          <div className="flex items-center gap-8">
            <FormField
              type="toggle"
              label="Visible"
              value={form.isVisible}
              onChange={(v) => set("isVisible", v)}
            />
            <FormField
              type="toggle"
              label="Explicit"
              value={form.isExplicit}
              onChange={(v) => set("isExplicit", v)}
            />
            <FormField
              type="toggle"
              label="Featured on Homepage"
              value={form.featuredOnHomepage}
              onChange={(v) => set("featuredOnHomepage", v)}
            />
          </div>
          <FormField
            type="datetime-local"
            label="Publish At"
            value={form.publishAt}
            hint="Required when status is Scheduled"
            onChange={(v) => set("publishAt", v)}
          />
        </FormSection>

        {/* Actions */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <SaveButton onClick={handleSave} saving={saving} />
          <DangerButton onClick={handleDelete} label="Delete Song" />
        </div>
      </div>
    </AdminShell>
  );
}
