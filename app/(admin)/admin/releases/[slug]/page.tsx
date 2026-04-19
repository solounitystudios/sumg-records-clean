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
import { TracklistEditor } from "@/components/admin/TracklistEditor";
import { MediaLibraryGrid } from "@/components/admin/MediaLibraryGrid";
import { useCmsStore, isReleasePublic } from "@/lib/cms/store";
import { CMSArtist, CMSProducer, CMSRelease, CMSSong, ReleaseStatus, CMSAsset, AssetAttachment, DSPLinks, ProviderConfig } from "@/lib/types";
import { getReleaseReadiness } from "@/lib/cms/readiness";
import { useRole } from "@/lib/auth/use-role";
import { EntityMediaPanel } from "@/components/admin/EntityMediaPanel";
import { DSPLinksPanel } from "@/components/admin/DSPLinksPanel";
import { ProviderPanel } from "@/components/admin/ProviderPanel";

// ─── Artist multi-picker ─────────────────────────────────────────────────────

function ArtistRelationPanel({
  release,
  allArtists,
  onChangePrimary,
  onToggleFeatured,
}: {
  release: CMSRelease;
  allArtists: CMSArtist[];
  onChangePrimary: (slug: string, name: string) => void;
  onToggleFeatured: (slug: string) => void;
}) {
  const featured = release.featuredArtistSlugs ?? [];
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-3">Primary Artist</p>
        <select
          value={release.artistSlug}
          onChange={(e) => {
            const a = allArtists.find((x) => x.slug === e.target.value);
            onChangePrimary(e.target.value, a?.name ?? e.target.value);
          }}
          className="w-full bg-transparent border border-white/10 px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-colors"
        >
          <option value="" className="bg-neutral-900">— Select artist —</option>
          {allArtists.map((a) => (
            <option key={a.id} value={a.slug} className="bg-neutral-900">
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-3">
          Featured Artists <span className="text-white/15">(toggle to add/remove)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {allArtists.map((a) => {
            const isActive = featured.includes(a.slug);
            const isPrimary = a.slug === release.artistSlug;
            return (
              <button
                key={a.id}
                type="button"
                disabled={isPrimary}
                onClick={() => onToggleFeatured(a.slug)}
                title={isPrimary ? "Primary artist" : undefined}
                className={`border px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase transition-all duration-150 ${
                  isPrimary
                    ? "border-white/20 text-white/50 cursor-default"
                    : isActive
                    ? "border-white/30 bg-white/[0.06] text-white"
                    : "border-white/[0.06] text-white/30 hover:border-white/15 hover:text-white/60"
                }`}
              >
                {isActive && !isPrimary && <span className="mr-1">✓</span>}
                {isPrimary && <span className="mr-1">★</span>}
                {a.name}
              </button>
            );
          })}
          {allArtists.length === 0 && (
            <p className="text-[10px] text-white/20 italic">No artists in library yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Producer multi-picker ───────────────────────────────────────────────────

function ProducerRelationPanel({
  release,
  allProducers,
  onToggle,
}: {
  release: CMSRelease;
  allProducers: CMSProducer[];
  onToggle: (slug: string) => void;
}) {
  const attached = release.producerSlugs ?? [];
  return (
    <div>
      <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-3">
        Producers <span className="text-white/15">(toggle to add/remove)</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {allProducers.map((p) => {
          const isActive = attached.includes(p.slug);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p.slug)}
              className={`border px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase transition-all duration-150 ${
                isActive
                  ? "border-white/30 bg-white/[0.06] text-white"
                  : "border-white/[0.06] text-white/30 hover:border-white/15 hover:text-white/60"
              }`}
            >
              {isActive && <span className="mr-1">✓</span>}
              {p.name}
            </button>
          );
        })}
        {allProducers.length === 0 && (
          <p className="text-[10px] text-white/20 italic">No producers in library yet.</p>
        )}
      </div>
      {attached.length > 0 && (
        <p className="text-[10px] text-white/20 mt-2">
          {attached.length} producer{attached.length !== 1 ? "s" : ""} attached
        </p>
      )}
    </div>
  );
}

// ─── Media attachment panel ──────────────────────────────────────────────────

const ASSET_ROLES: AssetAttachment["role"][] = [
  "cover",
  "gallery",
  "video",
  "audio",
];

function MediaRelationPanel({
  release,
  attachedAssets,
  onDetach,
  onAttach,
}: {
  release: CMSRelease;
  attachedAssets: CMSAsset[];
  onDetach: (assetId: string) => void;
  onAttach: (asset: CMSAsset, role: AssetAttachment["role"]) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [pendingAsset, setPendingAsset] = useState<CMSAsset | null>(null);
  const [pendingRole, setPendingRole] = useState<AssetAttachment["role"]>("cover");

  function handleSelect(asset: CMSAsset) {
    setPendingAsset(asset);
    setPendingRole("cover");
  }

  function confirmAttach() {
    if (!pendingAsset) return;
    onAttach(pendingAsset, pendingRole);
    setPendingAsset(null);
    setShowPicker(false);
  }

  return (
    <div className="space-y-4">
      {/* Attached assets list */}
      {attachedAssets.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-2">Attached Assets</p>
          {attachedAssets.map((a) => {
            const attachment = a.attachedTo?.find(
              (att) => att.entityType === "release" && att.entityId === release.id
            );
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 border border-white/5 px-3 py-2 bg-white/[0.01]"
              >
                {a.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.url}
                    alt={a.filename}
                    className="w-8 h-8 object-cover border border-white/10 flex-shrink-0"
                  />
                ) : (
                  <span className="w-8 h-8 flex items-center justify-center text-white/20 text-base border border-white/5 flex-shrink-0">
                    {a.type === "audio" ? "♫" : a.type === "video" ? "▶" : "▤"}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/60 truncate">{a.filename}</p>
                  {attachment && (
                    <p className="text-[10px] text-white/20 capitalize">{attachment.role}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDetach(a.id)}
                  className="text-[10px] text-red-900 hover:text-red-400 transition-colors px-2"
                >
                  Detach
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Attach button */}
      {!showPicker && (
        <button
          type="button"
          onClick={() => { setShowPicker(true); setPendingAsset(null); }}
          className="border border-white/10 px-4 py-2 text-[10px] tracking-[0.15em] uppercase text-white/40 hover:border-white/25 hover:text-white/70 transition-colors"
        >
          + Attach Media Asset
        </button>
      )}

      {/* Media picker drawer */}
      {showPicker && (
        <div className="border border-white/10 p-4 bg-white/[0.01] space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">
              Select Asset to Attach
            </p>
            <button
              type="button"
              onClick={() => { setShowPicker(false); setPendingAsset(null); }}
              className="text-white/25 hover:text-white text-xs transition-colors"
            >
              ✕ Cancel
            </button>
          </div>

          {/* Role picker (shown when asset selected) */}
          {pendingAsset && (
            <div className="border border-white/10 p-3 bg-white/[0.02] space-y-3">
              <div className="flex items-center gap-3">
                {pendingAsset.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pendingAsset.url} alt={pendingAsset.filename}
                    className="w-10 h-10 object-cover border border-white/10" />
                ) : (
                  <span className="w-10 h-10 flex items-center justify-center text-white/20 border border-white/5">
                    {pendingAsset.type === "audio" ? "♫" : "▶"}
                  </span>
                )}
                <p className="text-xs text-white/60 flex-1 truncate">{pendingAsset.filename}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-[10px] tracking-wider uppercase text-white/20">Role</p>
                <div className="flex gap-2">
                  {ASSET_ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setPendingRole(r)}
                      className={`border px-3 py-1 text-[10px] tracking-wider uppercase transition-colors ${
                        pendingRole === r
                          ? "border-white/30 text-white"
                          : "border-white/10 text-white/30 hover:border-white/20"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={confirmAttach}
                className="bg-white text-black text-[10px] tracking-[0.2em] uppercase px-5 py-2 font-semibold hover:bg-white/90 transition-colors"
              >
                Attach
              </button>
            </div>
          )}

          <div className="max-h-72 overflow-y-auto">
            <MediaLibraryGrid
              onSelect={handleSelect}
              selectedId={pendingAsset?.id}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Readiness checklist ─────────────────────────────────────────────────────

function ReadinessChecklist({ release, allSongs }: { release: CMSRelease; allSongs: CMSSong[] }) {
  const { score, items } = getReleaseReadiness(release, allSongs);
  const barColor = score === 100 ? "bg-green-500/60" : score >= 66 ? "bg-yellow-500/50" : "bg-red-500/40";
  return (
    <div className="space-y-4">
      {/* Score bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-1 bg-white/5 relative overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full transition-all duration-500 ${barColor}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={`text-[11px] font-mono font-semibold tabular-nums min-w-[3ch] text-right ${
          score === 100 ? "text-green-400/70" : score >= 66 ? "text-yellow-400/70" : "text-red-400/60"
        }`}>
          {score}%
        </span>
      </div>

      {/* Item list */}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.key} className="flex items-start gap-3">
            <span className={`flex-shrink-0 text-xs mt-0.5 ${item.passed ? "text-green-400/60" : "text-red-400/50"}`}>
              {item.passed ? "✓" : "✗"}
            </span>
            <div>
              <p className={`text-[11px] tracking-wide ${item.passed ? "text-white/40" : "text-white/70"}`}>
                {item.label}
              </p>
              {!item.passed && item.detail && (
                <p className="text-[10px] text-white/25 mt-0.5">{item.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {score < 100 && (
        <p className="text-[10px] text-white/15 border-t border-white/5 pt-3">
          Complete all checks before publishing for the best experience.
        </p>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EditReleasePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const {
    getReleaseBySlug,
    updateRelease,
    deleteRelease,
    publishRelease,
    updateTracklist,
    notify,
    artists,
    producers,
    songs,
    getAssetsForEntity,
    attachAssetToEntity,
    detachAssetFromEntity,
  } = useCmsStore();
  const role = useRole();

  const release = getReleaseBySlug(slug);
  const [form, setForm] = useState<{
    title: string;
    slug: string;
    artistSlug: string;
    artistName: string;
    type: CMSRelease["type"];
    genre: string;
    releaseDate: string;
    publishAt: string;
    status: ReleaseStatus;
    isVisible: boolean;
    featuredOnHomepage: boolean;
    description: string;
    coverArtUrl: string;
    "streamingLinks.spotify": string;
    "streamingLinks.appleMusic": string;
    "streamingLinks.tidal": string;
    "streamingLinks.soundcloud": string;
    "streamingLinks.youtube": string;
  } | null>(null);
  const [tracklist, setTracklist] = useState<CMSSong[]>([]);
  const [featuredArtistSlugs, setFeaturedArtistSlugs] = useState<string[]>([]);
  const [producerSlugs, setProducerSlugs] = useState<string[]>([]);
  const [dspLinks, setDspLinks] = useState<DSPLinks>({});
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>({});
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!release) return;
    setForm({
      title: release.title,
      slug: release.slug,
      artistSlug: release.artistSlug,
      artistName: release.artistName,
      type: release.type,
      genre: release.genre,
      releaseDate: release.releaseDate,
      publishAt: release.publishAt ?? "",
      status: release.status,
      isVisible: release.isVisible,
      featuredOnHomepage: release.featuredOnHomepage ?? false,
      description: release.description,
      coverArtUrl: release.coverArtUrl ?? "",
      "streamingLinks.spotify": release.streamingLinks?.spotify ?? "",
      "streamingLinks.appleMusic": release.streamingLinks?.appleMusic ?? "",
      "streamingLinks.tidal": release.streamingLinks?.tidal ?? "",
      "streamingLinks.soundcloud": release.streamingLinks?.soundcloud ?? "",
      "streamingLinks.youtube": release.streamingLinks?.youtube ?? "",
    });
    setTracklist(release.tracklist ?? []);
    setFeaturedArtistSlugs(release.featuredArtistSlugs ?? []);
    setProducerSlugs(release.producerSlugs ?? []);
    setDspLinks(release.dspLinks ?? {});
    setProviderConfig(release.providerConfig ?? {});
  }, [release]);

  if (!release || !form) {
    return (
      <AdminShell title="Release Not Found">
        <p className="text-white/30 text-sm">No release found with slug &ldquo;{slug}&rdquo;.</p>
        <a href="/admin/releases" className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white mt-4 block transition-colors">
          ← Back to Releases
        </a>
      </AdminShell>
    );
  }

  const attachedAssets = getAssetsForEntity("release", release.id);

  function set(key: string, value: string | boolean) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  function handleSave() {
    if (!release || !form) return;
    setSaving(true);
    updateRelease(release.id, {
      title: form.title,
      slug: form.slug,
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
      featuredArtistSlugs: featuredArtistSlugs.length ? featuredArtistSlugs : undefined,
      producerSlugs: producerSlugs.length ? producerSlugs : undefined,
      streamingLinks: {
        spotify: form["streamingLinks.spotify"] || undefined,
        appleMusic: form["streamingLinks.appleMusic"] || undefined,
        tidal: form["streamingLinks.tidal"] || undefined,
        soundcloud: form["streamingLinks.soundcloud"] || undefined,
        youtube: form["streamingLinks.youtube"] || undefined,
      },
      dspLinks: Object.keys(dspLinks).some((k) => dspLinks[k as keyof DSPLinks])
        ? dspLinks
        : undefined,
      providerConfig: Object.keys(providerConfig).length
        ? providerConfig
        : undefined,
    });
    updateTracklist(release.id, tracklist);
    notify("success", `Release "${form.title}" saved.`);
    setSaving(false);
  }

  function handlePublishNow() {
    if (!release) return;
    if (!confirm(`Publish "${release.title}" now? It will go live immediately on the public site.`)) return;
    setPublishing(true);
    publishRelease(release.id);
    set("status", "published");
    set("isVisible", true);
    notify("success", `"${release.title}" is now live. It will appear on /releases and linked artist pages.`);
    setPublishing(false);
  }

  function handleDelete() {
    if (!release) return;
    if (confirm(`Delete "${release.title}"? This cannot be undone.`)) {
      deleteRelease(release.id);
      notify("success", `Release "${release.title}" deleted.`);
      router.push("/admin/releases");
    }
  }

  function handleToggleFeaturedArtist(slug: string) {
    setFeaturedArtistSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  function handleToggleProducer(slug: string) {
    setProducerSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  function handleAttachAsset(asset: CMSAsset, role: AssetAttachment["role"]) {
    attachAssetToEntity(asset.id, {
      entityType: "release",
      entityId: release!.id,
      role,
    });
    notify("success", `"${asset.filename}" attached as ${role}.`);
  }

  function handleDetachAsset(assetId: string) {
    detachAssetFromEntity(assetId, "release", release!.id);
    notify("info", "Asset detached.");
  }

  const isLive = isReleasePublic(release);

  return (
    <AdminShell title={`Edit — ${release.title}`}>
      <div className="max-w-2xl space-y-10">
        {/* Back + status */}
        <div className="flex items-center justify-between">
          <a href="/admin/releases" className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors">
            ← Releases
          </a>
          <div className="flex items-center gap-3">
            <StatusBadge status={release.status} />
            {release.isVisible && (
              <a href={`/releases/${release.slug}`} target="_blank" rel="noopener noreferrer"
                className="text-[10px] font-mono text-white/25 hover:text-white transition-colors">
                ↗ View Live
              </a>
            )}
          </div>
        </div>

        {/* Auto-publish status bar */}
        <div className={`border px-5 py-3 text-[11px] ${
          isLive
            ? "border-green-800/40 bg-green-950/20 text-green-300/70"
            : release.status === "scheduled"
            ? "border-yellow-800/40 bg-yellow-950/20 text-yellow-300/70"
            : "border-white/5 text-white/20"
        }`}>
          {isLive
            ? "✓ This release is live. It is visible on /releases, the artist page, and homepage sections."
            : release.status === "scheduled"
            ? `⏱ Scheduled to publish at ${release.publishAt ?? "set date"}.`
            : "◯ This release is not yet public. Set status to Published and save — or use Publish Now."}
        </div>

        {/* Release info */}
        <FormSection title="Release Info">
          <FormField type="text" label="Title" required value={form.title} onChange={(v) => set("title", v)} />
          <FormField type="text" label="Slug" required mono value={form.slug}
            hint="/releases/[slug]" onChange={(v) => set("slug", v)} />
          <FormField type="text" label="Artist Name" required value={form.artistName} onChange={(v) => set("artistName", v)} />
          <FormField type="text" label="Artist Slug" mono value={form.artistSlug}
            hint="/artists/[slug]" onChange={(v) => set("artistSlug", v)} />
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

        {/* ── Relations ─────────────────────────────────────────────────────── */}
        <FormSection title="Relations">
          <ArtistRelationPanel
            release={{ ...release, featuredArtistSlugs, artistSlug: form.artistSlug }}
            allArtists={artists}
            onChangePrimary={(slug, name) => {
              set("artistSlug", slug);
              set("artistName", name);
            }}
            onToggleFeatured={handleToggleFeaturedArtist}
          />
          <div className="border-t border-white/5 pt-5">
            <ProducerRelationPanel
              release={{ ...release, producerSlugs }}
              allProducers={producers}
              onToggle={handleToggleProducer}
            />
          </div>
          <div className="border-t border-white/5 pt-5">
            <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-3">Media Assets</p>
            <MediaRelationPanel
              release={release}
              attachedAssets={attachedAssets}
              onDetach={handleDetachAsset}
              onAttach={handleAttachAsset}
            />
          </div>
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
            <FormField type="datetime-local" label="Publish At" value={form.publishAt}
              hint="Required when status is Scheduled"
              onChange={(v) => set("publishAt", v)} />
          </div>
          <div className="flex items-center gap-8">
            <FormField type="toggle" label="Visible" value={form.isVisible} onChange={(v) => set("isVisible", v)} />
            <FormField type="toggle" label="Featured on Homepage" value={form.featuredOnHomepage} onChange={(v) => set("featuredOnHomepage", v)} />
          </div>

          {/* Publish now shortcut */}
          {!isLive && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handlePublishNow}
                disabled={publishing || !role.canPublish}
                className="border border-yellow-800/60 text-yellow-400/80 text-[10px] tracking-[0.2em] uppercase px-6 py-2.5 hover:border-yellow-500/60 hover:text-yellow-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {publishing ? "Publishing…" : "⬆ Publish Now"}
              </button>
              <p className="text-[10px] text-white/15 mt-1.5">
                {role.canPublish
                  ? "Sets status to Published, isVisible to true, and surfaces this release across all public pages immediately."
                  : `Your role (${role.roleLabel}) cannot publish releases.`}
              </p>
            </div>
          )}
        </FormSection>

        {/* Readiness checklist */}
        <FormSection title="Release Readiness">
          <ReadinessChecklist release={{ ...release, producerSlugs, featuredArtistSlugs }} allSongs={songs} />
        </FormSection>

        {/* Cover art */}
        <FormSection title="Cover Art">
          <EntityMediaPanel
            entityType="release"
            entityId={release.id}
            role="cover"
            title="Cover Art Image"
            assetType="image"
            allowMultiple={false}
            canUpload={role.canUploadMedia}
            onPrimaryUrlChange={(url) => set("coverArtUrl", url ?? "")}
          />
          <FormField type="url" label="Cover Art URL (manual override)" value={form.coverArtUrl}
            placeholder="https://…" mono onChange={(v) => set("coverArtUrl", v)} />
        </FormSection>

        {/* Gallery */}
        <FormSection title="Image Gallery">
          <EntityMediaPanel
            entityType="release"
            entityId={release.id}
            role="gallery"
            title="Gallery Images"
            assetType="image"
            allowMultiple={true}
            canUpload={role.canUploadMedia}
          />
        </FormSection>

        {/* Teaser video */}
        <FormSection title="Teaser Video">
          <EntityMediaPanel
            entityType="release"
            entityId={release.id}
            role="video"
            title="Teaser / Promo Video"
            assetType="video"
            allowMultiple={true}
            canUpload={role.canUploadMedia}
          />
        </FormSection>

        {/* Tracklist */}
        <FormSection title="Tracklist">
          <TracklistEditor
            releaseSlug={release.slug}
            artistSlug={release.artistSlug}
            tracks={tracklist}
            onChange={setTracklist}
          />
        </FormSection>

        {/* Streaming links */}
        <FormSection title="Streaming Links (legacy)">
          <FormField type="url" label="Spotify" value={form["streamingLinks.spotify"]}
            placeholder="https://open.spotify.com/…" mono onChange={(v) => set("streamingLinks.spotify", v)} />
          <FormField type="url" label="Apple Music" value={form["streamingLinks.appleMusic"]}
            placeholder="https://music.apple.com/…" mono onChange={(v) => set("streamingLinks.appleMusic", v)} />
          <FormField type="url" label="Tidal" value={form["streamingLinks.tidal"]}
            mono onChange={(v) => set("streamingLinks.tidal", v)} />
          <FormField type="url" label="SoundCloud" value={form["streamingLinks.soundcloud"]}
            mono onChange={(v) => set("streamingLinks.soundcloud", v)} />
          <FormField type="url" label="YouTube" value={form["streamingLinks.youtube"]}
            mono onChange={(v) => set("streamingLinks.youtube", v)} />
        </FormSection>

        {/* DSP links */}
        <FormSection title="DSP Links">
          <DSPLinksPanel value={dspLinks} onChange={setDspLinks} />
        </FormSection>

        {/* Provider config */}
        <FormSection title="Provider & Distribution">
          <ProviderPanel
            value={providerConfig}
            onChange={setProviderConfig}
            context="release"
          />
        </FormSection>

        {/* Actions */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <SaveButton onClick={handleSave} saving={saving} />
          <DangerButton onClick={handleDelete} label="Delete Release" disabled={!role.canDelete} />
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

