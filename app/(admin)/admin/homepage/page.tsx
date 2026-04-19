"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { FormField, FormSection, SaveButton } from "@/components/admin/FormField";
import { useCmsStore } from "@/lib/cms/store";

const DEFAULT_SECTIONS = ["hero", "artists", "releases", "brands", "producers"];

export default function AdminHomepage() {
  const { homepageConfig, updateHomepageConfig, artists, brands, releases, notify } =
    useCmsStore();

  const [form, setForm] = useState({
    heroHeadline: "",
    heroSubtext: "",
    featuredArtistSlugs: "",
    featuredBrandSlugs: "",
    featuredReleaseSlugs: "",
    showLatestReleases: true,
    latestReleasesCount: "4",
  });

  const [sectionVisibility, setSectionVisibility] = useState<Record<string, boolean>>({
    hero: true,
    artists: true,
    releases: true,
    brands: true,
    producers: true,
  });

  useEffect(() => {
    const cfg = homepageConfig;
    setForm({
      heroHeadline: cfg.heroHeadline,
      heroSubtext: cfg.heroSubtext,
      featuredArtistSlugs: (cfg.featuredArtistSlugs ?? []).join(", "),
      featuredBrandSlugs: (cfg.featuredBrandSlugs ?? []).join(", "),
      featuredReleaseSlugs: (cfg.featuredReleaseSlugs ?? []).join(", "),
      showLatestReleases: cfg.showLatestReleases,
      latestReleasesCount: String(cfg.latestReleasesCount),
    });
    if (cfg.sectionVisibility) {
      setSectionVisibility(cfg.sectionVisibility);
    }
  }, [homepageConfig]);

  function set(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function parseSlugs(str: string): string[] {
    return str
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function handleSave() {
    updateHomepageConfig({
      heroHeadline: form.heroHeadline,
      heroSubtext: form.heroSubtext,
      featuredArtistSlugs: parseSlugs(form.featuredArtistSlugs),
      featuredBrandSlugs: parseSlugs(form.featuredBrandSlugs),
      featuredReleaseSlugs: parseSlugs(form.featuredReleaseSlugs),
      showLatestReleases: form.showLatestReleases,
      latestReleasesCount: parseInt(form.latestReleasesCount) || 4,
      sectionVisibility,
    });
    notify("success", "Homepage config saved.");
  }

  const publishedReleases = releases.filter((r) => r.status === "published");
  const featuredArtists = artists.filter((a) => a.featured);

  return (
    <AdminShell title="Homepage">
      <div className="max-w-2xl space-y-10">
        {/* Preview link */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] tracking-[0.3em] uppercase text-white/25">
            Last saved: {new Date(homepageConfig.updatedAt).toLocaleString()}
          </p>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-white/25 hover:text-white transition-colors"
          >
            ↗ View Homepage
          </a>
        </div>

        {/* Hero section */}
        <FormSection title="Hero Section">
          <FormField
            type="text"
            label="Hero Headline"
            value={form.heroHeadline}
            onChange={(v) => set("heroHeadline", v)}
          />
          <FormField
            type="textarea"
            label="Hero Subtext"
            rows={2}
            value={form.heroSubtext}
            onChange={(v) => set("heroSubtext", v)}
          />
        </FormSection>

        {/* Featured content */}
        <FormSection title="Featured Content">
          <FormField
            type="text"
            label="Featured Artist Slugs"
            value={form.featuredArtistSlugs}
            hint="Comma-separated slugs. Available: zyson, lysandra-noir, turkz, marrick, sorin, yosin, jayno"
            onChange={(v) => set("featuredArtistSlugs", v)}
          />
          <FormField
            type="text"
            label="Featured Brand Slugs"
            value={form.featuredBrandSlugs}
            hint="Comma-separated slugs. Available: woronoff, unity-standard, moon-spell, concrete-borough, salt-current"
            onChange={(v) => set("featuredBrandSlugs", v)}
          />
          <FormField
            type="text"
            label="Featured Release Slugs"
            value={form.featuredReleaseSlugs}
            hint="Comma-separated slugs."
            onChange={(v) => set("featuredReleaseSlugs", v)}
          />
        </FormSection>

        {/* Latest releases */}
        <FormSection title="Latest Releases Block">
          <FormField
            type="toggle"
            label="Show Latest Releases"
            value={form.showLatestReleases}
            onChange={(v) => set("showLatestReleases", v)}
          />
          <FormField
            type="number"
            label="Number of Releases to Show"
            value={form.latestReleasesCount}
            onChange={(v) => set("latestReleasesCount", v)}
          />
          <p className="text-[10px] text-white/20">
            {publishedReleases.length} published release{publishedReleases.length !== 1 ? "s" : ""} available.
          </p>
        </FormSection>

        {/* Section visibility */}
        <FormSection title="Section Visibility">
          <div className="space-y-4">
            {DEFAULT_SECTIONS.map((section) => (
              <div key={section} className="flex items-center justify-between">
                <p className="text-xs text-white/50 capitalize">{section}</p>
                <FormField
                  type="toggle"
                  label=""
                  value={sectionVisibility[section] ?? true}
                  onChange={(v) =>
                    setSectionVisibility((prev) => ({ ...prev, [section]: v }))
                  }
                />
              </div>
            ))}
          </div>
        </FormSection>

        {/* Quick reference */}
        <FormSection title="Quick Reference">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] tracking-[0.15em] uppercase text-white/20 mb-1.5">Featured Artists ({featuredArtists.length})</p>
              <div className="flex flex-wrap gap-2">
                {featuredArtists.map((a) => (
                  <span key={a.id} className="border border-white/5 px-2 py-0.5 text-[10px] font-mono text-white/30">{a.slug}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.15em] uppercase text-white/20 mb-1.5">Published Releases ({publishedReleases.length})</p>
              <div className="flex flex-wrap gap-2">
                {publishedReleases.map((r) => (
                  <span key={r.id} className="border border-white/5 px-2 py-0.5 text-[10px] font-mono text-white/30">{r.slug}</span>
                ))}
              </div>
            </div>
          </div>
        </FormSection>

        <div className="pt-4 border-t border-white/5">
          <SaveButton onClick={handleSave} />
        </div>
      </div>
    </AdminShell>
  );
}
