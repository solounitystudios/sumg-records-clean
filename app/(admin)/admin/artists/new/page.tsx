"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { FormField, FormSection, SaveButton } from "@/components/admin/FormField";
import { useCmsStore } from "@/lib/cms/store";
import { CMSArtist } from "@/lib/types";

const emptyForm = {
  name: "",
  slug: "",
  genre: "",
  role: "Artist",
  bio: "",
  longBio: "",
  tier: "secondary" as CMSArtist["tier"],
  status: "active" as NonNullable<CMSArtist["status"]>,
  featured: false,
  featuredOnHomepage: false,
  heroImageUrl: "",
  profileImageUrl: "",
  "socialLinks.instagram": "",
  "socialLinks.spotify": "",
  "socialLinks.soundcloud": "",
};

export default function NewArtistPage() {
  const router = useRouter();
  const { createArtist, notify } = useCmsStore();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.slug.trim()) errs.slug = "Slug is required";
    if (!form.bio.trim()) errs.bio = "Short bio is required";
    return errs;
  }

  async function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);

    try {
      await createArtist({
        slug: form.slug,
        name: form.name,
        role: form.role,
        genre: form.genre,
        bio: form.bio,
        longBio: form.longBio || undefined,
        featured: form.featured,
        featuredOnHomepage: form.featuredOnHomepage,
        tier: form.tier,
        status: form.status,
        heroImageUrl: form.heroImageUrl || undefined,
        profileImageUrl: form.profileImageUrl || undefined,
        socialLinks: {
          instagram: form["socialLinks.instagram"] || undefined,
          spotify: form["socialLinks.spotify"] || undefined,
          soundcloud: form["socialLinks.soundcloud"] || undefined,
        },
      });

      notify("success", `Artist "${form.name}" created.`);
      router.push(`/admin/artists/${form.slug}`);
    } catch {
      // Error toast already shown by store
      setSaving(false);
    }
  }

  return (
    <AdminShell title="New Artist">
      <div className="max-w-2xl space-y-10">
        {/* Back */}
        <a href="/admin/artists" className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors">
          ← Artists
        </a>

        {/* Identity */}
        <FormSection title="Identity">
          <FormField type="text" label="Name" required value={form.name} error={errors.name}
            onChange={(v) => { set("name", v); if (!form.slug) set("slug", autoSlug(v)); }} />
          <FormField type="text" label="Slug" required mono value={form.slug} error={errors.slug}
            hint="Used in URLs: /artists/[slug]"
            onChange={(v) => set("slug", autoSlug(v))} />
          <FormField type="text" label="Genre / Style" value={form.genre} onChange={(v) => set("genre", v)} />
          <FormField type="text" label="Role" value={form.role} onChange={(v) => set("role", v)} />
        </FormSection>

        {/* Status */}
        <FormSection title="Status & Visibility">
          <FormField type="select" label="Status" value={form.status}
            onChange={(v) => set("status", v)}
            options={[
              { value: "active", label: "Active" },
              { value: "draft", label: "Draft" },
              { value: "archived", label: "Archived" },
            ]} />
          <FormField type="select" label="Tier" value={form.tier}
            onChange={(v) => set("tier", v as CMSArtist["tier"])}
            options={[
              { value: "primary", label: "Primary" },
              { value: "secondary", label: "Secondary" },
            ]} />
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <FormField type="toggle" label="Featured" value={form.featured} onChange={(v) => set("featured", v)} />
            </div>
            <div className="flex items-center gap-3">
              <FormField type="toggle" label="Featured on Homepage" value={form.featuredOnHomepage} onChange={(v) => set("featuredOnHomepage", v)} />
            </div>
          </div>
        </FormSection>

        {/* Bio */}
        <FormSection title="Biography">
          <FormField type="textarea" label="Short Bio" required rows={3} value={form.bio} error={errors.bio}
            placeholder="One-paragraph description shown on artist cards and listings."
            onChange={(v) => set("bio", v)} />
          <FormField type="textarea" label="Full Bio" rows={6} value={form.longBio}
            placeholder="Extended biography shown on the artist detail page."
            onChange={(v) => set("longBio", v)} />
        </FormSection>

        {/* Media */}
        <FormSection title="Images">
          <FormField type="url" label="Hero Image URL" value={form.heroImageUrl}
            placeholder="https://…" mono onChange={(v) => set("heroImageUrl", v)} />
          <FormField type="url" label="Profile Image URL" value={form.profileImageUrl}
            placeholder="https://…" mono onChange={(v) => set("profileImageUrl", v)} />
        </FormSection>

        {/* Social */}
        <FormSection title="Social Links">
          <FormField type="url" label="Instagram" value={form["socialLinks.instagram"]}
            placeholder="https://instagram.com/…" mono onChange={(v) => set("socialLinks.instagram", v)} />
          <FormField type="url" label="Spotify" value={form["socialLinks.spotify"]}
            placeholder="https://open.spotify.com/…" mono onChange={(v) => set("socialLinks.spotify", v)} />
          <FormField type="url" label="SoundCloud" value={form["socialLinks.soundcloud"]}
            placeholder="https://soundcloud.com/…" mono onChange={(v) => set("socialLinks.soundcloud", v)} />
        </FormSection>

        {/* Save */}
        <div className="pt-4 border-t border-white/5">
          <SaveButton onClick={handleSave} saving={saving} label="Create Artist" />
        </div>
      </div>
    </AdminShell>
  );
}
