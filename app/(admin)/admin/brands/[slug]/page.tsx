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
import { EntityMediaPanel } from "@/components/admin/EntityMediaPanel";
import { useCmsStore } from "@/lib/cms/store";
import { HeroStyle, CMSBrand } from "@/lib/types";
import { useRole } from "@/lib/auth/use-role";

// ─── Featured releases picker ────────────────────────────────────────────────

function FeaturedReleasesPicker({
  attached,
  releases,
  onToggle,
}: {
  attached: string[];
  releases: { id: string; slug: string; title: string; artistName: string }[];
  onToggle: (slug: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-3">
        Featured Releases <span className="text-white/15">(toggle to feature / unfeature)</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {releases.map((r) => {
          const isActive = attached.includes(r.slug);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onToggle(r.slug)}
              className={`border px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase transition-all duration-150 ${
                isActive
                  ? "border-white/30 bg-white/[0.06] text-white"
                  : "border-white/[0.06] text-white/30 hover:border-white/15 hover:text-white/60"
              }`}
            >
              {isActive && <span className="mr-1">✓</span>}
              {r.title}
              <span className="ml-1 text-white/25 normal-case font-normal">
                ({r.artistName})
              </span>
            </button>
          );
        })}
        {releases.length === 0 && (
          <p className="text-[10px] text-white/20 italic">No releases in library.</p>
        )}
      </div>
      {attached.length > 0 && (
        <p className="text-[10px] text-white/20 mt-2">
          {attached.length} release{attached.length !== 1 ? "s" : ""} featured
        </p>
      )}
    </div>
  );
}

// ─── Featured songs picker ───────────────────────────────────────────────────

