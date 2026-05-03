"use client"

import { useState, useTransition } from "react"
import { ThumbnailQueue }        from "@/components/admin/youtube/thumbnails/ThumbnailQueue"
import { ThumbnailCanvas }       from "@/components/admin/youtube/thumbnails/ThumbnailCanvas"
import { ThumbnailPromptPanel }  from "@/components/admin/youtube/thumbnails/ThumbnailPromptPanel"
import { ThumbnailVersionGrid }  from "@/components/admin/youtube/thumbnails/ThumbnailVersionGrid"
import { ThumbnailPresetPicker } from "@/components/admin/youtube/thumbnails/ThumbnailPresetPicker"
import { AudioPlayer }           from "@/components/admin/youtube/thumbnails/AudioPlayer"
import { VideoPreview }          from "@/components/admin/youtube/thumbnails/VideoPreview"
import { FreeCreatePanel }       from "@/components/admin/youtube/thumbnails/FreeCreatePanel"
import { PromptLibraryPanel }    from "@/components/admin/youtube/thumbnails/PromptLibraryPanel"
import {
  getOrCreateProject,
  getProjectVersions,
  getPresetsFromDb,
  getPromptsFromLibrary,
  getJobMediaAssets,
  saveProjectDraft,
  approveProject,
  skipThumbnail,
} from "@/lib/youtube/thumbnails/actions"
import { getPresetsForProducer } from "@/lib/youtube/thumbnails/presets"
import type {
  UploadJobForStudio,
  ThumbnailProject,
  ThumbnailVersion,
  ThumbnailPreset,
  ThumbnailPromptRow,
  CanvasConfig,
} from "@/lib/youtube/thumbnails/types"

const DEFAULT_CANVAS: CanvasConfig = {
  titleText:     "",
  titlePosition: "bottom-left",
  logoPosition:  "bottom-right",
  overlay:       "soft-black-gradient",
  fontSize:      52,
  textColor:     "#ffffff",
  strokeColor:   "#000000",
  shadowEnabled: true,
}

type StudioTab = "queue" | "free-create" | "prompt-library"

const STUDIO_TABS: Array<{ key: StudioTab; label: string }> = [
  { key: "queue",          label: "Job Queue" },
  { key: "free-create",    label: "Free Create" },
  { key: "prompt-library", label: "Prompt Library" },
]

interface Props {
  initialJobs:       UploadJobForStudio[]
  producers:         Array<{ slug: string; name: string }>
  generationEnabled: boolean
}

