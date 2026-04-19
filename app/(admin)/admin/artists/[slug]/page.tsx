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
import { CMSArtist } from "@/lib/types";

type FormState = {
  name: string;
  slug: string;
  genre: string;
  role: string;
  bio: string;
  longBio: string;
  tier: CMSArtist["tier"];
  status: NonNullable<CMSArtist["status"]>;
  featured: boolean;
  featuredOnHomepage: boolean;
  heroImageUrl: string;
  profileImageUrl: string;
  "socialLinks.instagram": string;
  "socialLinks.spotify": string;
  "socialLinks.soundcloud": string;
};

export default function EditArtistPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { getArtistBySlug, updateArtist, deleteArtist, notify } = useCmsStore();

  const artist = getArtistBySlug(slug);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Seed form from artist
  useEffect(() => {
    if (!artist) return;
    setForm({
      name: artist.name,
      slug: artist.slug,
      genre: artist.genre,
      role: artist.role,
      bio: artist.bio,
      longBio: artist.longBio ?? "",
      tier: artist.tier,
      status: artist.status ?? "active",
      featured: artist.featured,
      featuredOnHomepage: artist.featuredOnHomepage ?? false,
      heroImageUrl: artist.heroImageUrl ?? "",
      profileImageUrl: artist.profileImageUrl ?? "",
      "socialLinks.instagram": artist.socialLinks?.instagram ?? "",
      "socialLinks.spotify": artist.socialLinks?.spotify ?? "",
      "socialLinks.soundcloud": artist.socialLinks?.soundcloud ?? "",
    });
  }, [artist]);

  if (!artist || !form) {
    return (
      <AdminShell title="Artist Not Found">
        <p className="text-white/30 text-sm">No artist found with slug &ldquo;{slug}&rdquo;.</p>
        <a href="/admin/artists" className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white mt-4 block transition-colors">
          ← Back to Artists
        </a>
      </AdminShell>
    );
  }

  function set(key: string, value: string | boolean) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form!.name.trim()) errs.name = "Name is required";
    if (!form!.slug.trim()) errs.slug = "Slug is required";
    if (!form!.bio.trim()) errs.bio = "Short bio is required";
    return errs;
  }

  function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!artist || !form) return;
    setSaving(true);

    updateArtist(artist.id, {
      name: form!.name,
      slug: form!.slug,
      genre: form!.genre,
      role: form!.role,
      bio: form!.bio,
      longBio: form!.longBio || undefined,
      featured: form!.featured,
      featuredOnHomepage: form!.featuredOnHomepage,
      tier: form!.tier,
      status: form!.status,
      heroImageUrl: form!.heroImageUrl || undefined,
      profileImageUrl: form!.profileImageUrl || undefined,
      socialLinks: {
        instagram: form!["socialLinks.instagram"] || undefined,
        spotify: form!["socialLinks.spotify"] || undefined,
        soundcloud: form!["socialLinks.soundcloud"] || undefined,
      },
    });

    notify("success", `Artist "${form!.name}" saved.`);
    setSaving(false);
  }

  function handleDelete() {
    if (!artist) return;
    if (confirm(`Delete "${artist.name}"? This cannot be undone.`)) {
      deleteArtist(artist.id);
      notify("success", `Artist "${artist.name}" deleted.`);
      router.push("/admin/artists");
    }
  }

  return (
    <AdminShell title={`Edit — ${artist.name}`}>
      <div className="max-w-2xl space-y-10">
        {/* Back + status */}
        <div className="flex items-center justify-between">
          <a href="/admin/artists" className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors">
            ← Artists
          </a>
          <StatusBadge status={form.status} />
        </div>

        {/* Public link */}
        <div className="text-[10px] text-white/20">
          Public URL:{" "}
          <a
            href={`/artists/${artist.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-white/40 hover:text-white transition-colors underline underline-offset-2"
          >
            /artists/{artist.slug}
          </a>
        </div>

        {/* Identity */}
        <FormSection title="Identity">
          <FormField type="text" label="Name" required value={form.name} error={errors.name}
            onChange={(v) => set("name", v)} />
          <FormField type="text" label="Slug" required mono value={form.slug} error={errors.slug}
            hint="Used in URLs: /artists/[slug]"
            onChange={(v) => set("slug", v)} />
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
            <FormField type="toggle" label="Featured" value={form.featured} onChange={(v) => set("featured", v)} />
            <FormField type="toggle" label="Featured on Homepage" value={form.featuredOnHomepage} onChange={(v) => set("featuredOnHomepage", v)} />
          </div>
        </FormSection>

        {/* Bio */}
        <FormSection title="Biography">
          <FormField type="textarea" label="Short Bio" required rows={3} value={form.bio} error={errors.bio}
            placeholder="One-paragraph description."
            onChange={(v) => set("bio", v)} />
          <FormField type="textarea" label="Full Bio" rows={6} value={form.longBio}
            placeholder="Extended biography shown on artist detail page."
            onChange={(v) => set("longBio", v)} />
        </FormSection>

        {/* Images */}
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

        {/* Actions */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <SaveButton onClick={handleSave} saving={saving} />
          <DangerButton onClick={handleDelete} label="Delete Artist" />
        </div>
      </div>
    </AdminShell>
  );
}
