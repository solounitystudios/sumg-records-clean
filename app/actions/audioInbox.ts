"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"
import { supabase } from "@/lib/db/supabase"
import { getInboxItemById } from "@/lib/db/audioInbox"
import { getDNABySlug } from "@/lib/db/dna"
import { renderJobToMp4 } from "@/lib/youtube/renderer"
import { autoScheduleAllActiveChannels } from "@/lib/youtube/scheduler"
import type { InboxActionLogEntry, InboxStatus } from "@/lib/db/audioInbox"
import type { ProducerVariation } from "@/lib/db/dnaPacks"

// ─── Producer classification patterns ────────────────────────────────────────

const PRODUCER_PATTERNS: Array<{ slug: string; patterns: RegExp[] }> = [
  { slug: "ironlight",   patterns: [/iron[-_\s]*light/i, /\birnlght\b/i] },
  { slug: "deadzone310", patterns: [/dead[-_\s]*zone[-_\s]*310/i, /\bdz[-_\s]*310\b/i, /\bdeadzone\b/i] },
  { slug: "nightwire",   patterns: [/night[-_\s]*wire/i] },
  { slug: "tidewell",    patterns: [/tide[-_\s]*well/i] },
  { slug: "grvnd",       patterns: [/\bgrvnd\b/i, /\bgrnd\b/i] },
]

function classifyFilename(filename: string): string | null {
  const base = filename.replace(/\.[^.]+$/, "")
  for (const { slug, patterns } of PRODUCER_PATTERNS) {
    for (const pat of patterns) {
      if (pat.test(base)) return slug
    }
  }
  return null
}

