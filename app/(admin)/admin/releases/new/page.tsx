"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { FormField, FormSection, SaveButton } from "@/components/admin/FormField";
import { TracklistEditor } from "@/components/admin/TracklistEditor";
import { useCmsStore } from "@/lib/cms/store";
import { CMSRelease, CMSSong, ReleaseStatus } from "@/lib/types";

export default function NewReleasePage() {
  const router = useRouter();
  const { createRelease, notify } = useCmsStore();

  const [form, setForm] = useState({
    title: "",
    slug: "",
    artistSlug: "",
    artistName: "",
    type: "Single" as CMSRelease["type"],
    genre: "",
    releaseDate: "",
    publishAt: "",
    status: "draft" as ReleaseStatus,
    isVisible: false,
    featuredOnHomepage: false,
    description: "",
    coverArtUrl: "",
  });
  const [tracklist, setTracklist] = useState<CMSSong[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function autoSlug(title: string) {
    return title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.slug.trim()) errs.slug = "Slug is required";
    if (!form.artistName.trim()) errs.artistName = "Artist name is required";
    return errs;
  }

  async function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);

    try {
      await createRelease({
        slug: form.slug,
        title: form.title,
        artistSlug: form.artistSlug,
        artistName: form.artistName,
        type: form.type,
        genre: form.genre,
        releaseDate: form.releaseDate,
        publishAt: form.publishAt || undefined,
        status: form.status,
        isVisible: form.isVisible,
        featuredOnHomepage: form.featuredOnHomepage,
        description: form.description,
        coverArtUrl: form.coverArtUrl || undefined,
        tracklist: tracklist.length ? tracklist : undefined,
      });

      notify("success", `Release "${form.title}" created.`);
      router.push(`/admin/releases/${form.slug}`);
    } catch {
      // Error toast already shown by store
      setSaving(false);
    }
  }

  return (
    <AdminShell title="New Release">
      <div className="max-w-2xl space-y-10">
        <a href="/admin/releases" className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors">
          ← Releases
        </a>

        {/* Release info */}
        <FormSection title="Release Info">
          <FormField type="text" label="Title" required value={form.title} error={errors.title}
            onChange={(v) => { set("title", v); if (!form.slug) set("slug", autoSlug(v)); }} />
          <FormField type="text" label="Slug" required mono value={form.slug} error={errors.slug}
            hint="/releases/[slug]" onChange={(v) => set("slug", autoSlug(v))} />
          <FormField type="text" label="Artist Name" required value={form.artistName} error={errors.artistName}
            onChange={(v) => set("artistName", v)} />
          <FormField type="text" label="Artist Slug" mono value={form.artistSlug}
            hint="Links to /artists/[slug]"
            onChange={(v) => set("artistSlug", v)} />
          <div className="grid grid-cols-2 gap-5">
            <FormField type="select" label="Type" value={form.type}
              onChange={(v) => set("type", v as CMSRelease["type"])}
              options={[
                { value: "Single", label: "Single" },
                { value: "EP", label: "EP" },
                { value: "Album", label: "Album" },
                { value: "Mixtape", label: "Mixtape" },
              ]} />
            <FormField type="text" label="Genre" value={form.genre} onChange={(v) => set("genre", v)} />
          </div>
          <FormField type="textarea" label="Description" rows={3} value={form.description}
            onChange={(v) => set("description", v)} />
        </FormSection>

        {/* Publish settings */}
        <FormSection title="Publish Settings">
          <FormField type="select" label="Status" value={form.status}
            onChange={(v) => set("status", v as ReleaseStatus)}
            options={[
              { value: "draft", label: "Draft — not visible" },
              { value: "scheduled", label: "Scheduled — auto-publish at date" },
              { value: "published", label: "Published — live now" },
              { value: "archived", label: "Archived" },
            ]} />
          <div className="grid grid-cols-2 gap-5">
            <FormField type="date" label="Release Date" value={form.releaseDate}
              onChange={(v) => set("releaseDate", v)} />
            <FormField type="datetime-local" label="Publish At (optional)" value={form.publishAt}
              hint="Leave blank to publish immediately when status = published"
              onChange={(v) => set("publishAt", v)} />
          </div>
          <div className="flex items-center gap-8">
            <FormField type="toggle" label="Visible" value={form.isVisible} onChange={(v) => set("isVisible", v)} />
            <FormField type="toggle" label="Featured on Homepage" value={form.featuredOnHomepage} onChange={(v) => set("featuredOnHomepage", v)} />
          </div>
        </FormSection>

        {/* Cover art */}
        <FormSection title="Cover Art">
          <FormField type="url" label="Cover Art URL" value={form.coverArtUrl}
            placeholder="https://…" mono onChange={(v) => set("coverArtUrl", v)} />
        </FormSection>

        {/* Tracklist */}
        <FormSection title="Tracklist">
          <TracklistEditor
            releaseSlug={form.slug || "new"}
            artistSlug={form.artistSlug}
            tracks={tracklist}
            onChange={setTracklist}
          />
        </FormSection>

        {/* DSP links section available in the edit page after creation */}

        <div className="pt-4 border-t border-white/5">
          <SaveButton onClick={handleSave} saving={saving} label="Create Release" />
        </div>
      </div>
    </AdminShell>
  );
}
