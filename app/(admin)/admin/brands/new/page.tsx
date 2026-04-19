"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { FormField, FormSection, SaveButton } from "@/components/admin/FormField";
import { useCmsStore } from "@/lib/cms/store";
import { HeroStyle } from "@/lib/types";

export default function NewBrandPage() {
  const router = useRouter();
  const { createBrand, notify } = useCmsStore();

  const [form, setForm] = useState({
    name: "",
    slug: "",
    category: "",
    tagline: "",
    descriptor: "",
    longDescription: "",
    manifesto: "",
    heroCopy: "",
    heroImageUrl: "",
    logoUrl: "",
    accentColor: "",
    heroStyle: "editorial" as HeroStyle,
    isActive: true,
    featuredOnHomepage: false,
  });
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
    return errs;
  }

  function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);

    createBrand({
      slug: form.slug,
      name: form.name,
      category: form.category,
      tagline: form.tagline,
      descriptor: form.descriptor,
      longDescription: form.longDescription || undefined,
      manifesto: form.manifesto || undefined,
      heroCopy: form.heroCopy || undefined,
      heroImageUrl: form.heroImageUrl || undefined,
      logoUrl: form.logoUrl || undefined,
      accentColor: form.accentColor || undefined,
      heroStyle: form.heroStyle,
      isActive: form.isActive,
      featuredOnHomepage: form.featuredOnHomepage,
    });

    notify("success", `Brand "${form.name}" created.`);
    router.push(`/admin/brands/${form.slug}`);
  }

  return (
    <AdminShell title="New Brand">
      <div className="max-w-2xl space-y-10">
        <a href="/admin/brands" className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors">
          ← Brands
        </a>

        <FormSection title="Identity">
          <FormField type="text" label="Brand Name" required value={form.name} error={errors.name}
            onChange={(v) => { set("name", v); if (!form.slug) set("slug", autoSlug(v)); }} />
          <FormField type="text" label="Slug" required mono value={form.slug} error={errors.slug}
            hint="/brands/[slug]" onChange={(v) => set("slug", autoSlug(v))} />
          <FormField type="text" label="Category" value={form.category}
            placeholder="e.g. Fashion / Luxury" onChange={(v) => set("category", v)} />
          <FormField type="text" label="Tagline" value={form.tagline}
            placeholder="Short tagline shown on brand cards."
            onChange={(v) => set("tagline", v)} />
          <FormField type="text" label="Descriptor" value={form.descriptor}
            placeholder="1-2 sentence description."
            onChange={(v) => set("descriptor", v)} />
        </FormSection>

        <FormSection title="Status & Theme">
          <div className="flex items-center gap-8">
            <FormField type="toggle" label="Active" value={form.isActive} onChange={(v) => set("isActive", v)} />
            <FormField type="toggle" label="Featured on Homepage" value={form.featuredOnHomepage} onChange={(v) => set("featuredOnHomepage", v)} />
          </div>
          <FormField type="select" label="Hero Style" value={form.heroStyle}
            onChange={(v) => set("heroStyle", v as HeroStyle)}
            options={[
              { value: "editorial", label: "Editorial (Woronoff)" },
              { value: "minimal", label: "Minimal (Unity Standard)" },
              { value: "mystic", label: "Mystic (Moon Spell)" },
              { value: "industrial", label: "Industrial (Concrete Borough)" },
              { value: "coastal", label: "Coastal (Salt Current)" },
            ]} />
          <FormField type="text" label="Accent Color Hex" value={form.accentColor}
            placeholder="#a1a1aa" mono onChange={(v) => set("accentColor", v)} />
        </FormSection>

        <FormSection title="Content">
          <FormField type="textarea" label="Long Description" rows={4} value={form.longDescription}
            placeholder="Extended description shown on the brand detail page."
            onChange={(v) => set("longDescription", v)} />
          <FormField type="textarea" label="Manifesto" rows={4} value={form.manifesto}
            placeholder="Brand philosophy / mission statement."
            onChange={(v) => set("manifesto", v)} />
          <FormField type="textarea" label="Hero Copy" rows={3} value={form.heroCopy}
            placeholder="Text shown in the brand hero section."
            onChange={(v) => set("heroCopy", v)} />
        </FormSection>

        <FormSection title="Assets">
          <FormField type="url" label="Hero Image URL" value={form.heroImageUrl}
            placeholder="https://…" mono onChange={(v) => set("heroImageUrl", v)} />
          <FormField type="url" label="Logo URL" value={form.logoUrl}
            placeholder="https://…" mono onChange={(v) => set("logoUrl", v)} />
        </FormSection>

        <div className="pt-4 border-t border-white/5">
          <SaveButton onClick={handleSave} saving={saving} label="Create Brand" />
        </div>
      </div>
    </AdminShell>
  );
}
