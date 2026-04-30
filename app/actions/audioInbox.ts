"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth"
import { supabase } from "@/lib/db/supabase"
import { getInboxItemById } from "@/lib/db/audioInbox"
import { getDNABySlug } from "@/lib/db/dna"
import { autoScheduleAllActiveChannels } from "@/lib/youtube/scheduler"
import { enhanceMetadataWithOpenAI } from "@/lib/youtube/openaiEnhancer"
import type { InboxActionLogEntry, InboxStatus, TitleVariant } from "@/lib/db/audioInbox"
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

// ─── Title CTR scoring + variant builders ─────────────────────────────────────

function scoreTitleCtr(title: string): number {
  let score = 30
  const len = title.length
  if (len >= 40 && len <= 62) score += 20
  else if (len >= 28 && len <= 72) score += 10
  if (/\[FREE\]/i.test(title)) score += 15
  if (/type\s*beat/i.test(title)) score += 10
  if (title.includes(new Date().getFullYear().toString())) score += 5
  if (len < 22) score -= 15
  if (len > 75) score -= 10
  // penalise ALL_CAPS words (looks spammy)
  const words = title.split(/\s+/)
  const capsWords = words.filter((w) => w.length > 2 && w === w.toUpperCase() && /[A-Z]/.test(w))
  if (capsWords.length > words.length * 0.5) score -= 10
  return Math.max(0, Math.min(100, score))
}

function buildTitleVariants(
  formula: string | null,
  producerName: string,
  trackName: string,
  genre: string,
): TitleVariant[] {
  const year = new Date().getFullYear()
  const texts = [
    // Variant 0: producer formula (brand)
    buildTitle(formula, producerName, trackName, genre),
    // Variant 1: [FREE] CTR-optimised
    `[FREE] ${trackName} Type Beat | ${genre} ${year}`,
    // Variant 2: search/discovery
    `${genre} Type Beat ${year} | ${trackName} (Prod. ${producerName})`,
  ]
  return texts.map((text) => ({ text, ctrScore: scoreTitleCtr(text) }))
}

function buildThumbnailVariants(
  variation: ProducerVariation,
  visualDna: Record<string, unknown> | null,
  genre: string,
): string[] {
  const colors = variation.colors.length > 0 ? variation.colors.join(", ") : "dark, high contrast"
  return [
    // Variant 0: visual world (primary, existing logic)
    buildThumbnailPrompt(variation, visualDna),
    // Variant 1: energy / cinematic
    `Dynamic ${genre} music producer aesthetic, neon studio lighting, ${colors} color grading, cinematic wide composition. Professional music thumbnail, no text, no faces.`,
    // Variant 2: minimal / abstract
    `Minimal abstract art for ${genre} music, ${colors} palette, geometric forms, subtle texture, premium dark background. No text, no faces.`,
  ]
}

function buildPinnedComment(producerName: string, title: string): string {
  const slug = producerName.toLowerCase().replace(/\s+/g, "")
  return `🔥 "${title}" — available for licensing!\n\n📩 DM for leases or contact SUMG Records\n🎵 Tag us if you use this beat: #${slug}\n\nFree lease for non-profit use. Premium leases available.`
}

