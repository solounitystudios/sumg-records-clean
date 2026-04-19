"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { FormField, FormSection, SaveButton } from "@/components/admin/FormField";
import { useCmsStore } from "@/lib/cms/store";

const DEFAULT_SECTIONS = ["hero", "artists", "releases", "brands", "producers"];

// ─── Multi-entity toggle picker ───────────────────────────────────────────────

function EntityTogglePicker({
  label,
  items,
  selected,
  onToggle,
}: {
  label: string;
  items: { id: string; slug: string; name: string; badge?: string }[];
  selected: string[];
  onToggle: (slug: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-3">
        {label}{" "}
        <span className="text-white/15">
          ({selected.length} selected)
        </span>
      </p>
      {items.length === 0 ? (
        <p className="text-[10px] text-white/20 italic">
          No {label.toLowerCase()} in library yet.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const isActive = selected.includes(item.slug);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggle(item.slug)}
                className={`border px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase transition-all duration-150 flex items-center gap-1.5 ${
                  isActive
                    ? "border-white/30 bg-white/[0.06] text-white"
                    : "border-white/[0.06] text-white/30 hover:border-white/15 hover:text-white/60"
                }`}
              >
                {isActive && <span>✓</span>}
                {item.name}
                {item.badge && (
                  <span className="text-[9px] text-white/20 tracking-wider normal-case ml-1">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminHomepage() {
  const {
    homepageConfig,
    updateHomepageConfig,
    artists,
    brands,
    releases,
    notify,
  } = useCmsStore();

  const [heroHeadline, setHeroHeadline] = useState("");
  const [heroSubtext, setHeroSubtext] = useState("");
  const [showLatestReleases, setShowLatestReleases] = useState(true);
  const [latestReleasesCount, setLatestReleasesCount] = useState("4");

  const [featuredArtistSlugs, setFeaturedArtistSlugs] = useState<string[]>([]);
  const [featuredBrandSlugs, setFeaturedBrandSlugs] = useState<string[]>([]);
  const [featuredReleaseSlugs, setFeaturedReleaseSlugs] = useState<string[]>([]);

  const [sectionVisibility, setSectionVisibility] = useState<Record<string, boolean>>({
    hero: true,
    artists: true,
    releases: true,
    brands: true,
    producers: true,
  });

  useEffect(() => {
    const cfg = homepageConfig;
    setHeroHeadline(cfg.heroHeadline);
    setHeroSubtext(cfg.heroSubtext);
    setShowLatestReleases(cfg.showLatestReleases);
    setLatestReleasesCount(String(cfg.latestReleasesCount));
    setFeaturedArtistSlugs(cfg.featuredArtistSlugs ?? []);
    setFeaturedBrandSlugs(cfg.featuredBrandSlugs ?? []);
    setFeaturedReleaseSlugs(cfg.featuredReleaseSlugs ?? []);
    if (cfg.sectionVisibility) {
      setSectionVisibility(cfg.sectionVisibility);
    }
  }, [homepageConfig]);

  function toggleSlug(
    slug: string,
    list: string[],
    setList: (v: string[]) => void
  ) {
    setList(list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug]);
  }

  function handleSave() {
    updateHomepageConfig({
      heroHeadline,
      heroSubtext,
      featuredArtistSlugs,
      featuredBrandSlugs,
      featuredReleaseSlugs,
      showLatestReleases,
      latestReleasesCount: parseInt(latestReleasesCount) || 4,
      sectionVisibility,
    });
    notify("success", "Homepage config saved.");
  }

  // Derive display lists from live DB records
  const artistItems = artists.map((a) => ({
    id: a.id,
    slug: a.slug,
    name: a.name,
    badge: a.featured ? "featured" : undefined,
  }));

  const brandItems = brands
    .filter((b) => b.isActive)
    .map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
    }));

  const releaseItems = releases.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.title,
    badge: r.status === "published" ? "live" : r.status,
  }));

  const publishedCount = releases.filter((r) => r.status === "published").length;

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
            value={heroHeadline}
            onChange={setHeroHeadline}
          />
          <FormField
            type="textarea"
            label="Hero Subtext"
            rows={2}
            value={heroSubtext}
            onChange={setHeroSubtext}
          />
        </FormSection>

        {/* Featured content — DB-backed pickers */}
        <FormSection title="Featured Content">
          <EntityTogglePicker
            label="Featured Artists"
            items={artistItems}
            selected={featuredArtistSlugs}
            onToggle={(slug) =>
              toggleSlug(slug, featuredArtistSlugs, setFeaturedArtistSlugs)
            }
          />
          <div className="border-t border-white/5 pt-5">
            <EntityTogglePicker
              label="Featured Brands"
              items={brandItems}
              selected={featuredBrandSlugs}
              onToggle={(slug) =>
                toggleSlug(slug, featuredBrandSlugs, setFeaturedBrandSlugs)
              }
            />
          </div>
          <div className="border-t border-white/5 pt-5">
            <EntityTogglePicker
              label="Featured Releases"
              items={releaseItems}
              selected={featuredReleaseSlugs}
              onToggle={(slug) =>
                toggleSlug(slug, featuredReleaseSlugs, setFeaturedReleaseSlugs)
              }
            />
          </div>
        </FormSection>

        {/* Latest releases */}
        <FormSection title="Latest Releases Block">
          <FormField
            type="toggle"
            label="Show Latest Releases"
            value={showLatestReleases}
            onChange={setShowLatestReleases}
          />
          <FormField
            type="number"
            label="Number of Releases to Show"
            value={latestReleasesCount}
            onChange={setLatestReleasesCount}
          />
          <p className="text-[10px] text-white/20">
            {publishedCount} published release{publishedCount !== 1 ? "s" : ""} available.
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

        <div className="pt-4 border-t border-white/5">
          <SaveButton onClick={handleSave} />
        </div>
      </div>
    </AdminShell>
  );
}