export function ThumbnailStudioClient({ initialJobs, producers, generationEnabled }: Props) {
  const [studioTab, setStudioTab] = useState<StudioTab>("queue")
  const [jobs, setJobs] = useState(initialJobs)

  // Job Queue state
  const [selectedJob, setSelectedJob]             = useState<UploadJobForStudio | null>(null)
  const [project, setProject]                     = useState<ThumbnailProject | null>(null)
  const [versions, setVersions]                   = useState<ThumbnailVersion[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [canvasConfig, setCanvasConfig]           = useState<CanvasConfig>(DEFAULT_CANVAS)
  const [presets, setPresets]                     = useState<ThumbnailPreset[]>([])
  const [savedPrompts, setSavedPrompts]           = useState<ThumbnailPromptRow[]>([])
  const [selectedPreset, setSelectedPreset]       = useState<ThumbnailPreset | null>(null)
  const [builtPrompt, setBuiltPrompt]             = useState("")
  const [audioUrl, setAudioUrl]                   = useState<string | null>(null)
  const [renderUrl, setRenderUrl]                 = useState<string | null>(null)
  const [loadingProject, setLoadingProject]       = useState(false)
  const [isPending, startTransition]              = useTransition()
  const [statusMsg, setStatusMsg]                 = useState<string | null>(null)
  const [error, setError]                         = useState<string | null>(null)

  // Cross-tab handoff: prompt injected into Free Create from Library
  const [freeCreateInitialPrompt, setFreeCreateInitialPrompt] = useState<string | undefined>()

  const selectedVersion = versions.find((v) => v.id === selectedVersionId) ?? null

  async function handleSelectJob(job: UploadJobForStudio) {
    setSelectedJob(job)
    setProject(null)
    setVersions([])
    setSelectedVersionId(null)
    setSelectedPreset(null)
    setBuiltPrompt("")
    setStatusMsg(null)
    setError(null)
    setAudioUrl(null)
    setRenderUrl(null)
    setLoadingProject(true)

    try {
      const [projectResult, dbPresets, libPrompts, mediaAssets] = await Promise.all([
        getOrCreateProject(job.id),
        getPresetsFromDb(job.producer_slug ?? ""),
        getPromptsFromLibrary(job.producer_slug ?? ""),
        getJobMediaAssets(job.id),
      ])

      if ("error" in projectResult) {
        setError(projectResult.error)
        return
      }

      const proj = projectResult
      setProject(proj)
      setAudioUrl(mediaAssets.audioUrl)
      setRenderUrl(mediaAssets.renderUrl)

      const localPresets = getPresetsForProducer(job.producer_slug ?? "")
      const merged = dbPresets.length > 0 ? dbPresets : localPresets
      setPresets(merged)
      setSavedPrompts(libPrompts)

      if (proj.canvas_json && Object.keys(proj.canvas_json).length > 0) {
        setCanvasConfig({ ...DEFAULT_CANVAS, ...(proj.canvas_json as CanvasConfig) })
      } else {
        setCanvasConfig({ ...DEFAULT_CANVAS, titleText: job.title ?? "" })
      }

      if (proj.preset_slug) {
        const ps = merged.find((p) => p.preset_slug === proj.preset_slug)
        if (ps) applyPreset(ps, false)
      }

      const vers = await getProjectVersions(proj.id)
      setVersions(vers)
      const sel = vers.find((v) => v.selected)
      if (sel) setSelectedVersionId(sel.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoadingProject(false)
    }
  }

  function applyPreset(preset: ThumbnailPreset, updateState = true) {
    const newConfig: CanvasConfig = {
      ...DEFAULT_CANVAS,
      ...preset.canvas_defaults,
      titleText: selectedJob?.title ?? "",
    }
    setCanvasConfig(newConfig)
    if (updateState) setSelectedPreset(preset)
  }

  function handlePresetSelect(preset: ThumbnailPreset) {
    setSelectedPreset(preset)
    applyPreset(preset)
  }

  function handleSaveDraft() {
    if (!project) return
    startTransition(async () => {
      const result = await saveProjectDraft(project.id, canvasConfig, selectedPreset?.preset_slug)
      if (result.error) {
        setError(result.error)
      } else {
        setStatusMsg("Draft saved")
        setTimeout(() => setStatusMsg(null), 2500)
      }
    })
  }

  function handleApprove() {
    if (!project || !selectedJob) return
    if (!selectedVersion) {
      setError("Select a version before approving")
      return
    }
    startTransition(async () => {
      const result = await approveProject(
        project.id,
        selectedVersion.id,
        selectedVersion.image_url,
        selectedJob.id,
        selectedJob.producer_slug,
        selectedJob.title,
        "generated",
        selectedVersion.prompt ?? undefined,
      )
      if (result.error) {
        setError(result.error)
      } else {
        setStatusMsg("✓ Approved — thumbnail will be used for render")
        setJobs((prev) =>
          prev.map((j) =>
            j.id === selectedJob.id
              ? { ...j, thumbnail_status: "approved", thumbnail_mode: "generated" }
              : j,
          ),
        )
        setTimeout(() => setStatusMsg(null), 4000)
      }
    })
  }

  function handleSkip() {
    if (!selectedJob) return
    startTransition(async () => {
      const result = await skipThumbnail(selectedJob.id)
      if (result.error) {
        setError(result.error)
      } else {
        setStatusMsg("Skipped — auto placeholder will be used")
        setJobs((prev) =>
          prev.map((j) =>
            j.id === selectedJob.id
              ? { ...j, thumbnail_status: "skipped", thumbnail_mode: "auto" }
              : j,
          ),
        )
        setTimeout(() => setStatusMsg(null), 3000)
      }
    })
  }

  // Cross-tab: use a library prompt in Job Mode
  function handleUseInJobMode(prompt: string) {
    setBuiltPrompt(prompt)
    setStudioTab("queue")
  }

  // Cross-tab: use a library prompt in Free Create
  function handleUseInFreeCreate(prompt: string) {
    setFreeCreateInitialPrompt(prompt)
    setStudioTab("free-create")
  }

  const hasJob = !!selectedJob && !loadingProject

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-[#0d1016] p-1">
        {STUDIO_TABS.map((tab) => (
          <button
            type="button"
            key={tab.key}
            onClick={() => setStudioTab(tab.key)}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[11px] font-medium transition-colors ${
              studioTab === tab.key
                ? "bg-white/[0.08] text-white"
                : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]"
            }`}
          >
            {tab.label}
          </button>
        ))}
        {!generationEnabled && (
          <span className="ml-auto text-[9px] font-mono text-white/20 px-3 py-2 hidden sm:block">
            AI generation: <span className="text-amber-400/50">OPENAI_API_KEY not set</span>
          </span>
        )}
      </div>

      {/* Free Create */}
      {studioTab === "free-create" && (
        <FreeCreatePanel
          producers={producers}
          generationEnabled={generationEnabled}
          initialPrompt={freeCreateInitialPrompt}
          onInitialPromptConsumed={() => setFreeCreateInitialPrompt(undefined)}
        />
      )}

      {/* Prompt Library */}
      {studioTab === "prompt-library" && (
        <PromptLibraryPanel
          producers={producers}
          onUseInJobMode={handleUseInJobMode}
          onUseInFreeCreate={handleUseInFreeCreate}
        />
      )}

      {/* Job Queue */}
      {studioTab === "queue" && (
        <div className="flex h-[calc(100vh-12rem)] gap-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#08090d]">

          {/* Left panel: Queue */}
          <div className="w-56 shrink-0 flex flex-col border-r border-white/[0.06]">
            <div className="px-4 py-3 border-b border-white/[0.06] shrink-0">
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30">
                Jobs ({jobs.length})
              </p>
            </div>
            <ThumbnailQueue
              jobs={jobs}
              selectedJobId={selectedJob?.id ?? null}
              onSelect={handleSelectJob}
            />
          </div>

          {/* Center panel: Audio → Video → Canvas */}
          <div className="flex-1 min-w-0 flex flex-col border-r border-white/[0.06] overflow-y-auto">
            {loadingProject ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-white/30 text-sm">Loading project…</p>
              </div>
            ) : !selectedJob ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-white/20 text-sm">Select a job from the queue</p>
                  <p className="text-white/10 text-xs mt-1">to open the thumbnail studio</p>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold">{selectedJob.title ?? "Untitled"}</h2>
                  <p className="text-xs text-white/35 mt-0.5">
                    {selectedJob.producer_slug ?? "No producer"} · {selectedJob.status}
                    {selectedJob.thumbnail_status === "approved" && (
                      <span className="ml-2 text-emerald-400/70">● approved</span>
                    )}
                    {selectedJob.thumbnail_status === "skipped" && (
                      <span className="ml-2 text-white/30">● skipped</span>
                    )}
                  </p>
                </div>

                {audioUrl && <AudioPlayer url={audioUrl} />}
                {renderUrl && <VideoPreview url={renderUrl} />}

                {error && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400 flex items-start justify-between gap-2">
                    <span>{error}</span>
                    <button type="button" onClick={() => setError(null)} className="shrink-0 text-red-400/60 hover:text-red-400">×</button>
                  </div>
                )}
                {statusMsg && (
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-400">
                    {statusMsg}
                  </div>
                )}

                {project && (
                  <ThumbnailCanvas
                    config={canvasConfig}
                    selectedImageUrl={selectedVersion?.image_url}
                    preset={selectedPreset}
                    onChange={setCanvasConfig}
                  />
                )}
              </div>
            )}
          </div>

          {/* Right panel: Presets → Prompt → Versions → Actions */}
          <div className="w-72 shrink-0 flex flex-col overflow-y-auto">
            {hasJob && project ? (
              <div className="p-4 space-y-5">

                {presets.length > 0 && (
                  <>
                    <ThumbnailPresetPicker
                      presets={presets}
                      selectedSlug={selectedPreset?.preset_slug ?? null}
                      onSelect={handlePresetSelect}
                    />
                    <div className="border-t border-white/[0.06]" />
                  </>
                )}

                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 mb-3">
                    Prompt Builder
                  </p>
                  <ThumbnailPromptPanel
                    producerSlug={selectedJob.producer_slug ?? "nightwire"}
                    jobTitle={selectedJob.title}
                    preset={selectedPreset}
                    savedPrompts={savedPrompts}
                    projectId={project.id}
                    initialPrompt={builtPrompt || undefined}
                    onPromptBuilt={setBuiltPrompt}
                  />
                </div>

                <div className="border-t border-white/[0.06]" />

                <ThumbnailVersionGrid
                  projectId={project.id}
                  versions={versions}
                  selectedVersionId={selectedVersionId}
                  builtPrompt={builtPrompt}
                  generationEnabled={generationEnabled}
                  producerSlug={selectedJob.producer_slug ?? undefined}
                  onVersionsChange={setVersions}
                  onVersionSelect={(v) => setSelectedVersionId(v.id)}
                />

                <div className="border-t border-white/[0.06]" />

                {/* Action buttons */}
                <div className="flex gap-2 pb-2">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isPending}
                    className="flex-1 py-2.5 rounded-xl border border-white/[0.1] text-xs text-white/60 hover:text-white hover:border-white/20 disabled:opacity-40 transition-colors"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isPending || !selectedVersionId}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 disabled:opacity-40 text-xs font-medium transition-colors"
                  >
                    {isPending ? "Approving…" : "Approve →"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={isPending}
                    className="px-4 py-2.5 rounded-xl border border-white/[0.06] text-xs text-white/25 hover:text-white/50 disabled:opacity-40 transition-colors"
                    title="Use auto-generated placeholder instead"
                  >
                    Skip
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6">
                <p className="text-white/15 text-xs text-center">
                  Select a job to see prompts and versions
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
