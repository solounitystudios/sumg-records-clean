/**
 * lib/ai/generate.ts
 *
 * Server-only AI content generation helper.
 * Calls the OpenAI Chat Completions API via fetch — no extra npm package required.
 *
 * Supported content types:
 *   spotify_bio      — ~250-word streaming bio for Spotify artist profile
 *   apple_bio        — ~250-word bio formatted for Apple Music
 *   press_kit        — 400–600-word press kit overview
 *   ig_caption       — Short punchy Instagram caption with hashtags
 *   rollout_caption  — Phased rollout teaser caption (pre-save / drop day / post-release)
 *   playlist_pitch   — Short playlist pitch paragraph for DSP curators
 *   interview_answer — Thoughtful answer to a supplied interview question
 *   branding_copy    — Short-form branding tagline + descriptor paragraph
 */

import "server-only";
import { AIContentType } from "@/lib/ai/types";

export type { AIContentType };
export { AI_CONTENT_TYPES } from "@/lib/ai/types";

export interface ArtistPersona {
  name: string;
  genre?: string;
  role?: string;
  bio?: string;
  longBio?: string;
  instagramUrl?: string;
  spotifyUrl?: string;
}

export interface GenerateOptions {
  contentType: AIContentType;
  artist: ArtistPersona;
  /** Extra context supplied by the user (e.g. song title, release, interview question). */
  context?: string;
}

export interface GenerateResult {
  ok: true;
  content: string;
  contentType: AIContentType;
}

export interface GenerateError {
  ok: false;
  error: string;
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return [
    "You are a professional music industry copywriter specializing in artist branding and promotional content.",
    "Write in a contemporary, culturally aware tone that reflects the artist's genre and persona.",
    "Avoid clichés. Be specific, vivid, and evocative.",
    "Return only the requested copy — no headings, no meta-commentary, no instructions to the user.",
  ].join(" ");
}

function artistContext(artist: ArtistPersona): string {
  const lines: string[] = [`Artist name: ${artist.name}`];
  if (artist.genre) lines.push(`Genre / style: ${artist.genre}`);
  if (artist.role) lines.push(`Role: ${artist.role}`);
  if (artist.bio) lines.push(`Short bio: ${artist.bio}`);
  if (artist.longBio) lines.push(`Extended bio: ${artist.longBio}`);
  return lines.join("\n");
}

function buildUserPrompt(opts: GenerateOptions): string {
  const ctx = artistContext(opts.artist);
  const extra = opts.context?.trim() ? `\nAdditional context: ${opts.context.trim()}` : "";

  switch (opts.contentType) {
    case "spotify_bio":
      return `${ctx}${extra}\n\nWrite a compelling Spotify artist bio of approximately 250 words. Write in third person. Focus on artistic identity, sonic signature, and career highlights. This will appear on the Spotify artist profile page.`;

    case "apple_bio":
      return `${ctx}${extra}\n\nWrite an Apple Music artist bio of approximately 250 words. Write in third person. Apple Music bios tend to be more editorial and narrative-driven — tell the story behind the music. Avoid bullet points.`;

    case "press_kit":
      return `${ctx}${extra}\n\nWrite a press kit overview paragraph (400–600 words) suitable for media outreach. Write in third person. Include: who the artist is, their sonic and cultural influence, career trajectory, and what makes them noteworthy right now. End with a strong closing statement.`;

    case "ig_caption":
      return `${ctx}${extra}\n\nWrite a short, punchy Instagram caption (1–3 sentences maximum) for a music post. Capture the mood and energy of the artist. Append 5–8 relevant hashtags on a new line.`;

    case "rollout_caption":
      return `${ctx}${extra}\n\nWrite three distinct Instagram/social captions for a release rollout:\n1. Pre-save announcement (teaser mood)\n2. Drop day (urgent, hype)\n3. Post-release (gratitude + push to stream)\n\nSeparate each with a blank line and label them "Pre-save:", "Drop day:", and "Post-release:".`;

    case "playlist_pitch":
      return `${ctx}${extra}\n\nWrite a concise playlist pitch (3–4 sentences) addressed to a DSP playlist curator. Highlight the song's sonic qualities, mood, and target audience. Explain why it fits editorial playlisting. Keep it professional and specific.`;

    case "interview_answer":
      return `${ctx}${extra}\n\nWrite a thoughtful, authentic interview answer in first person (as the artist). The answer should feel natural and conversational — not scripted. Aim for 3–5 sentences. If a specific question is in the additional context, answer that question; otherwise answer "Tell us about your music and what drives you as an artist."`;

    case "branding_copy":
      return `${ctx}${extra}\n\nWrite branding copy consisting of:\n1. A one-line tagline (under 10 words)\n2. A brand descriptor paragraph (2–3 sentences) capturing the artist's aesthetic, values, and positioning.\n\nLabel them "Tagline:" and "Descriptor:".`;

    default:
      return `${ctx}${extra}\n\nGenerate promotional copy for this artist.`;
  }
}

// ─── OpenAI fetch helper ──────────────────────────────────────────────────────

interface OpenAIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIResponse {
  choices: { message: { content: string } }[];
}

async function callOpenAI(
  messages: OpenAIChatMessage[],
  model = "gpt-4o-mini",
  maxTokens = 700
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured on the server.");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.75,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => res.statusText);
    throw new Error(`OpenAI API error (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as OpenAIResponse;
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenAI returned an empty response.");
  return content;
}

// ─── Token budget by content type ────────────────────────────────────────────

const MAX_TOKENS: Partial<Record<AIContentType, number>> = {
  press_kit: 900,
  rollout_caption: 400,
  branding_copy: 200,
  ig_caption: 150,
  playlist_pitch: 200,
  interview_answer: 250,
  spotify_bio: 500,
  apple_bio: 500,
};

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateAIContent(
  opts: GenerateOptions
): Promise<GenerateResult | GenerateError> {
  try {
    const system = buildSystemPrompt();
    const user = buildUserPrompt(opts);
    const maxTokens = MAX_TOKENS[opts.contentType] ?? 600;

    const content = await callOpenAI(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      "gpt-4o-mini",
      maxTokens
    );

    return { ok: true, content, contentType: opts.contentType };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