function FeaturedSongsPicker({
  attached,
  songs,
  onToggle,
}: {
  attached: string[];
  songs: { id: string; slug: string; title: string; artistName: string }[];
  onToggle: (slug: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-3">
        Featured Songs <span className="text-white/15">(toggle to feature / unfeature)</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {songs.map((s) => {
          const isActive = attached.includes(s.slug);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onToggle(s.slug)}
              className={`border px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase transition-all duration-150 ${
                isActive
                  ? "border-white/30 bg-white/[0.06] text-white"
                  : "border-white/[0.06] text-white/30 hover:border-white/15 hover:text-white/60"
              }`}
            >
              {isActive && <span className="mr-1">✓</span>}
              {s.title}
              <span className="ml-1 text-white/25 normal-case font-normal">
                — {s.artistName}
              </span>
            </button>
          );
        })}
        {songs.length === 0 && (
          <p className="text-[10px] text-white/20 italic">No songs in library.</p>
        )}
      </div>
      {attached.length > 0 && (
        <p className="text-[10px] text-white/20 mt-2">
          {attached.length} song{attached.length !== 1 ? "s" : ""} featured
        </p>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EditBrandPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { getBrandBySlug, updateBrand, deleteBrand, notify, releases, songs } = useCmsStore();
  const role = useRole();

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
    heroHeadline: string;
    heroSubcopy: string;
    heroImageUrl: string;
    logoUrl: string;
    accentColor: string;
    heroStyle: HeroStyle;
    campaignStatus: CMSBrand["campaignStatus"];
    collectionName: string;
    isActive: boolean;
    featuredOnHomepage: boolean;
  } | null>(null);
  const [featuredReleaseSlugs, setFeaturedReleaseSlugs] = useState<string[]>([]);
  const [featuredSongSlugs, setFeaturedSongSlugs] = useState<string[]>([]);
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
      heroHeadline: brand.heroHeadline ?? "",
      heroSubcopy: brand.heroSubcopy ?? "",
      heroImageUrl: brand.heroImageUrl ?? "",
      logoUrl: brand.logoUrl ?? "",
      accentColor: brand.accentColor ?? "",
      heroStyle: brand.heroStyle ?? "editorial",
      campaignStatus: brand.campaignStatus ?? "inactive",
      collectionName: brand.collectionName ?? "",
      isActive: brand.isActive,
      featuredOnHomepage: brand.featuredOnHomepage ?? false,
    });
    setFeaturedReleaseSlugs(brand.featuredReleaseSlugs ?? []);
    setFeaturedSongSlugs(brand.featuredSongSlugs ?? []);
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function set(key: string, value: any) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  function handleSave() {
    if (!brand || !form) return;
    setSaving(true);
    updateBrand(brand.id, {
      name: form.name,
      slug: form.slug,
      category: form.category,
      tagline: form.tagline,
      descriptor: form.descriptor,
      longDescription: form.longDescription || undefined,
      manifesto: form.manifesto || undefined,
      heroCopy: form.heroCopy || undefined,
      heroHeadline: form.heroHeadline || undefined,
      heroSubcopy: form.heroSubcopy || undefined,
      heroImageUrl: form.heroImageUrl || undefined,
      logoUrl: form.logoUrl || undefined,
      accentColor: form.accentColor || undefined,
      heroStyle: form.heroStyle,
      campaignStatus: form.campaignStatus,
      collectionName: form.collectionName || undefined,
      featuredReleaseSlugs: featuredReleaseSlugs.length ? featuredReleaseSlugs : undefined,
      featuredSongSlugs: featuredSongSlugs.length ? featuredSongSlugs : undefined,
      isActive: form.isActive,
      featuredOnHomepage: form.featuredOnHomepage,
    });
    notify("success", `Brand "${form.name}" saved.`);
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

  function toggleFeaturedRelease(s: string) {
    setFeaturedReleaseSlugs((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function toggleFeaturedSong(s: string) {
    setFeaturedSongSlugs((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  return (
    <AdminShell title={`Edit — ${brand.name}`}>
      <div className="max-w-2xl space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <a href="/admin/brands" className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors">
            ← Brands
          </a>
          <a href={`/brands/${brand.slug}`} target="_blank" rel="noopener noreferrer"
            className="text-[10px] font-mono text-white/25 hover:text-white transition-colors">
            ↗ /brands/{brand.slug}
          </a>
        </div>

        {/* Identity */}
        <FormSection title="Identity">
          <FormField type="text" label="Brand Name" required value={form.name} onChange={(v) => set("name", v)} />
          <FormField type="text" label="Slug" required mono value={form.slug}
            hint="/brands/[slug]" onChange={(v) => set("slug", v)} />
          <FormField type="text" label="Category" value={form.category} onChange={(v) => set("category", v)} />
          <FormField type="text" label="Tagline" value={form.tagline} onChange={(v) => set("tagline", v)} />
          <FormField type="text" label="Descriptor" value={form.descriptor} onChange={(v) => set("descriptor", v)} />
        </FormSection>

        {/* Status & Theme */}
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

        {/* Campaign */}
        <FormSection title="Campaign & Collection">
          <FormField
            type="select"
            label="Campaign Status"
            value={form.campaignStatus ?? "inactive"}
            onChange={(v) => set("campaignStatus", v as CMSBrand["campaignStatus"])}
            options={[
              { value: "active",   label: "Active — campaign is live" },
              { value: "upcoming", label: "Upcoming — campaign is announced" },
              { value: "inactive", label: "Inactive — no current campaign" },
            ]}
          />
          <FormField
            type="text"
            label="Collection / Capsule Name"
            value={form.collectionName}
            placeholder="e.g. Spring 2025 — Void Series"
            hint="Current seasonal collection or capsule label"
            onChange={(v) => set("collectionName", v)}
          />
        </FormSection>

        {/* Content */}
        <FormSection title="Content">
          <FormField type="textarea" label="Long Description" rows={4} value={form.longDescription}
            onChange={(v) => set("longDescription", v)} />
          <FormField type="textarea" label="Manifesto" rows={4} value={form.manifesto}
            onChange={(v) => set("manifesto", v)} />
        </FormSection>

        {/* Hero Copy */}
        <FormSection title="Hero Copy">
          <FormField
            type="text"
            label="Hero Headline"
            value={form.heroHeadline}
            placeholder="Primary H1 text on the brand page hero"
            onChange={(v) => set("heroHeadline", v)}
          />
          <FormField
            type="text"
            label="Hero Subcopy"
            value={form.heroSubcopy}
            placeholder="Subtitle displayed beneath the headline"
            onChange={(v) => set("heroSubcopy", v)}
          />
          <FormField
            type="textarea"
            label="Hero Body Copy"
            rows={3}
            value={form.heroCopy}
            placeholder="Extended copy for the hero section (optional)"
            onChange={(v) => set("heroCopy", v)}
          />
        </FormSection>

        {/* Assets */}
        <FormSection title="Assets">
          {/* Hero Image — upload/replace + library attach */}
          <EntityMediaPanel
            entityType="brand"
            entityId={brand.id}
            role="hero"
            title="Hero Image"
            assetType="image"
            allowMultiple={false}
            canUpload={role.canUploadMedia}
            onPrimaryUrlChange={(url) => set("heroImageUrl", url ?? "")}
          />
          <FormField type="url" label="Hero Image URL (manual override)" value={form.heroImageUrl}
            placeholder="https://…" mono onChange={(v) => set("heroImageUrl", v)} />
          <FormField type="url" label="Logo URL" value={form.logoUrl}
            placeholder="https://…" mono onChange={(v) => set("logoUrl", v)} />
        </FormSection>

        {/* Gallery */}
        <FormSection title="Gallery">
          <EntityMediaPanel
            entityType="brand"
            entityId={brand.id}
            role="gallery"
            title="Gallery Images"
            assetType="image"
            allowMultiple={true}
            canUpload={role.canUploadMedia}
          />
        </FormSection>

        {/* Campaign Media */}
        <FormSection title="Campaign Video / Media">
          <EntityMediaPanel
            entityType="brand"
            entityId={brand.id}
            role="video"
            title="Campaign Video"
            assetType="video"
            allowMultiple={true}
            canUpload={role.canUploadMedia}
          />
        </FormSection>

        {/* Featured Content */}
        <FormSection title="Featured Content">
          <FeaturedReleasesPicker
            attached={featuredReleaseSlugs}
            releases={releases}
            onToggle={toggleFeaturedRelease}
          />
          <div className="border-t border-white/5 pt-5">
            <FeaturedSongsPicker
              attached={featuredSongSlugs}
              songs={songs}
              onToggle={toggleFeaturedSong}
            />
          </div>
        </FormSection>

        {/* Actions */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <SaveButton onClick={handleSave} saving={saving} disabled={!role.canEditContent} />
          <DangerButton
            onClick={handleDelete}
            label="Delete Brand"
            disabled={!role.canDelete}
          />
        </div>
        {!role.canDelete && (
          <p className="text-[10px] text-white/20">
            ◌ Your role ({role.roleLabel}) does not have permission to delete entities.
          </p>
        )}
      </div>
    </AdminShell>
  );
}
