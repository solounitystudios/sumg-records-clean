"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import Link from "next/link"
import { ThumbnailCanvas }       from "@/components/admin/youtube/thumbnails/ThumbnailCanvas"
import { ThumbnailVersionGrid }  from "@/components/admin/youtube/thumbnails/ThumbnailVersionGrid"
import { buildThumbnailPrompt }  from "@/lib/youtube/thumbnails/prompts"
import { generateThumbnailImages } from "@/app/actions/generateThumbnailImage"
import {
  getOrCreateProject,
  getProjectVersions,
  getPresetsFromDb,
  saveProjectDraft,
  approveProject,
  skipThumbnail,
  createMidjourneyPendingAsset,
  getMidjourneyJobStatus,
  savePromptToLibrary,
} from "@/lib/youtube/thumbnails/actions"
import { getPresetsForProducer } from "@/lib/youtube/thumbnails/presets"
import type {
  UploadJobForStudio,
  ThumbnailProject,
  ThumbnailVersion,
  ThumbnailPreset,
  CanvasConfig,
} from "@/lib/youtube/thumbnails/types"

// ─── Constants ────────────────────────────────────────────────────────────────

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

const STYLE_BUCKETS = [
  "MindLoft Sessions",
  "Buffalo Noir",
  "Jazz Smoke",
  "Harlem Private Society",
  "Museum Nights",
  "Street Prestige",
]

const CAMERA_STYLES = [
  "disposable flash camera",
  "35mm film grain",
  "VHS camcorder",
  "Arri Alexa cinematic",
  "magazine editorial flash",
  "paparazzi zoom lens",
  "CCTV security camera",
  "macro close-up",
]

const MOODS = [
  "mysterious and culturally elite",
  "dangerous calm",
  "jazz psychedelic elegance",
  "private culture and rare access",
  "nostalgic and emotionally rich",
  "cinematic loneliness",
  "stylish creative chaos",
]

const SCENE_TYPES = [
  "private Harlem loft",
  "Buffalo Route 33 at night",
  "museum hallway after hours",
  "luxury townhouse kitchen",
  "jazz club after closing time",
  "Buffalo rooftop at sunset",
  "underground parking garage",
  "corner store at midnight",
]

const STATUS_PILL: Record<string, string> = {
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  skipped:  "border-white/[0.08] bg-white/[0.02] text-white/30",
  pending:  "border-amber-500/25 bg-amber-500/[0.06] text-amber-400/70",
  draft:    "border-violet-500/25 bg-violet-500/[0.06] text-violet-400/70",
}

