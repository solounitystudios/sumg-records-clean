"use client";

import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { FormField, FormSection } from "@/components/admin/FormField";
import { useCmsStore } from "@/lib/cms/store";
import { AI_CONTENT_TYPES, AIContentType } from "@/lib/ai/types";

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select all text in a textarea
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-[10px] tracking-[0.2em] uppercase border border-white/10 px-3 py-1.5 text-white/40 hover:border-white/25 hover:text-white transition-colors"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

// ─── Output panel ─────────────────────────────────────────────────────────────

function OutputPanel({
  content,
  label,
}: {
  content: string;
  label: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] tracking-[0.2em] uppercase text-white/30">
          {label} — Output
        </p>
        <CopyButton text={content} />
      </div>
      <pre className="whitespace-pre-wrap font-sans text-sm text-white/80 bg-white/[0.03] border border-white/[0.08] p-5 leading-relaxed">
        {content}
      </pre>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AIContentPage() {
  const { artists } = useCmsStore();

  const [artistSlug, setArtistSlug] = useState<string>("");
  const [contentType, setContentType] = useState<AIContentType>("spotify_bio");
  const [context, setContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeArtists = artists.filter((a) => a.status !== "archived");
  const selectedArtist = artists.find((a) => a.slug === artistSlug);
  const selectedTypeLabel =
    AI_CONTENT_TYPES.find((t) => t.value === contentType)?.label ?? contentType;

  async function handleGenerate() {
    if (!artistSlug) {
      setError("Please select an artist.");
      return;
    }
    setError(null);
    setOutput(null);
    setGenerating(true);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistSlug, contentType, context: context.trim() || undefined }),
      });

      const data = (await res.json()) as { ok: boolean; content?: string; error?: string };

      if (!data.ok || !data.content) {
        setError(data.error ?? "Unknown error from AI service.");
      } else {
        setOutput(data.content);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <AdminShell title="AI Content Engine">
      <div className="max-w-2xl space-y-10">
        {/* Intro */}
        <div className="space-y-1">
          <p className="text-[11px] text-white/30 leading-relaxed">
            Generate platform-ready copy using the artist's persona memory — bio, genre,
            and social identity. Select an artist, choose a content type, add optional context,
            and generate.
          </p>
        </div>

        {/* Controls */}
        <FormSection title="Content Settings">
          <FormField
            type="select"
            label="Artist"
            value={artistSlug}
            onChange={(v) => {
              setArtistSlug(v);
              setOutput(null);
              setError(null);
            }}
            options={[
              { value: "", label: "— Select an artist —" },
              ...activeArtists.map((a) => ({ value: a.slug, label: a.name })),
            ]}
          />

          <FormField
            type="select"
            label="Content Type"
            value={contentType}
            onChange={(v) => {
              setContentType(v as AIContentType);
              setOutput(null);
              setError(null);
            }}
            options={AI_CONTENT_TYPES}
          />

          <FormField
            type="textarea"
            label="Additional Context"
            hint="Optional — e.g. song title, release date, interview question, campaign phase."
            rows={3}
            value={context}
            onChange={setContext}
            placeholder="e.g. New single 'Hollow Sun' drops June 6th. Answer the question: What inspired this track?"
          />
        </FormSection>

        {/* Artist persona preview */}
        {selectedArtist && (
          <FormSection title="Artist Persona Memory">
            <div className="space-y-2 text-[11px] text-white/40 leading-relaxed">
              <p>
                <span className="text-white/20 uppercase tracking-[0.15em] text-[9px]">Name</span>{" "}
                <span className="text-white/70">{selectedArtist.name}</span>
              </p>
              {selectedArtist.genre && (
                <p>
                  <span className="text-white/20 uppercase tracking-[0.15em] text-[9px]">Genre</span>{" "}
                  <span className="text-white/70">{selectedArtist.genre}</span>
                </p>
              )}
              {selectedArtist.role && (
                <p>
                  <span className="text-white/20 uppercase tracking-[0.15em] text-[9px]">Role</span>{" "}
                  <span className="text-white/70">{selectedArtist.role}</span>
                </p>
              )}
              {selectedArtist.bio && (
                <p>
                  <span className="text-white/20 uppercase tracking-[0.15em] text-[9px]">Bio</span>{" "}
                  <span className="text-white/60">{selectedArtist.bio}</span>
                </p>
              )}
              {!selectedArtist.bio && !selectedArtist.genre && (
                <p className="text-white/20 italic">
                  This artist has no bio or genre set — add them in the artist editor for better output.
                </p>
              )}
            </div>
          </FormSection>
        )}

        {/* Generate button */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !artistSlug}
            className="border border-white/20 px-6 py-2.5 text-[10px] tracking-[0.2em] uppercase text-white/70 hover:border-white/40 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {generating ? "Generating…" : `Generate ${selectedTypeLabel}`}
          </button>
          {generating && (
            <span className="text-[10px] text-white/25 animate-pulse">
              Calling AI…
            </span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="border border-red-800/40 bg-red-900/10 px-4 py-3 text-[11px] text-red-300">
            {error}
          </div>
        )}

        {/* Output */}
        {output && (
          <OutputPanel
            content={output}
            label={selectedTypeLabel}
          />
        )}

        {/* Content type reference */}
        <FormSection title="Content Types Reference">
          <div className="grid grid-cols-2 gap-2">
            {AI_CONTENT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setContentType(t.value);
                  setOutput(null);
                  setError(null);
                }}
                className={`text-left border px-3 py-2 text-[10px] tracking-[0.1em] uppercase transition-colors ${
                  contentType === t.value
                    ? "border-white/25 text-white bg-white/[0.04]"
                    : "border-white/[0.06] text-white/30 hover:border-white/15 hover:text-white/60"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </FormSection>
      </div>
    </AdminShell>
  );
}
