"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { FormField, FormSection, SaveButton } from "@/components/admin/FormField";
import { useCmsStore } from "@/lib/cms/store";

export default function NewProducerPage() {
  const router = useRouter();
  const { createProducer, notify } = useCmsStore();

  const [form, setForm] = useState({
    name: "",
    slug: "",
    specialty: "",
    credits: "",
    signature: "",
    bio: "",
    heroImageUrl: "",
    profileImageUrl: "",
    "socialLinks.instagram": "",
    "socialLinks.spotify": "",
    "socialLinks.soundcloud": "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(key: string, value: string) {
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
    return errs;
  }

  function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);

    createProducer({
      slug: form.slug,
      name: form.name,
      specialty: form.specialty,
      credits: form.credits,
      signature: form.signature,
      bio: form.bio || undefined,
      heroImageUrl: form.heroImageUrl || undefined,
      profileImageUrl: form.profileImageUrl || undefined,
      socialLinks: {
        instagram: form["socialLinks.instagram"] || undefined,
        spotify: form["socialLinks.spotify"] || undefined,
        soundcloud: form["socialLinks.soundcloud"] || undefined,
      },
    });

    notify("success", `Producer "${form.name}" created.`);
    router.push(`/admin/producers/${form.slug}`);
  }

  return (
    <AdminShell title="New Producer">
      <div className="max-w-2xl space-y-10">
        <a href="/admin/producers" className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors">
          ← Producers
        </a>

        <FormSection title="Identity">
          <FormField type="text" label="Name" required value={form.name} error={errors.name}
            onChange={(v) => { set("name", v); if (!form.slug) set("slug", autoSlug(v)); }} />
          <FormField type="text" label="Slug" required mono value={form.slug} error={errors.slug}
            hint="Used in URLs: /producers/[slug]"
            onChange={(v) => set("slug", autoSlug(v))} />
          <FormField type="text" label="Specialty" value={form.specialty}
            placeholder="e.g. Dark Electronic / Cinematic"
            onChange={(v) => set("specialty", v)} />
          <FormField type="text" label="Credits" value={form.credits}
            placeholder="e.g. Zyson, Marrick, Turkz"
            onChange={(v) => set("credits", v)} />
          <FormField type="text" label="Signature Sound" value={form.signature}
            placeholder="e.g. Layered tension, percussive architecture"
            onChange={(v) => set("signature", v)} />
        </FormSection>

        <FormSection title="Biography">
          <FormField type="textarea" label="Bio" rows={5} value={form.bio}
            placeholder="Producer bio shown on detail page."
            onChange={(v) => set("bio", v)} />
        </FormSection>

        <FormSection title="Images">
          <FormField type="url" label="Hero Image URL" value={form.heroImageUrl}
            placeholder="https://…" mono onChange={(v) => set("heroImageUrl", v)} />
          <FormField type="url" label="Profile Image URL" value={form.profileImageUrl}
            placeholder="https://…" mono onChange={(v) => set("profileImageUrl", v)} />
        </FormSection>

        <FormSection title="Social Links">
          <FormField type="url" label="Instagram" value={form["socialLinks.instagram"]}
            placeholder="https://instagram.com/…" mono onChange={(v) => set("socialLinks.instagram", v)} />
          <FormField type="url" label="Spotify" value={form["socialLinks.spotify"]}
            placeholder="https://open.spotify.com/…" mono onChange={(v) => set("socialLinks.spotify", v)} />
          <FormField type="url" label="SoundCloud" value={form["socialLinks.soundcloud"]}
            placeholder="https://soundcloud.com/…" mono onChange={(v) => set("socialLinks.soundcloud", v)} />
        </FormSection>

        <div className="pt-4 border-t border-white/5">
          <SaveButton onClick={handleSave} saving={saving} label="Create Producer" />
        </div>
      </div>
    </AdminShell>
  );
}
