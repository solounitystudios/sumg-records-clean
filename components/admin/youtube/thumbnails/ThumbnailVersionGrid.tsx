"use client"

import { useState, useTransition, useEffect } from "react"
import { generateThumbnailImages } from "@/app/actions/generateThumbnailImage"

function isValidHttpImageUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}
import type { ThumbnailVersion } from "@/lib/youtube/thumbnails/types"
import {
  addVersionByUrl,
  selectVersion,
  rejectVersion,
  getImageAssetsForPicker,
  createMidjourneyPendingAsset,
  completeMidjourneyAsset,
  getMidjourneyJobStatus,
} from "@/lib/youtube/thumbnails/actions"

interface Props {
  projectId:         string
  versions:          ThumbnailVersion[]
  selectedVersionId: string | null
  builtPrompt?:      string
  generationEnabled: boolean
  producerSlug?:     string
  onVersionsChange:  (versions: ThumbnailVersion[]) => void
  onVersionSelect:   (version: ThumbnailVersion) => void
}

type AddMode = "url" | "assets" | "generate"

export function ThumbnailVersionGrid({
  projectId,
  versions,
  selectedVersionId,
  builtPrompt,
  generationEnabled,
  producerSlug,
  onVersionsChange,
  onVersionSelect,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [addUrl, setAddUrl]           = useState("")
  const [addPrompt, setAddPrompt]     = useState("")
  const [adding, setAdding]           = useState(false)
  const [generating, setGenerating]   = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addMode, setAddMode]         = useState<AddMode>("url")
  const [imageAssets, setImageAssets] = useState<Array<{ id: string; url: string; filename: string }>>([])
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [urlError, setUrlError]       = useState<string | null>(null)
  const [genError, setGenError]       = useState<string | null>(null)
  const [genPrompt, setGenPrompt]     = useState(builtPrompt ?? "")
  const [genCount, setGenCount]       = useState<1 | 2 | 4>(2)
  const [genProvider, setGenProvider] = useState<"openai" | "midjourney">("openai")

  // Midjourney queue state within this panel
  const [mjSending,    setMjSending]    = useState(false)
  const [mjPendingId,  setMjPendingId]  = useState<string | null>(null)
  const [mjError,      setMjError]      = useState<string | null>(null)
  const [mjUrlInput,   setMjUrlInput]   = useState("")
  const [mjUrlWarn,    setMjUrlWarn]    = useState<string | null>(null)
  const [mjCompleting, setMjCompleting] = useState(false)
  const [mjCopied,     setMjCopied]     = useState(false)

  // Keep genPrompt in sync when builtPrompt changes from parent
  const [lastBuiltPrompt, setLastBuiltPrompt] = useState(builtPrompt)
  if (builtPrompt !== lastBuiltPrompt) {
    setLastBuiltPrompt(builtPrompt)
    if (builtPrompt) setGenPrompt(builtPrompt)
  }

  // Poll for external Midjourney completion when mjPendingId is set
  useEffect(() => {
    if (!mjPendingId) return
    const timer = setInterval(async () => {
      try {
        const status = await getMidjourneyJobStatus(mjPendingId, projectId)
        if (status.status === "complete" && status.imageUrl) {
          const newVer: ThumbnailVersion = {
            id:             status.versionId ?? `mj-ext-${Date.now()}`,
            project_id:     projectId,
            asset_id:       status.assetId,
            image_url:      status.imageUrl,
            prompt:         genPrompt.trim(),
            provider:       "midjourney",
            style_bucket:   null,
            version_number: versions.length + 1,
            selected:       false,
            rejected:       false,
            ctr_score:      null,
            notes:          null,
            created_at:     new Date().toISOString(),
          }
          onVersionsChange([...versions, newVer])
          onVersionSelect(newVer)
          setMjPendingId(null)
          setShowAddForm(false)
        } else if (status.status === "failed") {
          setMjError("Midjourney job failed")
          setMjPendingId(null)
        }
      } catch { /* ignore poll errors */ }
    }, 5000)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mjPendingId, projectId, versions, genPrompt, onVersionsChange, onVersionSelect])

  function handleSelect(v: ThumbnailVersion) {
    startTransition(async () => {
      await selectVersion(projectId, v.id)
      onVersionSelect(v)
      onVersionsChange(versions.map((ver) => ({ ...ver, selected: ver.id === v.id })))
    })
  }

  function handleReject(v: ThumbnailVersion) {
    startTransition(async () => {
      await rejectVersion(v.id)
      onVersionsChange(versions.map((ver) =>
        ver.id === v.id ? { ...ver, rejected: true, selected: false } : ver,
      ))
    })
  }

  async function handleAddByUrl() {
    if (!addUrl.trim()) return
    if (!isValidHttpImageUrl(addUrl.trim())) {
      setUrlError("This looks like a prompt, not an image URL. Paste a direct image link (https://…).")
      return
    }
    setUrlError(null)
    setAdding(true)
    const result = await addVersionByUrl(projectId, addUrl.trim(), addPrompt.trim() || undefined)
    setAdding(false)
    if ("error" in result) {
      setUrlError(result.error)
      return
    }
    const newVer: ThumbnailVersion = {
      id:             result.id,
      project_id:     projectId,
      asset_id:       null,
      image_url:      addUrl.trim(),
      prompt:         addPrompt.trim() || null,
      provider:       "external",
      style_bucket:   null,
      version_number: versions.length + 1,
      selected:       false,
      rejected:       false,
      ctr_score:      null,
      notes:          null,
      created_at:     new Date().toISOString(),
    }
    onVersionsChange([...versions, newVer])
    setAddUrl("")
    setAddPrompt("")
    setShowAddForm(false)
  }

  async function handlePickAsset(asset: { id: string; url: string; filename: string }) {
    setAdding(true)
    const result = await addVersionByUrl(projectId, asset.url, `Asset: ${asset.filename}`)
    setAdding(false)
    if ("error" in result) {
      alert(result.error)
      return
    }
    const newVer: ThumbnailVersion = {
      id:             result.id,
      project_id:     projectId,
      asset_id:       asset.id,
      image_url:      asset.url,
      prompt:         `Asset: ${asset.filename}`,
      provider:       "assets",
      style_bucket:   null,
      version_number: versions.length + 1,
      selected:       false,
      rejected:       false,
      ctr_score:      null,
      notes:          null,
      created_at:     new Date().toISOString(),
    }
    onVersionsChange([...versions, newVer])
    setShowAddForm(false)
  }

  async function handleSwitchToAssets() {
    setAddMode("assets")
    if (imageAssets.length === 0) {
      setLoadingAssets(true)
      const assets = await getImageAssetsForPicker()
      setImageAssets(assets)
      setLoadingAssets(false)
    }
  }

  async function handleSendToMjQueue() {
    if (!genPrompt.trim()) { setMjError("Enter a prompt first."); return }
    setMjSending(true); setMjError(null)
    const result = await createMidjourneyPendingAsset({
      producerSlug: producerSlug ?? "",
      prompt:       genPrompt.trim(),
      linkedUploadJobId: undefined,
    })
    setMjSending(false)
    if ("error" in result) { setMjError(result.error); return }
    setMjPendingId(result.id)
  }

  async function handleMjComplete() {
    const url = mjUrlInput.trim()
    if (!url || !mjPendingId) return
    if (!isValidHttpImageUrl(url)) { setMjUrlWarn("Paste a direct image URL, not a prompt."); return }
    setMjUrlWarn(null); setMjCompleting(true)
    const result = await completeMidjourneyAsset({
      id:           mjPendingId,
      imageUrl:     url,
      producerSlug: producerSlug,
      projectId,
    })
    setMjCompleting(false)
    if ("error" in result) { setMjError(result.error); return }
    const newVer: ThumbnailVersion = {
      id:             result.versionId ?? `mj-${Date.now()}`,
      project_id:     projectId,
      asset_id:       result.assetId,
      image_url:      result.permanentUrl,
      prompt:         genPrompt.trim(),
      provider:       "midjourney",
      style_bucket:   null,
      version_number: versions.length + 1,
      selected:       false,
      rejected:       false,
      ctr_score:      null,
      notes:          null,
      created_at:     new Date().toISOString(),
    }
    onVersionsChange([...versions, newVer])
    onVersionSelect(newVer)
    setMjPendingId(null); setMjUrlInput(""); setShowAddForm(false)
  }

  async function handleGenerate() {
    if (!genPrompt.trim()) {
      setGenError("Enter or build a prompt first.")
      return
    }
    setGenError(null)
    setGenerating(true)

    const result = await generateThumbnailImages({
      prompt:      genPrompt.trim(),
      count:       genCount,
      producerSlug,
      projectId,
    })

    setGenerating(false)

    if ("error" in result) {
      setGenError(result.error)
      return
    }

    const newVersions: ThumbnailVersion[] = result.images.map((img, i) => ({
      id:             img.versionId ?? `${Date.now()}-${i}`,
      project_id:     projectId,
      asset_id:       img.assetId,
      image_url:      img.imageUrl,
      prompt:         img.revisedPrompt ?? genPrompt.trim(),
      provider:       "openai",
      style_bucket:   null,
      version_number: versions.length + 1 + i,
      selected:       false,
      rejected:       false,
      ctr_score:      null,
      notes:          null,
      created_at:     new Date().toISOString(),
    }))

    onVersionsChange([...versions, ...newVersions])
    // Auto-preview the first generated image in the canvas
    if (newVersions.length > 0) onVersionSelect(newVersions[0])
    setShowAddForm(false)
  }

  const active   = versions.filter((v) => !v.rejected)
  const rejected = versions.filter((v) => v.rejected)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">
          Versions {active.length > 0 && `(${active.length})`}
        </p>
        <button
          type="button"
          onClick={() => { setShowAddForm((p) => !p); setAddMode("url"); setUrlError(null); setGenError(null) }}
          className="text-[10px] text-violet-400/70 hover:text-violet-400 transition"
        >
          {showAddForm ? "× Cancel" : "+ Add"}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-3 space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
          {/* Mode tabs */}
          <div className="flex gap-1 mb-2">
            <button
              type="button"
              onClick={() => setAddMode("url")}
              className={`flex-1 py-1 rounded-lg text-[10px] transition-colors ${addMode === "url" ? "bg-violet-600/40 text-white" : "text-white/40 hover:text-white/60"}`}
            >
              Paste URL
            </button>
            <button
              type="button"
              onClick={handleSwitchToAssets}
              className={`flex-1 py-1 rounded-lg text-[10px] transition-colors ${addMode === "assets" ? "bg-violet-600/40 text-white" : "text-white/40 hover:text-white/60"}`}
            >
              From Assets
            </button>
            <button
              type="button"
              onClick={() => setAddMode("generate")}
              className={`flex-1 py-1 rounded-lg text-[10px] transition-colors ${addMode === "generate" ? "bg-violet-600/40 text-white" : "text-white/40 hover:text-white/60"}`}
            >
              Generate
            </button>
          </div>

          {/* URL mode */}
          {addMode === "url" && (
            <>
              <input
                type="text"
                placeholder="Paste final image URL — not the prompt text"
                value={addUrl}
                onChange={(e) => { setAddUrl(e.target.value); setUrlError(null) }}
                onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault() }}
                className={`w-full bg-black/30 border rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none transition-colors ${urlError ? "border-amber-500/50" : "border-white/[0.08] focus:border-violet-500/50"}`}
              />
              {urlError && (
                <p className="text-[10px] text-amber-300/75 leading-snug">{urlError}</p>
              )}
              <input
                type="text"
                placeholder="Prompt used to generate this image (optional)"
                value={addPrompt}
                onChange={(e) => setAddPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault() }}
                className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50"
              />
              <button
                type="button"
                onClick={handleAddByUrl}
                disabled={adding || !addUrl.trim()}
                className="w-full py-2 rounded-lg bg-violet-600/80 hover:bg-violet-600 disabled:opacity-40 text-xs font-medium transition"
              >
                {adding ? "Adding…" : "Add Version"}
              </button>
            </>
          )}

          {/* Assets mode */}
          {addMode === "assets" && (
            <>
              {loadingAssets ? (
                <p className="text-[10px] text-white/30 text-center py-3">Loading assets…</p>
              ) : imageAssets.length === 0 ? (
                <p className="text-[10px] text-white/30 text-center py-3">No uploaded images found</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                  {imageAssets.map((asset) => (
                    <button
                      type="button"
                      key={asset.id}
                      onClick={() => handlePickAsset(asset)}
                      disabled={adding}
                      title={asset.filename}
                      className="aspect-square rounded-lg overflow-hidden border border-white/[0.08] hover:border-violet-500/50 transition-colors disabled:opacity-40"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.url} alt={asset.filename} className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Generate mode */}
          {addMode === "generate" && (
            <div className="space-y-2">
              {/* Provider toggle */}
              <div className="flex gap-1 rounded-lg border border-white/[0.07] bg-black/20 p-0.5">
                <button
                  type="button"
                  onClick={() => { setGenProvider("openai"); setMjPendingId(null); setMjError(null) }}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-medium transition-colors ${genProvider === "openai" ? "bg-violet-600/50 text-white" : "text-white/35 hover:text-white/60"}`}
                >
                  ⚡ OpenAI
                </button>
                <button
                  type="button"
                  onClick={() => { setGenProvider("midjourney"); setGenError(null) }}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-medium transition-colors ${genProvider === "midjourney" ? "bg-sky-600/40 text-sky-200" : "text-white/35 hover:text-white/60"}`}
                >
                  ✦ Midjourney
                </button>
              </div>

              <textarea
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
                rows={4}
                placeholder="Paste or edit your prompt…"
                className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50 resize-none font-mono leading-relaxed"
              />

              {/* OpenAI controls */}
              {genProvider === "openai" && (
                <>
                  <div className="flex items-center gap-2">
                    <label className="text-[9px] text-white/30 uppercase tracking-[0.15em]">Count</label>
                    {([1, 2, 4] as const).map((n) => (
                      <button
                        type="button"
                        key={n}
                        onClick={() => setGenCount(n)}
                        className={`w-7 h-7 rounded-lg text-[11px] font-mono transition-colors ${genCount === n ? "bg-violet-600/60 text-white" : "text-white/35 border border-white/[0.08] hover:text-white/60"}`}
                      >
                        {n}
                      </button>
                    ))}
                    <span className="text-[9px] text-white/20 ml-1">image{genCount !== 1 ? "s" : ""} · DALL-E 3</span>
                  </div>
                  {genError && <p className="text-[10px] text-red-400/70 leading-snug">{genError}</p>}
                  {!generationEnabled && (
                    <p className="text-[9px] text-amber-400/50 text-center">Add OPENAI_API_KEY to enable</p>
                  )}
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating || !genPrompt.trim() || !generationEnabled}
                    className="w-full py-2.5 rounded-lg bg-violet-600/80 hover:bg-violet-600 disabled:opacity-40 text-xs font-medium transition"
                  >
                    {generating
                      ? `Generating ${genCount} version${genCount !== 1 ? "s" : ""}…`
                      : `Generate ${genCount} version${genCount !== 1 ? "s" : ""} →`
                    }
                  </button>
                  <p className="text-[9px] text-white/20 text-center">Generated images are saved to Assets and added as versions.</p>
                </>
              )}

              {/* Midjourney controls */}
              {genProvider === "midjourney" && (
                <>
                  {!mjPendingId && !mjSending && (
                    <>
                      <p className="text-[9px] text-white/30 leading-relaxed">
                        Midjourney works in 2 steps — we queue the prompt, you generate in Discord, paste the URL back.
                      </p>
                      {mjError && <p className="text-[10px] text-red-400/70 leading-snug">{mjError}</p>}
                      <button
                        type="button"
                        onClick={handleSendToMjQueue}
                        disabled={!genPrompt.trim()}
                        className="w-full py-2.5 rounded-lg bg-sky-600/60 hover:bg-sky-600/80 disabled:opacity-40 text-xs font-medium transition border border-sky-500/30"
                      >
                        Generate with Midjourney →
                      </button>
                    </>
                  )}

                  {mjSending && (
                    <div className="flex items-center gap-2 py-2">
                      <svg className="w-3.5 h-3.5 text-sky-400 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-[10px] text-sky-300/70">Creating Midjourney job…</span>
                    </div>
                  )}

                  {mjPendingId && (
                    <div className="space-y-2 rounded-lg border border-sky-500/20 bg-sky-500/[0.04] p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-[9px] text-sky-300/60 uppercase tracking-[0.15em]">Queued — generating in Midjourney</span>
                      </div>

                      <div className="bg-black/30 rounded-md px-2.5 py-2">
                        <p className="text-[10px] text-white/45 font-mono leading-relaxed line-clamp-4 break-words">{genPrompt}</p>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(genPrompt)
                          setMjCopied(true)
                          setTimeout(() => setMjCopied(false), 2000)
                        }}
                        className="w-full py-1.5 rounded-md border border-sky-500/25 bg-sky-600/10 text-[10px] text-sky-300 hover:bg-sky-600/20 transition"
                      >
                        {mjCopied ? "Copy Prompt ✓" : "Copy Prompt"}
                      </button>

                      <p className="text-[9px] text-white/25 leading-snug">
                        Step 1: Copy prompt → Generate in Midjourney → Step 2: Paste URL below
                      </p>

                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={mjUrlInput}
                          onChange={(e) => { setMjUrlInput(e.target.value); setMjUrlWarn(null) }}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleMjComplete() } }}
                          placeholder="Paste finished image URL…"
                          className={`flex-1 bg-black/30 border rounded-md px-2.5 py-1.5 text-[11px] text-white placeholder:text-white/20 focus:outline-none transition-colors ${mjUrlWarn ? "border-amber-500/50" : "border-white/[0.08] focus:border-sky-500/50"}`}
                        />
                        <button
                          type="button"
                          onClick={handleMjComplete}
                          disabled={mjCompleting || !mjUrlInput.trim()}
                          className="px-3 py-1.5 rounded-md bg-sky-600/60 hover:bg-sky-600/80 text-[11px] text-white disabled:opacity-40 transition whitespace-nowrap"
                        >
                          {mjCompleting ? "…" : "Done"}
                        </button>
                      </div>

                      {mjUrlWarn && <p className="text-[9px] text-amber-300/70">{mjUrlWarn}</p>}
                      {mjError && <p className="text-[9px] text-red-400/70">{mjError}</p>}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {active.length === 0 && !showAddForm && (
        <p className="text-center text-white/20 text-xs py-4">
          No versions yet. Click + Add to begin.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {active.map((v) => {
          const isSelected = v.id === selectedVersionId
          return (
            <div
              key={v.id}
              className={`relative rounded-lg overflow-hidden border transition-colors duration-150 cursor-pointer group ${
                isSelected
                  ? "border-violet-500/70 ring-1 ring-violet-500/30"
                  : "border-white/[0.08] hover:border-white/20"
              }`}
              onClick={() => handleSelect(v)}
            >
              <div className="aspect-video bg-[#0d1016]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={v.image_url} alt={`Version ${v.version_number}`} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-white/50 font-mono">v{v.version_number}</span>
                  <div className="flex items-center gap-1.5">
                    {v.provider === "openai" && <span className="text-[8px] text-violet-400/60 font-mono">AI</span>}
                    {isSelected && <span className="text-[9px] text-violet-400 font-medium">selected</span>}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleReject(v) }}
                disabled={isPending}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full bg-red-500/80 flex items-center justify-center text-white text-[10px] hover:bg-red-500"
                title="Reject this version"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>

      {rejected.length > 0 && (
        <p className="text-[10px] text-white/20 text-center mt-3">
          {rejected.length} rejected version{rejected.length !== 1 ? "s" : ""} hidden
        </p>
      )}
    </div>
  )
}
