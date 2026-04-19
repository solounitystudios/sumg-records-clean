"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  FormField,
  FormSection,
  SaveButton,
  DangerButton,
} from "@/components/admin/FormField";
import { useCmsStore } from "@/lib/cms/store";
import { HeroStyle } from "@/lib/types";

export default function EditBrandPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { getBrandBySlug, updateBrand, deleteBrand, notify } = useCmsStore();

  const brand = getBrandBySlug(slug);
  const [form, setForm] = useState<{
    name: string;
    slug: string;
    category: string;
    tagline: string;
    descriptor: string;
    longDescription: string;
    manifesto: string;
    heroCopy: string;
    heroImageUrl: string;
    logoUrl: string;
    accentColor: string;
    heroStyle: HeroStyle;
    isActive: boolean;
    featuredOnHomepage: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!brand) return;
    setForm({
      name: brand.name,
      slug: brand.slug,
      category: brand.category,
      tagline: brand.tagline,
      descriptor: brand.descriptor,
      longDescription: brand.longDescription ?? "",
      manifesto: brand.manifesto ?? "",
      heroCopy: brand.heroCopy ?? "",
      heroImageUrl: brand.heroImageUrl ?? "",
      logoUrl: brand.logoUrl ?? "",
      accentColor: brand.accentColor ?? "",
      heroStyle: brand.heroStyle ?? "editorial",
      isActive: brand.isActive,
      featuredOnHomepage: brand.featuredOnHomepage ?? false,
    });
  }, [brand]);

  if (!brand || !form) {
    return (
      <AdminShell title="Brand Not Found">
        <p className="text-white/30 text-sm">No brand found with slug &ldquo;{slug}&rdquo;.</p>
        <a href="/admin/brands" className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white mt-4 block transition-colors">
          ← Back to Brands
        </a>
      </AdminShell>
    );
  }

  function set(key: string, value: string | boolean) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  function handleSave() {
    if (!brand || !form) return;
    setSaving(true);
    updateBrand(brand.id, {
      name: form!.name,
      slug: form!.slug,
      category: form!.category,
      tagline: form!.tagline,
      descriptor: form!.descriptor,
      longDescription: form!.longDescription || undefined,
      manifesto: form!.manifesto || undefined,
      heroCopy: form!.heroCopy || undefined,
      heroImageUrl: form!.heroImageUrl || undefined,
      logoUrl: form!.logoUrl || undefined,
      accentColor: form!.accentColor || undefined,
      heroStyle: form!.heroStyle,
      isActive: form!.isActive,
      featuredOnHomepage: form!.featuredOnHomepage,
    });
    notify("success", `Brand "${form!.name}" saved.`);
    setSaving(false);
  }

  function handleDelete() {
    if (!brand) return;
    if (confirm(`Delete "${brand.name}"? This cannot be undone.`)) {
      deleteBrand(brand.id);
      notify("success", `Brand "${brand.name}" deleted.`);
      router.push("/admin/brands");
    }
  }

  return (
    <AdminShell title={`Edit — ${brand.name}`}>
      <div className="max-w-2xl space-y-10">
        <div className="flex items-center justify-between">
          <a href="/admin/brands" className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors">
            ← Brands
          </a>
          <a href={`/brands/${brand.slug}`} target="_blank" rel="noopener noreferrer"
            className="text-[10px] font-mono text-white/25 hover:text-white transition-colors">
            ↗ /brands/{brand.slug}
          </a>
        </div>

        <FormSection title="Identity">
          <FormField type="text" label="Brand Name" required value={form.name} onChange={(v) => set("name", v)} />
          <FormField type="text" label="Slug" required mono value={form.slug}
            hint="/brands/[slug]" onChange={(v) => set("slug", v)} />
          <FormField type="text" label="Category" value={form.category} onChange={(v) => set("category", v)} />
          <FormField type="text" label="Tagline" value={form.tagline} onChange={(v) => set("tagline", v)} />
          <FormField type="text" label="Descriptor" value={form.descriptor} onChange={(v) => set("descriptor", v)} />
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
            onChange={(v) => set("longDescription", v)} />
          <FormField type="textarea" label="Manifesto" rows={4} value={form.manifesto}
            onChange={(v) => set("manifesto", v)} />
          <FormField type="textarea" label="Hero Copy" rows={3} value={form.heroCopy}
            onChange={(v) => set("heroCopy", v)} />
        </FormSection>

        <FormSection title="Assets">
          <FormField type="url" label="Hero Image URL" value={form.heroImageUrl}
            placeholder="https://…" mono onChange={(v) => set("heroImageUrl", v)} />
          <FormField type="url" label="Logo URL" value={form.logoUrl}
            placeholder="https://…" mono onChange={(v) => set("logoUrl", v)} />
        </FormSection>

        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <SaveButton onClick={handleSave} saving={saving} />
          <DangerButton onClick={handleDelete} label="Delete Brand" />
        </div>
      </div>
    </AdminShell>
  );
}