const STATUS_DOT: Record<string, string> = {
  approved: "bg-emerald-400",
  skipped:  "bg-white/25",
  pending:  "bg-amber-400",
  draft:    "bg-violet-400",
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Toast { msg: string; type: "success" | "error" }

interface Props {
  initialJobs:       UploadJobForStudio[]
  producers:         Array<{ slug: string; name: string }>
  generationEnabled: boolean
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ThumbnailStudioClient({ initialJobs, producers, generationEnabled }: Props) {
  const [jobs, setJobs] = useState(initialJobs)

  // Job selection
  const [selectedJob, setSelectedJob]         = useState<UploadJobForStudio | null>(null)
  const [jobDropdownOpen, setJobDropdownOpen] = useState(false)
  const jobDropdownRef = useRef<HTMLDivElement>(null)

  // Project & versions
  const [project, setProject]                     = useState<ThumbnailProject | null>(null)
  const [versions, setVersions]                   = useState<ThumbnailVersion[]>([])
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [loadingProject, setLoadingProject]       = useState(false)

  // Canvas
  const [canvasConfig, setCanvasConfig]     = useState<CanvasConfig>(DEFAULT_CANVAS)
  const [presets, setPresets]               = useState<ThumbnailPreset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<ThumbnailPreset | null>(null)

  // Prompt building
  const [rawIdea,          setRawIdea]          = useState("")
  const [mood,             setMood]             = useState("")
  const [scene,            setScene]            = useState("")
  const [camera,           setCamera]           = useState("")
  const [styleBucket,      setStyleBucket]      = useState("")
  const [selectedPresetSlug, setSelectedPresetSlug] = useState("")
  const [showRefiners,     setShowRefiners]     = useState(false)
  const [builtPrompt,      setBuiltPrompt]      = useState("")
  const [quickPrompt,      setQuickPrompt]      = useState("")
  const [showPrompt,       setShowPrompt]       = useState(false)
  const [promptSaved,      setPromptSaved]      = useState(false)

  // Tracks which prompt was sent to Midjourney (captured at submit time)
  const mjPromptRef = useRef("")

  // Generation — OpenAI
  const [genCount,    setGenCount]    = useState<1 | 2 | 4>(2)
  const [generating,  setGenerating]  = useState(false)
  const [genError,    setGenError]    = useState<string | null>(null)

  // Generation — Midjourney
  const [mjSending,   setMjSending]   = useState(false)
  const [mjPendingId, setMjPendingId] = useState<string | null>(null)
  const [mjError,     setMjError]     = useState<string | null>(null)

  // Actions
  const [isPending, startTransition] = useTransition()

  // UI
  const [toast,      setToast]      = useState<Toast | null>(null)
  const [showInputs, setShowInputs] = useState(false)

  const selectedVersion  = versions.find((v) => v.id === selectedVersionId) ?? null
  const currentThumbStatus = selectedJob
    ? (jobs.find((j) => j.id === selectedJob.id)?.thumbnail_status ?? "pending")
    : null
  const effectivePrompt  = quickPrompt.trim() || builtPrompt.trim()
  const hasNoPrompt      = !effectivePrompt
  const isGeneratingAny  = generating || mjSending || !!mjPendingId

  // ── Auto-dismiss toast ───────────────────────────────────────────────────

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // ── Close job dropdown on outside click ──────────────────────────────────

  useEffect(() => {
    if (!jobDropdownOpen) return
    function handle(e: MouseEvent) {
      if (jobDropdownRef.current && !jobDropdownRef.current.contains(e.target as Node)) {
        setJobDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [jobDropdownOpen])

  // ── Midjourney polling ───────────────────────────────────────────────────

  useEffect(() => {
    if (!mjPendingId || !project) return
    const timer = setInterval(async () => {
      try {
        const status = await getMidjourneyJobStatus(mjPendingId, project.id)
        if (status.status === "complete" && status.imageUrl) {
          const newVer: ThumbnailVersion = {
            id:             status.versionId ?? `mj-${Date.now()}`,
            project_id:     project.id,
            asset_id:       status.assetId,
            image_url:      status.imageUrl,
            prompt:         mjPromptRef.current,
            provider:       "midjourney",
            style_bucket:   null,
            version_number: versions.length + 1,
            selected:       false,
            rejected:       false,
            ctr_score:      null,
            notes:          null,
            created_at:     new Date().toISOString(),
          }
          setVersions((prev) => [...prev, newVer])
          setSelectedVersionId(newVer.id)
          setMjPendingId(null)
          setToast({ msg: "Midjourney image ready", type: "success" })
        } else if (status.status === "failed") {
          setMjError("Generation failed — check Midjourney queue")
          setMjPendingId(null)
        }
      } catch { /* ignore transient poll errors */ }
    }, 5000)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mjPendingId, project?.id])

  // ── Job selection ────────────────────────────────────────────────────────

  async function handleSelectJob(job: UploadJobForStudio) {
    setSelectedJob(job)
    setJobDropdownOpen(false)
    setProject(null)
    setVersions([])
    setSelectedVersionId(null)
    setSelectedPreset(null)
    setSelectedPresetSlug("")
    setBuiltPrompt("")
    setQuickPrompt("")
    setRawIdea("")
    setMood("")
    setScene("")
    setCamera("")
    setStyleBucket("")
    setGenError(null)
    setMjError(null)
    setMjPendingId(null)
    setLoadingProject(true)

    try {
      const [projectResult, dbPresets] = await Promise.all([
        getOrCreateProject(job.id),
        getPresetsFromDb(job.producer_slug ?? ""),
      ])

      if ("error" in projectResult) {
        setToast({ msg: projectResult.error, type: "error" })
        return
      }

      const proj = projectResult
      setProject(proj)

      const localPresets = getPresetsForProducer(job.producer_slug ?? "")
      const merged = dbPresets.length > 0 ? dbPresets : localPresets
      setPresets(merged)

      if (proj.canvas_json && Object.keys(proj.canvas_json).length > 0) {
        setCanvasConfig({ ...DEFAULT_CANVAS, ...(proj.canvas_json as CanvasConfig) })
      } else {
        setCanvasConfig({ ...DEFAULT_CANVAS, titleText: job.title ?? "" })
      }

      const vers = await getProjectVersions(proj.id)
      setVersions(vers)
      const sel = vers.find((v) => v.selected) ?? vers.find((v) => !v.rejected)
      if (sel) setSelectedVersionId(sel.id)
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : "Failed to load project", type: "error" })
    } finally {
      setLoadingProject(false)
    }
  }

  // ── Prompt building ──────────────────────────────────────────────────────

  function handleBuildPrompt() {
    const prompt = buildThumbnailPrompt({
      producerSlug: selectedJob?.producer_slug ?? "nightwire",
      title:        selectedJob?.title ?? undefined,
      mood:         mood || undefined,
      sceneType:    scene || undefined,
      cameraStyle:  camera || undefined,
      presetSlug:   selectedPresetSlug || selectedPreset?.preset_slug,
      rawIdea:      rawIdea.trim() || undefined,
    })
    setBuiltPrompt(prompt)
    setShowPrompt(false)
    setPromptSaved(false)
    setGenError(null)
    setMjError(null)
  }

  async function handleSavePromptToLibrary() {
    if (!builtPrompt || !selectedJob?.producer_slug) return
    await savePromptToLibrary(selectedJob.producer_slug, builtPrompt, "studio-generated", styleBucket || undefined)
    setPromptSaved(true)
  }

  function handlePresetSelect(preset: ThumbnailPreset) {
    setSelectedPreset(preset)
    setSelectedPresetSlug(preset.preset_slug)
    setCanvasConfig({
      ...DEFAULT_CANVAS,
      ...preset.canvas_defaults,
      titleText: selectedJob?.title ?? "",
    })
  }

  // ── Generation ───────────────────────────────────────────────────────────

  async function handleGenerateOpenAI(count?: 1 | 2 | 4) {
    if (!effectivePrompt || !project) return
    const n = count ?? genCount
    setGenerating(true)
    setGenError(null)

    const result = await generateThumbnailImages({
      prompt:       effectivePrompt,
      count:        n,
      producerSlug: selectedJob?.producer_slug ?? undefined,
      projectId:    project.id,
    })

    setGenerating(false)

    if ("error" in result) {
      setGenError(result.error)
      setToast({ msg: result.error, type: "error" })
      return
    }

    const newVersions: ThumbnailVersion[] = result.images.map((img, i) => ({
      id:             img.versionId ?? `oai-${Date.now()}-${i}`,
      project_id:     project.id,
      asset_id:       img.assetId,
      image_url:      img.imageUrl,
      prompt:         img.revisedPrompt ?? effectivePrompt,
      provider:       "openai",
      style_bucket:   null,
      version_number: versions.length + 1 + i,
      selected:       false,
      rejected:       false,
      ctr_score:      null,
      notes:          null,
      created_at:     new Date().toISOString(),
    }))

    setVersions((prev) => [...prev, ...newVersions])
    if (newVersions.length > 0) setSelectedVersionId(newVersions[0].id)
  }

  async function handleGenerateMidjourney() {
    if (!effectivePrompt || !selectedJob?.producer_slug || !project) return
    mjPromptRef.current = effectivePrompt
    setMjSending(true)
    setMjError(null)

    const result = await createMidjourneyPendingAsset({
      producerSlug:      selectedJob.producer_slug,
      prompt:            effectivePrompt,
      styleBucket:       styleBucket || undefined,
      linkedUploadJobId: selectedJob.id,
    })

    setMjSending(false)

    if ("error" in result) {
      setMjError(result.error)
      return
    }

    setMjPendingId(result.id)
  }

  // ── Approval ─────────────────────────────────────────────────────────────

  function handleApprove(version?: ThumbnailVersion) {
    const v = version ?? selectedVersion
    if (!project || !selectedJob || !v) return
    startTransition(async () => {
      const result = await approveProject(
        project.id,
        v.id,
        v.image_url,
        selectedJob.id,
        selectedJob.producer_slug,
        selectedJob.title,
        "generated",
        v.prompt ?? undefined,
      )
      if (result.error) {
        setToast({ msg: result.error, type: "error" })
      } else {
        setToast({ msg: "Thumbnail attached to upload job", type: "success" })
        setJobs((prev) =>
          prev.map((j) =>
            j.id === selectedJob.id
              ? { ...j, thumbnail_status: "approved", thumbnail_mode: "generated" }
              : j
          )
        )
      }
    })
  }

  function handleSkip() {
    if (!selectedJob) return
    startTransition(async () => {
      const result = await skipThumbnail(selectedJob.id)
      if (result.error) {
        setToast({ msg: result.error, type: "error" })
      } else {
        setToast({ msg: "Skipped — auto placeholder will be used", type: "success" })
        setJobs((prev) =>
          prev.map((j) =>
            j.id === selectedJob.id
              ? { ...j, thumbnail_status: "skipped", thumbnail_mode: "auto" }
              : j
          )
        )
      }
    })
  }

  function handleSaveDraft() {
    if (!project) return
    startTransition(async () => {
      await saveProjectDraft(project.id, canvasConfig, selectedPreset?.preset_slug)
      setToast({ msg: "Draft saved", type: "success" })
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)] lg:h-[calc(100dvh-4rem)] overflow-hidden">

      {/* ── Toast ───────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl transition-all pointer-events-none ${
          toast.type === "success"
            ? "bg-[#0a1a12] border-emerald-500/30 text-emerald-300"
            : "bg-[#1a0a0a] border-red-500/30 text-red-300"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center gap-3 px-4 lg:px-6 h-14 border-b border-white/[0.06] bg-[#08090d] z-10">

        <Link href="/admin/youtube" className="shrink-0 text-white/25 hover:text-white/55 transition-colors p-1 -ml-1">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 2.5L4.5 7L9 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <div className="w-px h-4 bg-white/[0.07] shrink-0" />

        <h1 className="text-[13px] font-semibold text-white/75 shrink-0 tracking-tight">
          Thumbnail Studio
        </h1>

        <div className="w-px h-4 bg-white/[0.07] shrink-0" />

        {/* Job selector dropdown */}
        <div className="relative flex-1 min-w-0 max-w-xs" ref={jobDropdownRef}>
          <button
            type="button"
            onClick={() => setJobDropdownOpen((p) => !p)}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.025] hover:border-white/[0.15] hover:bg-white/[0.04] transition-colors text-left min-w-0"
          >
            {selectedJob ? (
              <>
                <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${STATUS_DOT[currentThumbStatus ?? "pending"] ?? "bg-white/20"}`} />
                <span className="text-[12px] text-white/75 truncate">{selectedJob.title ?? "Untitled"}</span>
              </>
            ) : (
              <span className="text-[12px] text-white/30">Select a job…</span>
            )}
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="shrink-0 ml-auto text-white/25" aria-hidden="true">
              <path d="M2.5 4L5.5 7L8.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {jobDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[#0d1017] border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
              {jobs.length === 0 ? (
                <p className="text-center text-white/25 text-xs py-5">No active jobs</p>
              ) : (
                jobs.map((job) => {
                  const isActive = job.id === selectedJob?.id
                  const dot = STATUS_DOT[job.thumbnail_status ?? "pending"] ?? "bg-white/20"
                  return (
                    <button
                      type="button"
                      key={job.id}
                      onClick={() => handleSelectJob(job)}
                      className={`w-full text-left flex items-start gap-2.5 px-4 py-3 border-b border-white/[0.04] last:border-0 transition-colors ${
                        isActive ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className={`mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full ${dot}`} />
                      <div className="min-w-0">
                        <p className="text-[12px] text-white/75 truncate">{job.title ?? "Untitled"}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">
                          {job.producer_slug ?? "No producer"} · {job.thumbnail_status ?? "pending"}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* Status pill */}
        {currentThumbStatus && (
          <span className={`shrink-0 hidden sm:inline-flex text-[9px] font-semibold uppercase tracking-[0.12em] px-2.5 py-1 rounded-full border ${
            STATUS_PILL[currentThumbStatus] ?? STATUS_PILL.pending
          }`}>
            {currentThumbStatus}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {project && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isPending}
              className="hidden sm:block text-[11px] text-white/30 hover:text-white/60 disabled:opacity-40 transition-colors px-2"
            >
              Save Draft
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowInputs((p) => !p)}
            className="lg:hidden text-[11px] border border-white/[0.1] px-3 py-1.5 rounded-lg text-white/45 hover:text-white/70 hover:border-white/20 transition-colors"
          >
            {showInputs ? "× Close" : "Inputs"}
          </button>
        </div>
      </header>

      {/* ── Workspace ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">

        {/* ── LEFT: Input panel ────────────────────────────────────────── */}
        <aside className={`${showInputs ? "flex" : "hidden"} lg:flex flex-col w-full lg:w-[330px] xl:w-[360px] shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.06] overflow-y-auto bg-[#08090d]`}>
          {!selectedJob ? (
            <div className="flex-1 flex items-center justify-center p-10">
              <p className="text-sm text-white/20 text-center leading-relaxed">
                Select a job from the dropdown above<br />to start building a thumbnail
              </p>
            </div>
          ) : (
            <div className="p-5 space-y-6 pb-10">

              {/* Producer */}
              <div>
                <label className="text-[9px] uppercase tracking-[0.2em] text-white/25 block mb-1.5">Producer</label>
                <div className="px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-sm text-white/60">
                  {selectedJob.producer_slug ?? "—"}
                </div>
              </div>

              {/* Style Buckets */}
              <div>
                <label className="text-[9px] uppercase tracking-[0.2em] text-white/25 block mb-2">Style Bucket</label>
                <div className="flex flex-wrap gap-1.5">
                  {STYLE_BUCKETS.map((b) => (
                    <button
                      type="button"
                      key={b}
                      onClick={() => setStyleBucket(styleBucket === b ? "" : b)}
                      className={`px-2.5 py-1.5 rounded-full text-[10px] border transition-colors ${
                        styleBucket === b
                          ? "border-violet-500/50 bg-violet-600/20 text-violet-200"
                          : "border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Presets */}
              {presets.length > 0 && (
                <div>
                  <label className="text-[9px] uppercase tracking-[0.2em] text-white/25 block mb-2">Preset</label>
                  <div className="flex flex-col gap-1.5">
                    {presets.slice(0, 5).map((p) => {
                      const active = p.preset_slug === selectedPreset?.preset_slug
                      return (
                        <button
                          type="button"
                          key={p.preset_slug}
                          onClick={() => handlePresetSelect(p)}
                          className={`text-left px-3.5 py-2.5 rounded-xl border transition-colors ${
                            active
                              ? "border-violet-500/40 bg-violet-500/10 text-white"
                              : "border-white/[0.06] bg-white/[0.01] text-white/50 hover:text-white/75 hover:border-white/12"
                          }`}
                        >
                          <p className="text-[11px] font-medium">{p.name}</p>
                          {p.description && (
                            <p className="text-[10px] text-white/30 mt-0.5 line-clamp-1">{p.description}</p>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Visual Idea */}
              <div>
                <label className="text-[9px] uppercase tracking-[0.2em] text-white/25 block mb-1.5">Visual Idea</label>
                <textarea
                  value={rawIdea}
                  onChange={(e) => setRawIdea(e.target.value)}
                  placeholder="Describe what you want to see — location, mood, subjects, energy…"
                  rows={4}
                  className="w-full bg-black/25 border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/35 resize-none leading-relaxed"
                />
              </div>

              {/* Camera Style */}
              <div>
                <label className="text-[9px] uppercase tracking-[0.2em] text-white/25 block mb-1.5">Camera Style</label>
                <select
                  value={camera}
                  onChange={(e) => setCamera(e.target.value)}
                  className="w-full bg-black/25 border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/35 appearance-none"
                >
                  <option value="">— Auto from preset —</option>
                  {CAMERA_STYLES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Refiners toggle */}
              <button
                type="button"
                onClick={() => setShowRefiners((p) => !p)}
                className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.15em] text-white/25 hover:text-white/50 transition-colors"
              >
                <svg
                  width="9" height="9" viewBox="0 0 9 9" fill="none"
                  className={`transition-transform duration-200 ${showRefiners ? "rotate-90" : ""}`}
                  aria-hidden="true"
                >
                  <path d="M2.5 1.5l4 3-4 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {showRefiners ? "Hide Refiners" : "Mood & Scene"}
              </button>

              {showRefiners && (
                <div className="space-y-4 -mt-2">
                  <div>
                    <label className="text-[9px] uppercase tracking-[0.2em] text-white/25 block mb-1.5">Mood</label>
                    <select
                      value={mood}
                      onChange={(e) => setMood(e.target.value)}
                      className="w-full bg-black/25 border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/35 appearance-none"
                    >
                      <option value="">— Auto —</option>
                      {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-[0.2em] text-white/25 block mb-1.5">Scene</label>
                    <select
                      value={scene}
                      onChange={(e) => setScene(e.target.value)}
                      className="w-full bg-black/25 border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/35 appearance-none"
                    >
                      <option value="">— Auto from title —</option>
                      {SCENE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Build Prompt */}
              <button
                type="button"
                onClick={handleBuildPrompt}
                className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white font-semibold text-sm transition-all shadow-[0_4px_24px_rgba(124,58,237,0.25)]"
              >
                Build Prompt
              </button>

              {/* Prompt status */}
              {builtPrompt && (
                <div className="space-y-2.5 -mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-violet-400/60">✓ Prompt ready</span>
                    <button
                      type="button"
                      onClick={() => setShowPrompt((p) => !p)}
                      className="text-[9px] text-white/25 hover:text-white/50 uppercase tracking-[0.1em] transition-colors"
                    >
                      {showPrompt ? "Hide" : "Preview"}
                    </button>
                  </div>

                  {showPrompt && (
                    <div className="space-y-2">
                      <textarea
                        value={builtPrompt}
                        onChange={(e) => { setBuiltPrompt(e.target.value); setPromptSaved(false) }}
                        rows={5}
                        className="w-full bg-black/20 border border-white/[0.06] rounded-xl px-3 py-2.5 text-[11px] text-white/65 focus:outline-none focus:border-violet-500/30 resize-none font-mono leading-relaxed"
                      />
                      <button
                        type="button"
                        onClick={handleSavePromptToLibrary}
                        disabled={promptSaved || !selectedJob.producer_slug}
                        className="text-[10px] text-white/25 hover:text-white/50 disabled:opacity-40 transition-colors"
                      >
                        {promptSaved ? "Saved to Library ✓" : "Save to Prompt Library"}
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </aside>

        {/* ── RIGHT: Canvas + Versions ─────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-[#060810]">

          {loadingProject ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Spinner className="w-5 h-5 text-white/25 mx-auto mb-3" />
                <p className="text-sm text-white/20">Loading project…</p>
              </div>
            </div>

          ) : !selectedJob ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-[128px] h-[72px] rounded-2xl border border-white/[0.05] bg-white/[0.02] mx-auto mb-5 flex items-center justify-center">
                  <svg width="28" height="18" viewBox="0 0 28 18" fill="none" className="text-white/10" aria-hidden="true">
                    <rect x="0.5" y="0.5" width="27" height="17" rx="2.5" stroke="currentColor" />
                    <path d="M10 5l8 4-8 4V5Z" fill="currentColor" />
                  </svg>
                </div>
                <p className="text-white/20 text-sm">Select a job to open the studio</p>
                <p className="text-white/10 text-xs mt-1">{jobs.length} job{jobs.length !== 1 ? "s" : ""} available</p>
              </div>
            </div>

          ) : !project ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-white/15 text-sm">No project found</p>
            </div>

          ) : (
            <>
              {/* Quick Prompt — always visible, never scrolls */}
              <div className="shrink-0 px-5 pt-5 pb-3 border-b border-white/[0.04]">
                <label className="text-[9px] uppercase tracking-[0.2em] text-white/25 block mb-1.5">Quick Prompt</label>
                <textarea
                  value={quickPrompt}
                  onChange={(e) => setQuickPrompt(e.target.value)}
                  placeholder="Type a custom thumbnail idea… (overrides builder)"
                  rows={2}
                  className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none leading-relaxed transition-colors"
                />
                <div className="flex items-center gap-3 mt-1.5 min-h-[1.25rem]">
                  {builtPrompt && (
                    <button
                      type="button"
                      onClick={() => setQuickPrompt(builtPrompt)}
                      className="text-[10px] text-violet-400/50 hover:text-violet-400 transition-colors"
                    >
                      Use Builder Prompt
                    </button>
                  )}
                  {quickPrompt && (
                    <button
                      type="button"
                      onClick={() => setQuickPrompt("")}
                      className="text-[10px] text-white/20 hover:text-white/50 transition-colors ml-auto"
                    >
                      Clear
                    </button>
                  )}
                  {quickPrompt && builtPrompt && (
                    <span className="text-[9px] text-amber-400/50 font-mono">overriding builder</span>
                  )}
                </div>
              </div>

              {/* Single scrollable zone */}
              <div className="flex-1 min-h-0 overflow-y-auto">

                {/* Canvas — only rendered when a version is selected */}
                {selectedVersion && (
                  <div className="px-5 pt-4 pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-white/25">Preview</p>
                      <p className="text-[10px] text-white/20 truncate max-w-[60%] text-right">
                        {selectedJob.title ?? "Untitled"}
                      </p>
                    </div>
                    <ThumbnailCanvas
                      config={canvasConfig}
                      selectedImageUrl={selectedVersion.image_url}
                      onChange={setCanvasConfig}
                    />
                  </div>
                )}

                {/* Error banner */}
                {(genError || mjError) && (
                  <div className="mx-5 mb-3">
                    <div className="rounded-xl bg-red-500/[0.07] border border-red-500/20 px-3 py-2 text-[11px] text-red-400/80 flex items-center justify-between gap-2">
                      <span>{genError ?? mjError}</span>
                      <button
                        type="button"
                        onClick={() => { setGenError(null); setMjError(null) }}
                        className="shrink-0 text-red-400/40 hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {/* Version grid — always visible */}
                <div className="px-5 pb-4 pt-3">
                  <ThumbnailVersionGrid
                    projectId={project.id}
                    versions={versions}
                    selectedVersionId={selectedVersionId}
                    generatingCount={generating ? genCount : 0}
                    mjPending={!!mjPendingId}
                    onVersionsChange={setVersions}
                    onVersionSelect={(v) => setSelectedVersionId(v.id)}
                    onApprove={handleApprove}
                  />
                </div>

              </div>
            </>
          )}
        </main>
      </div>

      {/* ── Bottom Action Bar ────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-white/[0.07] bg-[#08090d] px-4 lg:px-5 py-3 flex items-center gap-2.5">

        {/* Count selector */}
        <div className="flex items-center gap-1 shrink-0">
          {([1, 2, 4] as const).map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setGenCount(n)}
              disabled={isGeneratingAny}
              className={`w-7 h-7 rounded-lg text-[11px] font-mono transition-colors disabled:opacity-40 border ${
                genCount === n
                  ? "bg-white/[0.09] border-white/[0.18] text-white"
                  : "border-white/[0.06] text-white/30 hover:text-white/60 hover:border-white/[0.14]"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-white/[0.06] shrink-0" />

        {/* Generate OpenAI */}
        <button
          type="button"
          onClick={() => handleGenerateOpenAI()}
          disabled={hasNoPrompt || isGeneratingAny || !project || !generationEnabled}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600/75 hover:bg-violet-600 active:scale-[0.97] disabled:opacity-30 text-sm font-medium text-white transition-all shadow-[0_0_16px_rgba(124,58,237,0.2)]"
        >
          {generating ? (
            <><Spinner /> <span>Generating…</span></>
          ) : (
            <><span className="text-violet-300">⚡</span><span>OpenAI</span></>
          )}
        </button>

        {/* Generate Midjourney */}
        <button
          type="button"
          onClick={handleGenerateMidjourney}
          disabled={hasNoPrompt || isGeneratingAny || !project || !selectedJob?.producer_slug}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-700/55 hover:bg-sky-700/75 border border-sky-500/20 active:scale-[0.97] disabled:opacity-30 text-sm font-medium text-white transition-all"
        >
          {mjSending || mjPendingId ? (
            <><Spinner className="w-3.5 h-3.5 text-sky-300" /> <span>{mjSending ? "Queuing…" : "Generating…"}</span></>
          ) : (
            <><span className="text-sky-300">✦</span><span>Midjourney</span></>
          )}
        </button>

        {/* Generate 4 versions shortcut */}
        <button
          type="button"
          onClick={() => handleGenerateOpenAI(4)}
          disabled={hasNoPrompt || isGeneratingAny || !project || !generationEnabled}
          className="hidden xl:flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-white/[0.08] text-sm text-white/40 hover:text-white/70 hover:border-white/15 active:scale-[0.97] disabled:opacity-30 transition-all"
        >
          <span className="text-[10px] text-white/25">4×</span>
          <span>Batch</span>
        </button>

        {!generationEnabled && (
          <span className="hidden lg:block text-[9px] text-amber-400/45 font-mono">OPENAI_API_KEY not set</span>
        )}

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSkip}
            disabled={isPending || !selectedJob}
            className="px-3.5 py-2.5 rounded-xl border border-white/[0.07] text-sm text-white/30 hover:text-white/60 hover:border-white/15 active:scale-[0.97] disabled:opacity-30 transition-all"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => handleApprove()}
            disabled={isPending || !selectedVersionId || !selectedJob || !project}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600/75 hover:bg-emerald-600 active:scale-[0.97] disabled:opacity-30 text-sm font-semibold text-white transition-all shadow-[0_0_20px_rgba(16,185,129,0.18)]"
          >
            {isPending ? <><Spinner className="w-3.5 h-3.5" /><span>Approving…</span></> : "Approve →"}
          </button>
        </div>
      </div>

    </div>
  )
}