function extractTrackName(filename: string, producerSlug: string): string {
  const aliases: Record<string, string[]> = {
    ironlight:   ["ironlight", "iron light"],
    deadzone310: ["deadzone310", "deadzone 310", "deadzone"],
    nightwire:   ["nightwire", "night wire"],
    tidewell:    ["tidewell", "tide well"],
    grvnd:       ["grvnd", "grnd"],
  }
  const slugAliases = [producerSlug, ...(aliases[producerSlug] ?? [])]

  let base = filename.replace(/\.[^.]+$/, "")
  for (const alias of slugAliases) {
    base = base.replace(new RegExp(alias.replace(/[-\s]/g, "[-_\\s]*"), "gi"), "")
  }

  return base
    .replace(/[-_]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ") || "New Beat"
}

// ─── Metadata generation helpers ──────────────────────────────────────────────

function buildTitle(
  formula: string | null,
  producerName: string,
  trackName: string,
  genre: string,
): string {
  if (!formula) return `${producerName} Type Beat | ${genre} | ${new Date().getFullYear()}`
  return formula
    .replace(/\{TRACK\}/g, trackName || genre)
    .replace(/\{ARTIST\}\s*x\s*/g, "")
    .replace(/\s*x\s*\{ARTIST\}/g, "")
    .replace(/\{ARTIST\}/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*—\s*$/, "")
    .trim()
}

function buildDescription(
  producerName: string,
  variation: ProducerVariation,
  identitySummary: string | null,
  genreCore: string[],
): string {
  const parts: string[] = []
  if (variation.sound_direction) parts.push(variation.sound_direction)
  if (identitySummary) parts.push(identitySummary)
  if (genreCore.length > 0) {
    parts.push(
      `Produced by ${producerName} | ${genreCore.slice(0, 2).join(" / ")} | ${new Date().getFullYear()}`
    )
  }
  parts.push("For licensing inquiries contact SUMG Records.")
  return parts.join("\n\n")
}

function buildThumbnailPrompt(variation: ProducerVariation, visualDna: Record<string, unknown> | null): string {
  const parts: string[] = []
  if (variation.image_prompt) parts.push(variation.image_prompt)
  if (variation.visual_world) parts.push(variation.visual_world)
  if (variation.colors.length > 0) parts.push(`Color palette: ${variation.colors.join(", ")}`)
  if (visualDna?.world && Array.isArray(visualDna.world)) {
    parts.push(`Visual world: ${(visualDna.world as string[]).join(", ")}`)
  }
  parts.push("Professional music thumbnail, high contrast, no text")
  return parts.join(". ")
}

// ─── Action log helper ────────────────────────────────────────────────────────

async function appendLog(id: string, action: string, detail: string) {
  if (!id) return
  const entry: InboxActionLogEntry = { action, detail, at: new Date().toISOString() }
  await supabase.rpc("append_inbox_log", { p_id: id, p_entry: entry })
}

async function setStatus(id: string, status: InboxStatus, errorMessage?: string) {
  await supabase
    .from("audio_inbox")
    .update({
      status,
      error_message: errorMessage ?? null,
      updated_at:    new Date().toISOString(),
    })
    .eq("id", id)
}

function revalidateInbox() {
  revalidatePath("/admin/youtube/inbox")
  revalidatePath("/admin/youtube")
}

// ─── Classify ─────────────────────────────────────────────────────────────────

export async function classifyAsset(inboxId: string): Promise<{ ok: boolean; slug?: string; error?: string }> {
  await requireAdmin()

  const item = await getInboxItemById(inboxId)
  if (!item) return { ok: false, error: "Inbox item not found" }
  if (item.status === "uploaded" || item.status === "scheduled") {
    return { ok: false, error: "Item already in terminal state" }
  }

  await setStatus(inboxId, "analyzing")
  await appendLog(inboxId, "classify_start", "Running producer classification")

  const filename = item.assetFilename ?? ""
  const slug = classifyFilename(filename)

  if (slug) {
    await supabase
      .from("audio_inbox")
      .update({ producer_slug: slug, status: "needs_review", updated_at: new Date().toISOString() })
      .eq("id", inboxId)
    await appendLog(inboxId, "classify_done", `Matched producer: ${slug} (confidence: high)`)
    revalidateInbox()
    return { ok: true, slug }
  } else {
    await setStatus(inboxId, "needs_review")
    await appendLog(inboxId, "classify_done", "No producer match in filename — manual review required")
    revalidateInbox()
    return { ok: true }
  }
}

// ─── Match variation ──────────────────────────────────────────────────────────

export async function matchVariation(inboxId: string): Promise<{ ok: boolean; variationId?: string; error?: string }> {
  await requireAdmin()

  const item = await getInboxItemById(inboxId)
  if (!item) return { ok: false, error: "Inbox item not found" }
  if (!item.producerSlug) return { ok: false, error: "No producer assigned" }

  // Use existing variation or pick first for this producer
  const { data: variations } = await supabase
    .from("producer_variations")
    .select("id, variation_name, sort_order")
    .eq("producer_slug", item.producerSlug)
    .order("sort_order", { ascending: true })
    .limit(1)

  const variation = variations?.[0] as { id: string; variation_name: string } | undefined
  if (!variation) {
    await appendLog(inboxId, "match_variation", `No variations found for ${item.producerSlug}`)
    return { ok: false, error: `No variations for producer ${item.producerSlug}` }
  }

  await supabase
    .from("audio_inbox")
    .update({ variation_id: variation.id, updated_at: new Date().toISOString() })
    .eq("id", inboxId)
  await appendLog(inboxId, "match_variation", `Matched variation: ${variation.variation_name} (id: ${variation.id})`)
  revalidateInbox()
  return { ok: true, variationId: variation.id }
}

// ─── Generate metadata ────────────────────────────────────────────────────────

export async function generateMetadata(inboxId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()

  const item = await getInboxItemById(inboxId)
  if (!item) return { ok: false, error: "Inbox item not found" }
  if (!item.producerSlug) return { ok: false, error: "No producer assigned" }

  const dna = await getDNABySlug("producer", item.producerSlug)

  let variation: ProducerVariation | null = null
  if (item.variationId) {
    const { data } = await supabase
      .from("producer_variations")
      .select("*")
      .eq("id", item.variationId)
      .single()
    variation = data as ProducerVariation | null
  }

  // Fallback: pick first variation if none assigned
  if (!variation) {
    const { data: first } = await supabase
      .from("producer_variations")
      .select("*")
      .eq("producer_slug", item.producerSlug)
      .order("sort_order", { ascending: true })
      .limit(1)
    variation = (first as ProducerVariation[] | null)?.[0] ?? null
  }

  const producerName = item.producerSlug
    .replace(/(^\w|-\w)/g, (m) => m.replace("-", " ").toUpperCase())
    .replace(/_/g, " ")

  const filename = item.assetFilename ?? ""
  const trackName = extractTrackName(filename, item.producerSlug)
  const genreCore = dna?.genre_core ?? ["Hip Hop"]
  const genre = genreCore[0] ?? "Hip Hop"

  const generatedTitle = buildTitle(variation?.yt_title_formula ?? null, producerName, trackName, genre)
  const generatedDescription = buildDescription(
    producerName,
    variation ?? ({
      sound_direction: null,
      tag_bank: [],
    } as unknown as ProducerVariation),
    dna?.identity_summary ?? null,
    genreCore,
  )
  const generatedTags = [
    ...(variation?.tag_bank ?? []),
    ...(dna?.metadata_keywords ?? []),
    `${item.producerSlug} type beat`,
    genre.toLowerCase(),
    new Date().getFullYear().toString(),
  ].filter(Boolean).slice(0, 30)

  await supabase
    .from("audio_inbox")
    .update({
      generated_title:       generatedTitle,
      generated_description: generatedDescription,
      generated_tags:        generatedTags,
      status:                "needs_thumbnail",
      updated_at:            new Date().toISOString(),
    })
    .eq("id", inboxId)

  await appendLog(inboxId, "generate_metadata", `Title: "${generatedTitle}" | Tags: ${generatedTags.length}`)
  revalidateInbox()
  return { ok: true }
}

// ─── Generate thumbnail prompt ────────────────────────────────────────────────

export async function generateThumbnailPrompt(inboxId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()

  const item = await getInboxItemById(inboxId)
  if (!item) return { ok: false, error: "Inbox item not found" }
  if (!item.producerSlug) return { ok: false, error: "No producer assigned" }

  const dna = await getDNABySlug("producer", item.producerSlug)

  let variation: ProducerVariation | null = null
  if (item.variationId) {
    const { data } = await supabase
      .from("producer_variations")
      .select("*")
      .eq("id", item.variationId)
      .single()
    variation = data as ProducerVariation | null
  }

  if (!variation) {
    const { data: first } = await supabase
      .from("producer_variations")
      .select("*")
      .eq("producer_slug", item.producerSlug)
      .order("sort_order", { ascending: true })
      .limit(1)
    variation = (first as ProducerVariation[] | null)?.[0] ?? null
  }

  if (!variation) {
    await appendLog(inboxId, "generate_thumbnail", "No variation found — skipped")
    await setStatus(inboxId, "needs_render")
    revalidateInbox()
    return { ok: true }
  }

  const prompt = buildThumbnailPrompt(variation, dna?.visual_dna ?? null)

  await supabase
    .from("audio_inbox")
    .update({
      thumbnail_prompt: prompt,
      status:           "needs_render",
      updated_at:       new Date().toISOString(),
    })
    .eq("id", inboxId)

  await appendLog(inboxId, "generate_thumbnail", `Prompt generated (${prompt.length} chars)`)
  revalidateInbox()
  return { ok: true }
}

// ─── Create DNA pack ──────────────────────────────────────────────────────────

export async function createInboxDNAPack(inboxId: string): Promise<{ ok: boolean; packId?: string; error?: string }> {
  await requireAdmin()

  const item = await getInboxItemById(inboxId)
  if (!item) return { ok: false, error: "Inbox item not found" }
  if (!item.producerSlug) return { ok: false, error: "No producer assigned" }
  if (item.dnaPackId) return { ok: true, packId: item.dnaPackId }

  const dna = await getDNABySlug("producer", item.producerSlug)

  const title = item.overrideTitle || item.generatedTitle || "Untitled Beat"
  const description = item.overrideDescription || item.generatedDescription
  const tags = item.overrideTags.length > 0 ? item.overrideTags : item.generatedTags

  const { data: pack, error } = await supabase
    .from("dna_packs")
    .insert({
      title,
      status:                "approved",
      producer_dna_id:       dna?.id ?? null,
      producer_variation_id: item.variationId ?? null,
      asset_id:              item.assetId,
      platform:              "youtube_beat",
      thumbnail_prompt:      item.thumbnailPrompt,
      yt_description:        description,
      hashtags:              tags,
      updated_at:            new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error || !pack) {
    await appendLog(inboxId, "create_dna_pack", `Failed: ${error?.message}`)
    return { ok: false, error: error?.message }
  }

  await supabase
    .from("audio_inbox")
    .update({ dna_pack_id: (pack as { id: string }).id, updated_at: new Date().toISOString() })
    .eq("id", inboxId)

  await appendLog(inboxId, "create_dna_pack", `Created DNA pack: ${(pack as { id: string }).id}`)
  revalidateInbox()
  return { ok: true, packId: (pack as { id: string }).id }
}

// ─── Create YT job ────────────────────────────────────────────────────────────

export async function createInboxYtJob(inboxId: string): Promise<{ ok: boolean; jobId?: string; error?: string }> {
  await requireAdmin()

  const item = await getInboxItemById(inboxId)
  if (!item) return { ok: false, error: "Inbox item not found" }
  if (!item.producerSlug) return { ok: false, error: "No producer assigned" }
  if (item.ytJobId) return { ok: true, jobId: item.ytJobId }

  // Find active channel for this producer
  const { data: channels } = await supabase
    .from("yt_channels")
    .select("id")
    .eq("producer_slug", item.producerSlug)
    .eq("status", "active")
    .not("oauth_refresh_token", "is", null)
    .limit(1)

  const channelId = (channels as Array<{ id: string }> | null)?.[0]?.id ?? null

  const title = item.overrideTitle || item.generatedTitle
  const description = item.overrideDescription || item.generatedDescription
  const tags = item.overrideTags.length > 0 ? item.overrideTags : item.generatedTags

  const { data: job, error } = await supabase
    .from("yt_upload_jobs")
    .insert({
      producer_slug:  item.producerSlug,
      asset_id:       item.assetId,
      yt_channel_id:  channelId,
      dna_pack_id:    item.dnaPackId ?? null,
      status:         "needs_render",
      title,
      description,
      tags,
      updated_at:     new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error || !job) {
    await appendLog(inboxId, "create_yt_job", `Failed: ${error?.message}`)
    await setStatus(inboxId, "failed", error?.message)
    return { ok: false, error: error?.message }
  }

  const jobId = (job as { id: string }).id

  if (item.dnaPackId) {
    await supabase
      .from("dna_packs")
      .update({ yt_job_id: jobId, status: "assigned_to_queue", updated_at: new Date().toISOString() })
      .eq("id", item.dnaPackId)
  }

  await supabase
    .from("audio_inbox")
    .update({ yt_job_id: jobId, updated_at: new Date().toISOString() })
    .eq("id", inboxId)

  await appendLog(
    inboxId,
    "create_yt_job",
    `Created job ${jobId}${channelId ? ` on channel ${channelId}` : " (no channel assigned)"}`
  )
  revalidateInbox()
  revalidatePath("/admin/youtube/queue")
  revalidatePath("/admin/youtube/jobs")
  return { ok: true, jobId }
}

// ─── Approve (full auto pipeline after classification review) ─────────────────

export async function approveInboxItem(inboxId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()

  const item = await getInboxItemById(inboxId)
  if (!item) return { ok: false, error: "Inbox item not found" }
  if (!item.producerSlug) return { ok: false, error: "Assign a producer before approving" }

  await appendLog(inboxId, "approve", "Full pipeline started after review approval")

  // 1. Match variation if missing
  if (!item.variationId) {
    const r = await matchVariation(inboxId)
    if (!r.ok) return r
  }

  // 2. Generate metadata
  const metaResult = await generateMetadata(inboxId)
  if (!metaResult.ok) return metaResult

  // 3. Generate thumbnail prompt
  const thumbResult = await generateThumbnailPrompt(inboxId)
  if (!thumbResult.ok) return thumbResult

  // 4. Create DNA pack
  const packResult = await createInboxDNAPack(inboxId)
  if (!packResult.ok) return packResult

  // 5. Create YT job
  const jobResult = await createInboxYtJob(inboxId)
  if (!jobResult.ok) return jobResult

  await appendLog(inboxId, "approve_done", "Pipeline complete — job created and queued for render")
  revalidateInbox()
  return { ok: true }
}

// ─── Update override metadata ─────────────────────────────────────────────────

export async function updateInboxMetadata(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()

  const id             = formData.get("id")?.toString() ?? ""
  const overrideTitle  = formData.get("override_title")?.toString().trim() || null
  const overrideDesc   = formData.get("override_description")?.toString().trim() || null
  const tagsRaw        = formData.get("override_tags")?.toString() ?? ""
  const overrideTags   = tagsRaw.split("\n").map(s => s.trim()).filter(Boolean)
  const producerSlug   = formData.get("producer_slug")?.toString().trim() || null
  const thumbnailProm  = formData.get("thumbnail_prompt")?.toString().trim() || null

  if (!id) return { ok: false, error: "id required" }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (overrideTitle  !== undefined) updates.override_title       = overrideTitle
  if (overrideDesc   !== undefined) updates.override_description = overrideDesc
  if (tagsRaw        !== undefined) updates.override_tags        = overrideTags
  if (producerSlug   !== undefined) updates.producer_slug        = producerSlug
  if (thumbnailProm  !== undefined) updates.thumbnail_prompt     = thumbnailProm

  const { error } = await supabase.from("audio_inbox").update(updates).eq("id", id)
  if (error) return { ok: false, error: error.message }

  await appendLog(id, "manual_edit", `Fields updated: ${Object.keys(updates).join(", ")}`)
  revalidateInbox()
  return { ok: true }
}

// ─── Reset inbox item ─────────────────────────────────────────────────────────

export async function resetInboxItem(inboxId: string): Promise<void> {
  await requireAdmin()
  await supabase
    .from("audio_inbox")
    .update({
      status:                "new_asset",
      producer_slug:         null,
      variation_id:          null,
      dna_pack_id:           null,
      yt_job_id:             null,
      generated_title:       null,
      generated_description: null,
      generated_tags:        [],
      thumbnail_prompt:      null,
      error_message:         null,
      updated_at:            new Date().toISOString(),
    })
    .eq("id", inboxId)
  await appendLog(inboxId, "reset", "Item reset to new_asset")
  revalidateInbox()
}

// ─── Bulk: auto-classify ──────────────────────────────────────────────────────

export async function bulkAutoProcess(inboxIds: string[]): Promise<{ processed: number; errors: string[] }> {
  await requireAdmin()

  const errors: string[] = []
  let processed = 0

  for (const id of inboxIds) {
    const r = await classifyAsset(id)
    if (r.ok) processed++
    else errors.push(`${id}: ${r.error}`)
  }

  revalidateInbox()
  return { processed, errors }
}

// ─── Bulk: approve ────────────────────────────────────────────────────────────

export async function bulkApprove(inboxIds: string[]): Promise<{ processed: number; errors: string[] }> {
  await requireAdmin()

  const errors: string[] = []
  let processed = 0

  for (const id of inboxIds) {
    const r = await approveInboxItem(id)
    if (r.ok) processed++
    else errors.push(`${id}: ${r.error}`)
  }

  revalidateInbox()
  return { processed, errors }
}

// ─── Bulk: create jobs ────────────────────────────────────────────────────────

export async function bulkCreateJobs(inboxIds: string[]): Promise<{ processed: number; errors: string[] }> {
  await requireAdmin()

  const errors: string[] = []
  let processed = 0

  for (const id of inboxIds) {
    const item = await getInboxItemById(id)
    if (!item) { errors.push(`${id}: not found`); continue }

    if (!item.dnaPackId) {
      const packR = await createInboxDNAPack(id)
      if (!packR.ok) { errors.push(`${id}: pack — ${packR.error}`); continue }
    }

    const r = await createInboxYtJob(id)
    if (r.ok) processed++
    else errors.push(`${id}: ${r.error}`)
  }

  revalidateInbox()
  return { processed, errors }
}

// ─── Bulk: render ─────────────────────────────────────────────────────────────

export async function bulkRender(inboxIds: string[]): Promise<{ processed: number; errors: string[] }> {
  await requireAdmin()

  const errors: string[] = []
  let processed = 0

  for (const id of inboxIds) {
    const item = await getInboxItemById(id)
    if (!item) { errors.push(`${id}: not found`); continue }
    if (!item.ytJobId) { errors.push(`${id}: no YT job`); continue }

    try {
      const title = item.overrideTitle || item.generatedTitle || "Untitled Beat"
      await renderJobToMp4({
        jobId:    item.ytJobId,
        title,
        producer: item.producerSlug ?? "unknown",
      })
      await setStatus(id, "ready_to_schedule")
      await appendLog(id, "render_done", `Rendered job ${item.ytJobId}`)
      processed++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await setStatus(id, "failed", msg)
      await appendLog(id, "render_failed", msg)
      errors.push(`${id}: ${msg}`)
    }
  }

  revalidateInbox()
  revalidatePath("/admin/youtube/render")
  revalidatePath("/admin/youtube/queue")
  return { processed, errors }
}

// ─── Bulk: schedule ───────────────────────────────────────────────────────────

export async function bulkSchedule(inboxIds: string[]): Promise<{ processed: number; errors: string[] }> {
  await requireAdmin()

  if (inboxIds.length === 0) return { processed: 0, errors: [] }

  const errors: string[] = []
  let processed = 0

  // Auto-schedule all active channels — picks up all pending jobs
  try {
    await autoScheduleAllActiveChannels()

    // Update inbox status for items whose yt jobs are now scheduled
    for (const id of inboxIds) {
      const item = await getInboxItemById(id)
      if (!item?.ytJobId) continue

      const { data: job } = await supabase
        .from("yt_upload_jobs")
        .select("status")
        .eq("id", item.ytJobId)
        .single()

      const jobStatus = (job as { status: string } | null)?.status
      if (jobStatus === "scheduled") {
        await setStatus(id, "scheduled")
        await appendLog(id, "scheduled", "Job scheduled via auto-scheduler")
        processed++
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(msg)
  }

  revalidateInbox()
  revalidatePath("/admin/youtube/schedule")
  return { processed, errors }
}