function buildCtaCopy(producerName: string): string {
  return `Produced by ${producerName} | For licensing: SUMG Records | © ${new Date().getFullYear()} All rights reserved`
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

  // Preserve a manually-assigned producer — auto-classification must not overwrite it.
  const effectiveSlug = item.producerSlug ?? slug

  if (effectiveSlug) {
    await supabase
      .from("audio_inbox")
      .update({ producer_slug: effectiveSlug, status: "needs_review", updated_at: new Date().toISOString() })
      .eq("id", inboxId)
    const source = item.producerSlug
      ? `Kept manual producer: ${effectiveSlug}`
      : `Matched producer: ${effectiveSlug} (confidence: high)`
    await appendLog(inboxId, "classify_done", source)
    revalidateInbox()
    return { ok: true, slug: effectiveSlug }
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

  const fallbackVariation = variation ?? ({
    sound_direction: null,
    tag_bank: [],
  } as unknown as ProducerVariation)

  const localDescription = buildDescription(
    producerName,
    fallbackVariation,
    dna?.identity_summary ?? null,
    genreCore,
  )
  const localTags = [
    ...(variation?.tag_bank ?? []),
    ...(dna?.metadata_keywords ?? []),
    `${item.producerSlug} type beat`,
    genre.toLowerCase(),
    new Date().getFullYear().toString(),
  ].filter(Boolean).slice(0, 30)

  const ctaCopy = buildCtaCopy(producerName)

  // Optional OpenAI enhancement — falls back silently to local templates on any failure.
  const enhanced = await enhanceMetadataWithOpenAI({
    producerName,
    trackName,
    genre,
    genreCore,
    soundDirection:  fallbackVariation.sound_direction ?? null,
    identitySummary: dna?.identity_summary ?? null,
  })

  const generatedDescription = enhanced?.description ?? localDescription
  const generatedTags = enhanced
    ? [...new Set([...enhanced.tags, ...localTags])].slice(0, 30)
    : localTags
  const metaSource = enhanced ? "openai" : "template"

  const dbUpdate: Record<string, unknown> = {
    generated_description: generatedDescription,
    generated_tags:        generatedTags,
    cta_copy:              ctaCopy,
    status:                "needs_thumbnail",
    updated_at:            new Date().toISOString(),
  }

  // Respect locked_title: skip title variant generation if locked
  if (!item.lockedTitle) {
    const titleVariants: TitleVariant[] = enhanced?.titles.length
      ? enhanced.titles.map(text => ({ text, ctrScore: scoreTitleCtr(text) }))
      : buildTitleVariants(variation?.yt_title_formula ?? null, producerName, trackName, genre)
    const bestIdx = titleVariants.reduce(
      (best, v, i) => v.ctrScore > titleVariants[best].ctrScore ? i : best,
      0,
    )
    dbUpdate.title_variants       = titleVariants
    dbUpdate.selected_title_index = bestIdx
    dbUpdate.generated_title      = titleVariants[bestIdx].text
  }

  await supabase.from("audio_inbox").update(dbUpdate).eq("id", inboxId)

  const activeTitle = item.lockedTitle
    ? (item.overrideTitle ?? item.generatedTitle ?? "—")
    : (dbUpdate.generated_title as string)
  await appendLog(inboxId, "generate_metadata", `[${metaSource}] Title: "${activeTitle}" | Tags: ${generatedTags.length}${item.lockedTitle ? " (title locked)" : ""}`)
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

  const genreCore = dna?.genre_core ?? ["Hip Hop"]
  const genre = genreCore[0] ?? "Hip Hop"
  const producerName = item.producerSlug!
    .replace(/(^\w|-\w)/g, (m) => m.replace("-", " ").toUpperCase())
    .replace(/_/g, " ")

  const thumbnailVariants = buildThumbnailVariants(variation, dna?.visual_dna ?? null, genre)
  const primaryPrompt = thumbnailVariants[0]

  const effectiveTitle =
    item.titleVariants[item.selectedTitleIndex]?.text ??
    item.overrideTitle ??
    item.generatedTitle ??
    "New Beat"
  const pinnedComment = buildPinnedComment(producerName, effectiveTitle)

  await supabase
    .from("audio_inbox")
    .update({
      thumbnail_variants:       thumbnailVariants,
      selected_thumbnail_index: 0,
      thumbnail_prompt:         primaryPrompt,
      pinned_comment:           pinnedComment,
      status:                   "needs_render",
      updated_at:               new Date().toISOString(),
    })
    .eq("id", inboxId)

  await appendLog(inboxId, "generate_thumbnail", `3 variants generated (primary: ${primaryPrompt.length} chars)`)
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

  const variantTitle  = item.titleVariants[item.selectedTitleIndex]?.text ?? null
  const variantThumb  = item.thumbnailVariants[item.selectedThumbnailIndex] ?? null
  const title         = item.overrideTitle || variantTitle || item.generatedTitle || "Untitled Beat"
  const baseDesc      = item.overrideDescription || item.generatedDescription
  const description   = item.ctaCopy ? `${baseDesc ?? ""}\n\n${item.ctaCopy}` : baseDesc
  const tags          = item.overrideTags.length > 0 ? item.overrideTags : item.generatedTags
  const thumbPrompt   = variantThumb || item.thumbnailPrompt

  const { data: pack, error } = await supabase
    .from("dna_packs")
    .insert({
      title,
      status:                "approved",
      producer_dna_id:       dna?.id ?? null,
      producer_variation_id: item.variationId ?? null,
      asset_id:              item.assetId,
      platform:              "youtube_beat",
      thumbnail_prompt:      thumbPrompt,
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

// ─── Intelligent channel routing ─────────────────────────────────────────────

type RoutingRow = {
  id: string
  preferred_genres: string[]
  bpm_min: number | null
  bpm_max: number | null
  routing_priority: number
}

async function routeToChannel(
  producerSlug: string,
  bpm: number | null,
  genre: string | null,
): Promise<{ channelId: string | null; reason: string }> {
  const { data: rows } = await supabase
    .from("yt_channels")
    .select("id, preferred_genres, bpm_min, bpm_max, routing_priority")
    .eq("producer_slug", producerSlug)
    .eq("status", "active")
    .not("oauth_refresh_token", "is", null)
    .order("routing_priority", { ascending: false })

  if (!rows || rows.length === 0) return { channelId: null, reason: "no active channels with OAuth" }
  if (rows.length === 1) return { channelId: (rows[0] as RoutingRow).id, reason: "only channel" }

  let best: RoutingRow | null = null
  let bestScore = -Infinity

  for (const ch of rows as RoutingRow[]) {
    let score = ch.routing_priority

    // Genre match
    if (ch.preferred_genres.length === 0) {
      score += 20 // accepts all genres
    } else if (genre && ch.preferred_genres.some((g) => g.toLowerCase() === genre.toLowerCase())) {
      score += 40 // strong match
    }

    // BPM match
    const hasBpmRange = ch.bpm_min !== null || ch.bpm_max !== null
    if (!hasBpmRange) {
      score += 20 // accepts all BPM
    } else if (bpm === null) {
      score += 5 // unknown BPM — neutral nudge
    } else {
      const aboveMin = ch.bpm_min === null || bpm >= ch.bpm_min
      const belowMax = ch.bpm_max === null || bpm <= ch.bpm_max
      if (aboveMin && belowMax) score += 40
      else score -= 30 // out-of-range penalty
    }

    if (score > bestScore) {
      bestScore = score
      best = ch
    }
  }

  const channelId = best?.id ?? (rows[0] as RoutingRow).id
  const reason = best
    ? `routed score:${bestScore} genre:${genre ?? "?"} bpm:${bpm ?? "?"}`
    : "fallback to first channel"
  return { channelId, reason }
}

// ─── Create YT job ────────────────────────────────────────────────────────────

export async function createInboxYtJob(inboxId: string): Promise<{ ok: boolean; jobId?: string; error?: string }> {
  await requireAdmin()

  const item = await getInboxItemById(inboxId)
  if (!item) return { ok: false, error: "Inbox item not found" }
  if (!item.producerSlug) return { ok: false, error: "No producer assigned" }
  if (item.ytJobId) return { ok: true, jobId: item.ytJobId }

  // Intelligent channel routing — score channels against signal data + genre
  const dnaForRouting = await getDNABySlug("producer", item.producerSlug)
  const genreFirst = (dnaForRouting?.genre_core ?? [])[0] ?? null
  const { channelId, reason: routeReason } = await routeToChannel(item.producerSlug, item.bpm, genreFirst)

  const variantTitle  = item.titleVariants[item.selectedTitleIndex]?.text ?? null
  const title         = item.overrideTitle || variantTitle || item.generatedTitle
  const baseDesc      = item.overrideDescription || item.generatedDescription
  const description   = item.ctaCopy ? `${baseDesc ?? ""}\n\n${item.ctaCopy}` : baseDesc
  const tags          = item.overrideTags.length > 0 ? item.overrideTags : item.generatedTags

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
    `Created job ${jobId}${channelId ? ` on channel ${channelId} [${routeReason}]` : " (no channel assigned)"}`
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

  // 2. Generate metadata + thumbnail (skip if locked)
  if (!item.lockedMetadata) {
    const metaResult = await generateMetadata(inboxId)
    if (!metaResult.ok) return metaResult

    const thumbResult = await generateThumbnailPrompt(inboxId)
    if (!thumbResult.ok) return thumbResult
  } else {
    await appendLog(inboxId, "approve", "Metadata + thumbnail locked — skipping generation")
  }

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

  const id            = formData.get("id")?.toString() ?? ""
  const overrideTitle = formData.get("override_title")?.toString().trim() || null
  const overrideDesc  = formData.get("override_description")?.toString().trim() || null
  const tagsRaw       = formData.get("override_tags")?.toString() ?? ""
  const overrideTags  = tagsRaw.split("\n").map(s => s.trim()).filter(Boolean)
  const producerSlug  = formData.get("producer_slug")?.toString().trim() || null
  const thumbnailProm = formData.get("thumbnail_prompt")?.toString().trim() || null
  const pinnedComment = formData.get("pinned_comment")?.toString().trim() || null
  const ctaCopy       = formData.get("cta_copy")?.toString().trim() || null

  if (!id) return { ok: false, error: "id required" }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  updates.override_title       = overrideTitle
  updates.override_description = overrideDesc
  updates.override_tags        = overrideTags
  updates.producer_slug        = producerSlug
  updates.thumbnail_prompt     = thumbnailProm
  updates.pinned_comment       = pinnedComment
  updates.cta_copy             = ctaCopy

  // Advance to needs_review when a producer is assigned so the Approve button
  // becomes visible immediately — without requiring a separate Classify step.
  if (producerSlug) {
    const current = await getInboxItemById(id)
    if (current?.status === "new_asset") {
      updates.status = "needs_review"
    }
  }

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
      status:                   "new_asset",
      producer_slug:            null,
      variation_id:             null,
      dna_pack_id:              null,
      yt_job_id:                null,
      generated_title:          null,
      generated_description:    null,
      generated_tags:           [],
      thumbnail_prompt:         null,
      title_variants:           [],
      selected_title_index:     0,
      thumbnail_variants:       [],
      selected_thumbnail_index: 0,
      pinned_comment:           null,
      cta_copy:                 null,
      locked_title:             false,
      locked_metadata:          false,
      error_message:            null,
      updated_at:               new Date().toISOString(),
    })
    .eq("id", inboxId)
  await appendLog(inboxId, "reset", "Item reset to new_asset")
  revalidateInbox()
}

// ─── Variant selection + locks ────────────────────────────────────────────────

export async function selectTitleVariant(inboxId: string, index: number): Promise<void> {
  await requireAdmin()
  const item = await getInboxItemById(inboxId)
  if (!item || index < 0 || index >= item.titleVariants.length) return
  await supabase
    .from("audio_inbox")
    .update({ selected_title_index: index, updated_at: new Date().toISOString() })
    .eq("id", inboxId)
  await appendLog(inboxId, "select_title", `Variant ${index} selected: "${item.titleVariants[index].text}"`)
  revalidateInbox()
}

export async function selectThumbnailVariant(inboxId: string, index: number): Promise<void> {
  await requireAdmin()
  const item = await getInboxItemById(inboxId)
  if (!item || index < 0 || index >= item.thumbnailVariants.length) return
  await supabase
    .from("audio_inbox")
    .update({ selected_thumbnail_index: index, updated_at: new Date().toISOString() })
    .eq("id", inboxId)
  await appendLog(inboxId, "select_thumbnail", `Variant ${index} selected`)
  revalidateInbox()
}

export async function setLockedTitle(inboxId: string, locked: boolean): Promise<void> {
  await requireAdmin()
  await supabase
    .from("audio_inbox")
    .update({ locked_title: locked, updated_at: new Date().toISOString() })
    .eq("id", inboxId)
  await appendLog(inboxId, locked ? "lock_title" : "unlock_title", locked ? "Title locked" : "Title unlocked")
  revalidateInbox()
}

export async function setLockedMetadata(inboxId: string, locked: boolean): Promise<void> {
  await requireAdmin()
  await supabase
    .from("audio_inbox")
    .update({ locked_metadata: locked, updated_at: new Date().toISOString() })
    .eq("id", inboxId)
  await appendLog(inboxId, locked ? "lock_metadata" : "unlock_metadata", locked ? "All metadata locked" : "Metadata unlocked")
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
// Queues yt_upload_jobs for the external render worker — does NOT invoke ffmpeg
// in-process. The worker polls for status='needs_render' and claims each job.

export async function bulkRender(inboxIds: string[]): Promise<{ processed: number; errors: string[] }> {
  await requireAdmin()

  const errors: string[] = []
  let processed = 0

  for (const id of inboxIds) {
    const item = await getInboxItemById(id)
    if (!item) { errors.push(`${id}: not found`); continue }
    if (!item.ytJobId) { errors.push(`${id}: no YT job — run Approve first`); continue }

    // Reset the yt_upload_job to needs_render so the worker picks it up.
    // Only touch jobs that are in a restartable state (failed or already needs_render).
    const { error } = await supabase
      .from("yt_upload_jobs")
      .update({ status: "needs_render", error_message: null, updated_at: new Date().toISOString() })
      .eq("id", item.ytJobId)
      .in("status", ["failed", "needs_render"])

    if (error) {
      errors.push(`${id}: ${error.message}`)
      continue
    }

    await setStatus(id, "needs_render")
    await appendLog(id, "queued_render", `Job ${item.ytJobId} queued for render worker`)
    processed++
  }

  revalidateInbox()
  revalidatePath("/admin/youtube/render")
  revalidatePath("/admin/youtube/queue")
  return { processed, errors }
}

// ─── Signal intelligence: score audio asset ───────────────────────────────────

export async function scoreAudioAsset(
  inboxId: string,
  options: { revalidate?: boolean } = {},
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()

  const item = await getInboxItemById(inboxId)
  if (!item) return { ok: false, error: "Inbox item not found" }
  if (!item.assetUrl) return { ok: false, error: "No asset URL" }

  try {
    const res = await fetch(item.assetUrl)
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
    const buffer = Buffer.from(await res.arrayBuffer())

    const { parseBuffer } = await import("music-metadata")
    const meta = await parseBuffer(buffer, { mimeType: item.assetMimeType ?? "audio/mpeg" })

    const { format, common } = meta
    const duration     = format.duration ?? null
    const bitrate      = format.bitrate ?? null // bits/sec
    const sampleRate   = format.sampleRate ?? null
    const lossless     = format.lossless ?? false
    const bpm          = common.bpm ?? null
    const key          = common.key ?? null
    const fileBytes    = item.assetSizeBytes ?? 0

    // Quality score (0–100) — technical fidelity
    let quality = 0
    if (bitrate) {
      const kbps = bitrate / 1000
      if (kbps >= 320) quality += 40
      else if (kbps >= 192) quality += 25
      else if (kbps >= 128) quality += 15
      else quality += 5
    } else quality += 10
    if (sampleRate) {
      if (sampleRate >= 48000) quality += 20
      else if (sampleRate >= 44100) quality += 15
      else quality += 5
    } else quality += 10
    if (duration && duration >= 30 && duration <= 720) quality += 20
    else if (duration) quality += 5
    if (lossless) quality += 10
    if (fileBytes > 5 * 1024 * 1024) quality += 10
    else if (fileBytes > 2 * 1024 * 1024) quality += 5
    quality = Math.min(100, quality)

    // Commercial score (0–100) — market fit
    let commercial = 0
    if (duration) {
      if (duration >= 150 && duration <= 270) commercial += 35 // 2:30–4:30 ideal
      else if ((duration >= 90 && duration < 150) || (duration > 270 && duration <= 480)) commercial += 20
      else commercial += 5
    } else commercial += 10
    if (bpm) {
      if (bpm >= 130 && bpm <= 145) commercial += 30  // trap
      else if (bpm > 145 && bpm <= 175) commercial += 22 // drill
      else if (bpm >= 85 && bpm <= 100) commercial += 25  // boom bap / lo-fi
      else commercial += 12
    } else commercial += 8
    if (quality >= 70) commercial += 20
    else if (quality >= 50) commercial += 10
    if (item.producerSlug) commercial += 15
    commercial = Math.min(100, commercial)

    // CTR score (0–100) — click-through-rate potential
    let ctr = 0
    if (bpm) {
      if (bpm > 150) ctr += 25
      else if (bpm >= 130) ctr += 20
      else if (bpm >= 100) ctr += 15
      else ctr += 10
    } else ctr += 5
    if (duration) {
      if (duration >= 90 && duration <= 180) ctr += 25
      else if (duration > 180 && duration <= 270) ctr += 20
      else if (duration > 270 && duration <= 360) ctr += 15
      else ctr += 8
    } else ctr += 10
    if (commercial >= 70) ctr += 25
    else if (commercial >= 50) ctr += 15
    else ctr += 5
    ctr += item.producerSlug ? 15 : 5
    if (quality >= 70) ctr += 10
    ctr = Math.min(100, ctr)

    const signalData = {
      bitrate_kbps: bitrate ? Math.round(bitrate / 1000) : null,
      sample_rate:  sampleRate,
      channels:     format.numberOfChannels ?? null,
      codec:        format.codec ?? null,
      lossless,
      container:    format.container ?? null,
    }

    await supabase
      .from("audio_inbox")
      .update({
        bpm:              bpm !== null ? Math.round(bpm * 100) / 100 : null,
        key_signature:    key ?? null,
        duration_seconds: duration ?? null,
        quality_score:    quality,
        commercial_score: commercial,
        ctr_score:        ctr,
        signal_data:      signalData,
        updated_at:       new Date().toISOString(),
      })
      .eq("id", inboxId)

    const durFmt = duration
      ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")}`
      : "?:??"
    await appendLog(
      inboxId,
      "signal_analysis",
      `Q:${quality} C:${commercial} CTR:${ctr} | ${durFmt} | ${bpm ? `${Math.round(bpm)}bpm` : "no bpm"} | ${key ?? "no key"}`
    )
    // Skip revalidation when called fire-and-forget from a server action — the
    // calling action already revalidates, and running revalidatePath outside a
    // live request context throws in production.
    if (options.revalidate !== false) revalidateInbox()
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[audioInbox] scoreAudioAsset failed:", msg)
    await appendLog(inboxId, "signal_analysis_error", msg)
    return { ok: false, error: msg }
  }
}

// ─── Bulk: auto-approve items with quality score ≥ 80 ────────────────────────

export async function bulkAutoApproveHighScore(inboxIds: string[]): Promise<{ processed: number; errors: string[] }> {
  await requireAdmin()

  if (inboxIds.length === 0) return { processed: 0, errors: [] }

  const errors: string[] = []
  let processed = 0

  for (const id of inboxIds) {
    const item = await getInboxItemById(id)
    if (!item) { errors.push(`${id}: not found`); continue }
    if ((item.qualityScore ?? 0) < 80) continue // silently skip low-score

    const r = await approveInboxItem(id)
    if (r.ok) processed++
    else errors.push(`${id}: ${r.error}`)
  }

  revalidateInbox()
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
