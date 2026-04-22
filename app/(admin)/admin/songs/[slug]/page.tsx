"use client";

import { useEffect, useState, useRef } from "react";
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
import { CMSSong, ReleaseStatus, CMSAsset, DSPLinks } from "@/lib/types";
import { uploadAsset } from "@/lib/media";
import { useRole } from "@/lib/auth/use-role";
import {
  ACCEPTED_AUDIO_TYPES,
  MAX_AUDIO_SIZE,
} from "@/lib/media";
import { getCurrentUploader } from "@/lib/auth";
import { DSPLinksPanel } from "@/components/admin/DSPLinksPanel";

// ─── Producer multi-picker ───────────────────────────────────────────────────

function ProducerPicker({
  attached,
  allProducers,
  onToggle,
}: {
  attached: string[];
  allProducers: { id: string; slug: string; name: string }[];
  onToggle: (slug: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-3">
        Producers{" "}
        <span className="text-white/15">(toggle to add/remove)</span>
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
          <p className="text-[10px] text-white/20 italic">
            No producers in library.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Native audio upload panel ───────────────────────────────────────────────

interface AudioUploadPanelProps {
  songId: string;
  songSlug: string;
  currentUrl?: string;
  currentAsset?: CMSAsset;
  onUploaded: (url: string, assetId: string) => void;
  onDelete: () => void;
}

function AudioUploadPanel({
  songId,
  currentUrl,
  currentAsset,
  onUploaded,
  onDelete,
}: AudioUploadPanelProps) {
  const { addAsset, deleteAsset, detachAssetFromEntity, attachAssetToEntity, notify } =
    useCmsStore();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploadError(null);
    if (!ACCEPTED_AUDIO_TYPES.includes(file.type)) {
      setUploadError("Unsupported file type. Use MP3, WAV, FLAC, AAC, or OGG.");
      return;
    }
    if (file.size > MAX_AUDIO_SIZE) {
      setUploadError(`File too large. Max ${Math.round(MAX_AUDIO_SIZE / 1024 / 1024)} MB.`);
      return;
    }
    setUploading(true);

    // Resolve the actual user identity for the audit trail.
    const uploadedBy = await getCurrentUploader();

    const result = await uploadAsset(file, "audio", uploadedBy);
    setUploading(false);
    if (!result.success || !result.asset) {
      // If Supabase is not configured, create a local-only asset with a blob URL
      // so the workflow still functions in dev without storage credentials.
      const localUrl = URL.createObjectURL(file);
      const asset = addAsset({
        type: "audio",
        url: localUrl,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedBy,
        attachedTo: [{ entityType: "song", entityId: songId, role: "audio" }],
      });
      onUploaded(localUrl, asset.id);
      notify("success", `"${file.name}" uploaded (local — Supabase storage not configured).`);
      return;
    }

    const asset = addAsset({
      ...result.asset,
      attachedTo: [{ entityType: "song", entityId: songId, role: "audio" }],
    });
    attachAssetToEntity(asset.id, {
      entityType: "song",
      entityId: songId,
      role: "audio",
    });
    onUploaded(asset.url, asset.id);
    notify("success", `"${file.name}" uploaded and linked.`);
  }

  async function handleDelete() {
    if (!confirm("Remove audio from this song?")) return;
    setDeleting(true);
    if (currentAsset) {
      detachAssetFromEntity(currentAsset.id, "song", songId);
    }
    onDelete();
    setDeleting(false);
    notify("success", "Audio removed.");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">
        Audio File
      </p>

      {/* Current audio preview */}
      {currentUrl && (
        <div className="border border-white/10 bg-white/[0.02] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-white/30 text-base flex-shrink-0">♫</span>
              <p className="text-xs text-white/50 font-mono truncate">
                {currentAsset?.filename ?? currentUrl.split("/").pop() ?? "audio"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-[10px] tracking-[0.1em] uppercase text-red-900 hover:text-red-400 transition-colors flex-shrink-0 ml-3"
            >
              {deleting ? "Removing…" : "Remove"}
            </button>
          </div>
          <audio
            controls
            src={currentUrl}
            className="w-full"
          />
          {/* Replace zone */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-[10px] tracking-[0.15em] uppercase text-white/20 hover:text-white/50 transition-colors"
            >
              ↑ Replace audio
            </button>
          </div>
        </div>
      )}

      {/* Upload drop zone (shown when no audio yet) */}
      {!currentUrl && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
            uploading
              ? "border-white/20 opacity-60"
              : dragOver
              ? "border-white/40 bg-white/[0.04]"
              : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
          }`}
        >
          {uploading ? (
            <p className="text-[11px] tracking-[0.2em] uppercase text-white/40 animate-pulse">
              Uploading…
            </p>
          ) : (
            <>
              <p className="text-[11px] tracking-[0.2em] uppercase text-white/30 mb-1">
                Upload Audio
              </p>
              <p className="text-[10px] text-white/15">
                MP3 · WAV · FLAC · AAC · OGG — max 100 MB
              </p>
              <p className="text-[10px] text-white/10 mt-1">
                Drop file here or click to browse
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={ACCEPTED_AUDIO_TYPES.join(",")}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          // Reset value so re-uploading same file triggers change event
          e.target.value = "";
        }}
      />

      {uploadError && (
        <p className="text-[10px] text-red-400">{uploadError}</p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditSongPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const {
    getSongBySlug,
    updateSong,
    deleteSong,
    notify,
    artists,
    releases,
    producers,
    getAssetsForEntity,
  } = useCmsStore();
  const role = useRole();

  const song = getSongBySlug(slug);

  const [form, setForm] = useState<{
    title: string;
    slug: string;
    artistSlug: string;
    releaseSlug: string;
    genre: string;
    duration: string;
    audioUrl: string;
    lyrics: string;
    trackNumber: string;
    isExplicit: boolean;
    status: ReleaseStatus;
    isVisible: boolean;
    featuredOnHomepage: boolean;
    publishAt: string;
    mediaAssetId: string;
  } | null>(null);
  const [producerSlugs, setProducerSlugs] = useState<string[]>([]);
  const [dspLinks, setDspLinks] = useState<DSPLinks>({});
  const [saving, setSaving] = useState(false);
  const formInitialized = useRef(false);

  // Seed form from song once — rollback-triggered store changes must NOT
  // re-seed or the user's in-progress edits would be silently wiped.
  useEffect(() => {
    if (!song || formInitialized.current) return;
    formInitialized.current = true;
    setForm({
      title: song.title,
      slug: song.slug,
      artistSlug: song.artistSlug,
      releaseSlug: song.releaseSlug ?? "",
      genre: song.genre ?? "",
      duration: song.duration ?? "",
      audioUrl: song.audioUrl ?? "",
      lyrics: song.lyrics ?? "",
      trackNumber: song.trackNumber ? String(song.trackNumber) : "",
      isExplicit: song.isExplicit ?? false,
      status: song.status,
      isVisible: song.isVisible,
      featuredOnHomepage: song.featuredOnHomepage ?? false,
      publishAt: song.publishAt ?? "",
      mediaAssetId: song.mediaAssetId ?? "",
    });
    setProducerSlugs(song.producerSlugs ?? []);
    setDspLinks(song.dspLinks ?? {});
  }, [song]);

  if (!song || !form) {
    return (
      <AdminShell title="Song Not Found">
        <p className="text-white/30 text-sm">
          No song found with slug &ldquo;{slug}&rdquo;.
        </p>
        <a
          href="/admin/songs"
          className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white mt-4 block transition-colors"
        >
          ← Back to Songs
        </a>
      </AdminShell>
    );
  }

  // Find the linked audio asset (from the media library, attached to this song)
  const attachedAudioAssets = getAssetsForEntity("song", song.id).filter(
    (a) => a.type === "audio"
  );
  const primaryAudioAsset = form.mediaAssetId
    ? attachedAudioAssets.find((a) => a.id === form.mediaAssetId) ?? attachedAudioAssets[0]
    : attachedAudioAssets[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function set(key: string, value: any) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!song || !form) return;
    setSaving(true);
    const artist = artists.find((a) => a.slug === form.artistSlug);
    const release = releases.find((r) => r.slug === form.releaseSlug);
    try {
      await updateSong(song.id, {
        title: form.title,
        artistSlug: form.artistSlug,
        artistName: artist?.name ?? song.artistName,
        releaseSlug: form.releaseSlug || undefined,
        releaseName: release?.title ?? song.releaseName,
        producerSlugs: producerSlugs.length ? producerSlugs : undefined,
        genre: form.genre || undefined,
        duration: form.duration || undefined,
        audioUrl: form.audioUrl || undefined,
        lyrics: form.lyrics || undefined,
        trackNumber: form.trackNumber ? parseInt(form.trackNumber) : undefined,
        isExplicit: form.isExplicit,
        status: form.status,
        isVisible: form.isVisible,
        publishAt: form.publishAt || undefined,
        featuredOnHomepage: form.featuredOnHomepage,
        mediaAssetId: form.mediaAssetId || undefined,
        dspLinks: Object.keys(dspLinks).length ? dspLinks : undefined,
      });
      notify("success", `"${form.title}" saved.`);
    } catch {
      // bgSync already surfaced an error toast; keep form edits intact.
    } finally {
      setSaving(false);
    }
  }

  async function handleAudioUploaded(url: string, assetId: string) {
    set("audioUrl", url);
    set("mediaAssetId", assetId);
    if (song) {
      try {
        await updateSong(song.id, { audioUrl: url, mediaAssetId: assetId });
      } catch {
        // bgSync already surfaced an error toast.
      }
    }
  }

  async function handleAudioDeleted() {
    set("audioUrl", "");
    set("mediaAssetId", "");
    if (song) {
      try {
        await updateSong(song.id, { audioUrl: undefined, mediaAssetId: undefined });
      } catch {
        // bgSync already surfaced an error toast.
      }
    }
  }

  function handleDelete() {
    if (!song) return;
    if (confirm(`Delete "${song.title}"? This cannot be undone.`)) {
      deleteSong(song.id);
      notify("success", `"${song.title}" deleted.`);
      router.push("/admin/songs");
    }
  }

  function toggleProducer(s: string) {
    setProducerSlugs((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  const isLive = song.status === "published" && song.isVisible;
  const hasAudio = Boolean(form.audioUrl);

  return (
    <AdminShell title={`Edit — ${song.title}`}>
      <div className="max-w-xl space-y-10">
        {/* Back + status */}
        <div className="flex items-center justify-between">
          <a
            href="/admin/songs"
            className="text-[10px] tracking-[0.2em] uppercase text-white/25 hover:text-white transition-colors"
          >
            ← Songs
          </a>
          <div className="flex items-center gap-3">
            <StatusBadge status={song.status} />
            {isLive && (
              <a
                href={`/songs/${song.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono text-white/25 hover:text-white transition-colors"
              >
                ↗ View Live
              </a>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div
          className={`border px-5 py-3 text-[11px] ${
            isLive
              ? "border-green-800/40 bg-green-950/20 text-green-300/70"
              : hasAudio
              ? "border-white/5 text-white/20"
              : "border-yellow-900/30 bg-yellow-950/10 text-yellow-500/50"
          }`}
        >
          {isLive
            ? "✓ This song is live. It appears on the artist page and release tracklist."
            : hasAudio
            ? "◯ This song is not public. Set status to Published to make it visible."
            : "⚠ No audio file — upload audio before publishing."}
        </div>

        {/* Audio Upload — native uploader, first section */}
        <FormSection title="Audio">
          {role.canUploadMedia ? (
            <AudioUploadPanel
              songId={song.id}
              songSlug={song.slug}
              currentUrl={form.audioUrl || undefined}
              currentAsset={primaryAudioAsset}
              onUploaded={handleAudioUploaded}
              onDelete={handleAudioDeleted}
            />
          ) : (
            <div className="border border-white/5 p-4 text-[11px] text-white/30">
              {form.audioUrl ? (
                <audio controls src={form.audioUrl} className="w-full h-8 opacity-60" />
              ) : (
                <p>No audio — your role ({role.roleLabel}) cannot manage media.</p>
              )}
            </div>
          )}

          {/* Manual URL override */}
          <div className="pt-2">
            <FormField
              type="url"
              label="Audio URL (manual override)"
              value={form.audioUrl}
              placeholder="https://…"
              mono
              hint="Overrides the uploaded file above"
              onChange={(v) => set("audioUrl", v)}
            />
          </div>
        </FormSection>

        {/* Song info */}
        <FormSection title="Song Info">
          <FormField
            type="text"
            label="Title"
            required
            value={form.title}
            onChange={(v) => set("title", v)}
          />
          {/* Slug is immutable after creation — changing it would break public URLs */}
          <div className="space-y-0">
            <p className="block text-[10px] tracking-[0.2em] uppercase text-white/30 mb-2">
              Slug <span className="text-white/15 normal-case tracking-normal ml-1">(read-only)</span>
            </p>
            <input
              type="text"
              readOnly
              value={form.slug}
              className="w-full bg-white/[0.02] border border-white/5 px-4 py-2.5 text-sm text-white/40 font-mono text-xs cursor-not-allowed"
            />
            <p className="mt-1.5 text-[10px] text-white/20">
              Used in URLs: /songs/[slug] — cannot be changed after creation.
            </p>
          </div>

          {/* Artist */}
          <div>
            <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-2">Artist</p>
            <select
              value={form.artistSlug}
              onChange={(e) => set("artistSlug", e.target.value)}
              className="w-full bg-transparent border border-white/10 px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-colors"
            >
              <option value="" className="bg-neutral-900">— Select artist —</option>
              {artists.map((a) => (
                <option key={a.id} value={a.slug} className="bg-neutral-900">
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Release */}
          <div>
            <p className="text-[10px] tracking-[0.15em] uppercase text-white/25 mb-2">
              Release <span className="text-white/15">(optional)</span>
            </p>
            <select
              value={form.releaseSlug}
              onChange={(e) => set("releaseSlug", e.target.value)}
              className="w-full bg-transparent border border-white/10 px-4 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none transition-colors"
            >
              <option value="" className="bg-neutral-900">— Standalone single —</option>
              {releases.map((r) => (
                <option key={r.id} value={r.slug} className="bg-neutral-900">
                  {r.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField
              type="text"
              label="Genre"
              value={form.genre}
              onChange={(v) => set("genre", v)}
            />
            <FormField
              type="text"
              label="Duration"
              value={form.duration}
              placeholder="e.g. 3:24"
              mono
              onChange={(v) => set("duration", v)}
            />
            <FormField
              type="number"
              label="Track #"
              value={form.trackNumber}
              onChange={(v) => set("trackNumber", v)}
            />
          </div>
        </FormSection>

        {/* Relations */}
        <FormSection title="Relations">
          <ProducerPicker
            attached={producerSlugs}
            allProducers={producers}
            onToggle={toggleProducer}
          />
        </FormSection>

        {/* Lyrics */}
        <FormSection title="Lyrics">
          <FormField
            type="textarea"
            label="Lyrics"
            rows={10}
            value={form.lyrics}
            placeholder="Paste or type lyrics here…"
            onChange={(v) => set("lyrics", v)}
          />
        </FormSection>

        {/* Publish */}
        <FormSection title="Publish Settings">
          <FormField
            type="select"
            label="Status"
            value={form.status}
            onChange={(v) => set("status", v as ReleaseStatus)}
            options={[
              { value: "draft", label: "Draft — not visible" },
              { value: "scheduled", label: "Scheduled" },
              { value: "published", label: "Published — live now" },
              { value: "archived", label: "Archived" },
            ]}
          />
          <div className="flex items-center gap-8">
            <FormField
              type="toggle"
              label="Visible"
              value={form.isVisible}
              onChange={(v) => set("isVisible", v)}
            />
            <FormField
              type="toggle"
              label="Explicit"
              value={form.isExplicit}
              onChange={(v) => set("isExplicit", v)}
            />
            <FormField
              type="toggle"
              label="Featured on Homepage"
              value={form.featuredOnHomepage}
              onChange={(v) => set("featuredOnHomepage", v)}
            />
          </div>
          <FormField
            type="datetime-local"
            label="Publish At"
            value={form.publishAt}
            hint="Required when status is Scheduled"
            onChange={(v) => set("publishAt", v)}
          />
        </FormSection>

        {/* DSP Links */}
        <FormSection title="DSP Links">
          <DSPLinksPanel value={dspLinks} onChange={setDspLinks} />
        </FormSection>

        {/* Actions */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
          <SaveButton onClick={handleSave} saving={saving} />
          <DangerButton onClick={handleDelete} label="Delete Song" disabled={!role.canDelete} />
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
