"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { FormField, FormSection, SaveButton } from "@/components/admin/FormField";
import { useCmsStore } from "@/lib/cms/store";
import { ReleaseStatus } from "@/lib/types";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewSongPage() {
  const router = useRouter();
  const { createSong, notify, artists, releases, producers } = useCmsStore();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [artistSlug, setArtistSlug] = useState("");
  const [releaseSlug, setReleaseSlug] = useState("");
  const [genre, setGenre] = useState("");
  const [duration, setDuration] = useState("");
  const [status, setStatus] = useState<ReleaseStatus>("draft");
  const [saving, setSaving] = useState(false);

  function handleTitleChange(v: string) {
    setTitle(v);
    if (!slugManual) setSlug(slugify(v));
  }

  function handleSlugChange(v: string) {
    setSlug(v);
    setSlugManual(true);
  }

  function handleSave() {
    if (!title.trim()) { notify("error", "Title is required."); return; }
    if (!slug.trim()) { notify("error", "Slug is required."); return; }
    if (!artistSlug) { notify("error", "Artist is required."); return; }
    setSaving(true);
    const artist = artists.find((a) => a.slug === artistSlug);
    const release = releases.find((r) => r.slug === releaseSlug);
    const producerSlugs: string[] = [];
    createSong({
      slug: slug.trim(),
      title: title.trim(),
      artistSlug,
      artistName: artist?.name ?? artistSlug,
      releaseSlug: releaseSlug || undefined,
      releaseName: release?.title ?? undefined,
      producerSlugs: producerSlugs.length ? producerSlugs : undefined,
      genre: genre || undefined,
      duration: duration || undefined,
      status,
      isVisible: status === "published",
    });
    notify("success", `Song "${title}" created.`);
    setSaving(false);
    router.push(`/admin/songs/${slug.trim()}`);
  }

  return (
    <AdminShell title="New Song">
      <div className="max-w-xl space-y-10">
        <a
          href="/admin/songs"
          className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors"
        >
          ← Songs
        </a>

        <FormSection title="Song Info">
          <FormField
            type="text"
            label="Title"
            required
            value={title}
            onChange={handleTitleChange}
          />
          <FormField
            type="text"
            label="Slug"
            required
            mono
            value={slug}
            hint="/songs/[slug]"
            onChange={handleSlugChange}
          />

          {/* Artist */}
          <div>
            <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-2">
              Artist <span className="text-red-400">*</span>
            </p>
            <select
              value={artistSlug}
              onChange={(e) => setArtistSlug(e.target.value)}
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

          {/* Release (optional) */}
          <div>
            <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-2">
              Release <span className="text-white/15">(optional)</span>
            </p>
            <select
              value={releaseSlug}
              onChange={(e) => setReleaseSlug(e.target.value)}
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

          <div className="grid grid-cols-2 gap-5">
            <FormField
              type="text"
              label="Genre"
              value={genre}
              onChange={setGenre}
            />
            <FormField
              type="text"
              label="Duration"
              value={duration}
              placeholder="e.g. 3:24"
              mono
              onChange={setDuration}
            />
          </div>
        </FormSection>

        <FormSection title="Publish">
          <FormField
            type="select"
            label="Status"
            value={status}
            onChange={(v) => setStatus(v as ReleaseStatus)}
            options={[
              { value: "draft", label: "Draft — not visible" },
              { value: "published", label: "Published — live now" },
              { value: "archived", label: "Archived" },
            ]}
          />
        </FormSection>

        <div className="pt-4 border-t border-white/5">
          <SaveButton onClick={handleSave} saving={saving} label="Create Song" />
        </div>
      </div>
    </AdminShell>
  );
}
