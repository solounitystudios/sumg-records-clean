"use client"

import { useState, useTransition } from "react"
import type { ThumbnailVersion } from "@/lib/youtube/thumbnails/types"
import {
  addVersionByUrl,
  selectVersion,
  rejectVersion,
  getImageAssetsForPicker,
} from "@/lib/youtube/thumbnails/actions"

interface Props {
  projectId: string
  versions: ThumbnailVersion[]
  selectedVersionId: string | null
  onVersionsChange: (versions: ThumbnailVersion[]) => void
  onVersionSelect: (version: ThumbnailVersion) => void
}

type AddMode = "url" | "assets"

export function ThumbnailVersionGrid({
  projectId,
  versions,
  selectedVersionId,
  onVersionsChange,
  onVersionSelect,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [addUrl, setAddUrl]     = useState("")
  const [addPrompt, setAddPrompt] = useState("")
  const [adding, setAdding]     = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addMode, setAddMode]   = useState<AddMode>("url")
  const [imageAssets, setImageAssets] = useState<Array<{ id: string; url: string; filename: string }>>([])
  const [loadingAssets, setLoadingAssets] = useState(false)

  function handleSelect(v: ThumbnailVersion) {
    startTransition(async () => {
      await selectVersion(projectId, v.id)
      onVersionSelect(v)
      const updated = versions.map((ver) => ({
        ...ver,
        selected: ver.id === v.id,
      }))
      onVersionsChange(updated)
    })
  }

  function handleReject(v: ThumbnailVersion) {
    startTransition(async () => {
      await rejectVersion(v.id)
      const updated = versions.map((ver) =>
        ver.id === v.id ? { ...ver, rejected: true, selected: false } : ver,
      )
      onVersionsChange(updated)
    })
  }

  async function handleAddByUrl() {
    if (!addUrl.trim()) return
    setAdding(true)
    const result = await addVersionByUrl(projectId, addUrl.trim(), addPrompt.trim() || undefined)
    setAdding(false)
    if ("error" in result) {
      alert(result.error)
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

  const active   = versions.filter((v) => !v.rejected)
  const rejected = versions.filter((v) => v.rejected)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] uppercase tracking-[0.18em] text-white/30">Versions</p>
        <button
          type="button"
          onClick={() => { setShowAddForm((p) => !p); setAddMode("url") }}
          className="text-[10px] text-violet-400/70 hover:text-violet-400 transition"
        >
          + Add
        </button>
      </div>

      {showAddForm && (
        <div className="mb-3 space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
          {/* Mode tabs */}
          <div className="flex gap-1 mb-1">
            <button
              type="button"
              onClick={() => setAddMode("url")}
              className={`flex-1 py-1 rounded-lg text-[10px] transition-colors ${
                addMode === "url"
                  ? "bg-violet-600/40 text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              Paste URL
            </button>
            <button
              type="button"
              onClick={handleSwitchToAssets}
              className={`flex-1 py-1 rounded-lg text-[10px] transition-colors ${
                addMode === "assets"
                  ? "bg-violet-600/40 text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              From Assets
            </button>
          </div>

          {addMode === "url" && (
            <>
              <input
                type="url"
                placeholder="Image URL (Midjourney, external…)"
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
                className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50"
              />
              <input
                type="text"
                placeholder="Prompt used (optional)"
                value={addPrompt}
                onChange={(e) => setAddPrompt(e.target.value)}
                className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/50"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddByUrl}
                  disabled={adding || !addUrl.trim()}
                  className="flex-1 py-1.5 rounded-lg bg-violet-600/80 hover:bg-violet-600 disabled:opacity-40 text-xs font-medium transition"
                >
                  {adding ? "Adding…" : "Add Version"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-white/40 hover:text-white/60 text-xs transition"
                >
                  Cancel
                </button>
              </div>
            </>
          )}

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
                      <img
                        src={asset.url}
                        alt={asset.filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="w-full py-1.5 rounded-lg border border-white/[0.08] text-white/40 hover:text-white/60 text-xs transition"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      {active.length === 0 && (
        <p className="text-center text-white/25 text-xs py-4">
          No versions yet. Add an image URL to begin.
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
                <img
                  src={v.image_url}
                  alt={`Version ${v.version_number}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-white/50">v{v.version_number}</span>
                  {isSelected && (
                    <span className="text-[9px] text-violet-400 font-medium">selected</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleReject(v)
                }}
                disabled={isPending}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full bg-red-500/80 flex items-center justify-center text-white text-[10px] hover:bg-red-500"
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
