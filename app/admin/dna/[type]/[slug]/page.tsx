import { notFound } from "next/navigation"
import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getDNABySlug } from "@/lib/db/dna"

interface Props { params: Promise<{ type: string; slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { type, slug } = await params
  if (type !== "artist" && type !== "producer") return { title: "Not Found — SUMG Admin" }
  const record = await getDNABySlug(type, slug)
  if (!record) return { title: "Not Found — SUMG Admin" }
  return { title: `${record.name} DNA — SUMG Admin` }
}

function Tags({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-[11px] text-white/20">—</span>
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <span key={t} className="text-[10px] px-2 py-0.5 rounded border border-white/[0.08] text-white/50 font-mono bg-white/[0.02]">{t}</span>
      ))}
    </div>
  )
}

function JsonBlock({ value }: { value: Record<string, unknown> | null }) {
  if (!value || Object.keys(value).length === 0) return <span className="text-[11px] text-white/20">—</span>
  return (
    <pre className="text-[10px] font-mono text-white/50 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 overflow-x-auto whitespace-pre-wrap leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-white/[0.07] rounded-2xl bg-[#0d1016] overflow-hidden">
      <div className="px-5 py-3 border-b border-white/[0.05]">
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">{title}</p>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.2em] text-white/25 mb-1.5">{label}</p>
      {children}
    </div>
  )
}

const PRIORITY_COLOR: Record<string, string> = {
  "flagship":          "text-amber-400 border-amber-400/30",
  "flagship producer": "text-amber-400 border-amber-400/30",
  "high":              "text-sky-400 border-sky-400/30",
}

export default async function DNADetailPage({ params }: Props) {
  await requireAdmin()
  const { type, slug } = await params

  if (type !== "artist" && type !== "producer") notFound()
  const record = await getDNABySlug(type, slug)
  if (!record) notFound()

  const listHref = type === "artist" ? "/admin/dna/artists" : "/admin/dna/producers"
  const listLabel = type === "artist" ? "Artist DNA" : "Producer DNA"

  return (
    <div className="px-6 py-8 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Link href={listHref} className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block">
          ← {listLabel}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{record.name}</h1>
            <p className="text-xs text-white/35 mt-1 font-mono">{record.slug} · {record.entity_type}</p>
          </div>
          <div className="flex items-center gap-3 flex-none">
            <span className={`text-[9px] px-2.5 py-1 rounded-full border font-medium uppercase tracking-wide ${PRIORITY_COLOR[record.priority_level] ?? "text-white/30 border-white/15"}`}>
              {record.priority_level}
            </span>
            <Link
              href={`/admin/dna/${type}/${slug}/edit`}
              className="text-[10px] uppercase tracking-[0.15em] border border-white/20 text-white/60 px-4 py-2 hover:border-white/40 hover:text-white transition-colors rounded-lg"
            >
              Edit
            </Link>
          </div>
        </div>
      </div>

      {/* Identity */}
      <Section title="Identity">
        {record.archetype && (
          <Field label="Archetype">
            <p className="text-sm text-white/70">{record.archetype}</p>
          </Field>
        )}
        {record.brand_positioning && (
          <Field label="Brand Positioning">
            <p className="text-sm text-white/60 leading-relaxed">{record.brand_positioning}</p>
          </Field>
        )}
        {record.identity_summary && (
          <Field label="Identity Summary">
            <p className="text-sm text-white/60 leading-relaxed">{record.identity_summary}</p>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status">
            <p className="text-xs text-white/50 font-mono">{record.status}</p>
          </Field>
          <Field label="Priority">
            <p className="text-xs text-white/50 font-mono">{record.priority_level}</p>
          </Field>
        </div>
      </Section>

      {/* Sonic */}
      <Section title="Sonic Profile">
        <Field label="Genre Core"><Tags items={record.genre_core} /></Field>
        <Field label="Genre Secondary"><Tags items={record.genre_secondary} /></Field>
        <Field label="Emotional Targets"><Tags items={record.emotional_targets} /></Field>
        <Field label="Mix Energy"><Tags items={record.mix_energy} /></Field>
        <Field label="Key Preferences"><Tags items={record.key_preferences} /></Field>
        {record.tempo_range && <Field label="Tempo Range"><JsonBlock value={record.tempo_range} /></Field>}
        {record.audience_profile && <Field label="Audience Profile"><JsonBlock value={record.audience_profile} /></Field>}
      </Section>

      {/* Vocal & Lyrical */}
      {(record.vocal_dna || record.lyrical_dna) && (
        <Section title="Vocal & Lyrical Rules">
          {record.vocal_dna && <Field label="Vocal DNA"><JsonBlock value={record.vocal_dna} /></Field>}
          {record.lyrical_dna && <Field label="Lyrical DNA"><JsonBlock value={record.lyrical_dna} /></Field>}
        </Section>
      )}

      {/* Arrangement */}
      {(record.arrangement_dna || record.instrumentation_rules || record.fx_language) && (
        <Section title="Arrangement & Sound">
          {record.arrangement_dna && <Field label="Arrangement DNA"><JsonBlock value={record.arrangement_dna} /></Field>}
          {record.instrumentation_rules && <Field label="Instrumentation Rules"><JsonBlock value={record.instrumentation_rules} /></Field>}
          {record.fx_language && <Field label="FX Language"><JsonBlock value={record.fx_language} /></Field>}
        </Section>
      )}

      {/* Suno / AI */}
      {(record.suno_metatag_rules || record.metadata_keywords.length > 0) && (
        <Section title="Suno / AI Presets">
          {record.suno_metatag_rules && <Field label="Suno Metatag Rules"><JsonBlock value={record.suno_metatag_rules} /></Field>}
          {record.metadata_keywords.length > 0 && <Field label="Metadata Keywords"><Tags items={record.metadata_keywords} /></Field>}
        </Section>
      )}

      {/* Forbidden */}
      {record.forbidden_elements.length > 0 && (
        <Section title="Forbidden Elements">
          <Tags items={record.forbidden_elements} />
        </Section>
      )}

      {/* Visual */}
      {(record.visual_dna || record.cover_art_dna || record.video_dna) && (
        <Section title="Visual DNA">
          {record.visual_dna && <Field label="Visual DNA"><JsonBlock value={record.visual_dna} /></Field>}
          {record.cover_art_dna && <Field label="Cover Art DNA"><JsonBlock value={record.cover_art_dna} /></Field>}
          {record.video_dna && <Field label="Video DNA"><JsonBlock value={record.video_dna} /></Field>}
        </Section>
      )}

      {/* Rollout */}
      {(record.rollout_dna || record.youtube_packaging_dna) && (
        <Section title="Rollout & Packaging">
          {record.rollout_dna && <Field label="Rollout DNA"><JsonBlock value={record.rollout_dna} /></Field>}
          {record.youtube_packaging_dna && <Field label="YouTube Packaging"><JsonBlock value={record.youtube_packaging_dna} /></Field>}
        </Section>
      )}

      {/* Collaborations */}
      {(record.best_producer_matches.length > 0 || record.best_artist_matches.length > 0) && (
        <Section title="Collaborations">
          {record.best_producer_matches.length > 0 && <Field label="Best Producer Matches"><Tags items={record.best_producer_matches} /></Field>}
          {record.best_artist_matches.length > 0 && <Field label="Best Artist Matches"><Tags items={record.best_artist_matches} /></Field>}
        </Section>
      )}

      {/* Notes */}
      {record.notes && (
        <Section title="Notes">
          <p className="text-sm text-white/55 leading-relaxed whitespace-pre-wrap">{record.notes}</p>
        </Section>
      )}

      {/* Footer */}
      <div className="text-[10px] text-white/20 font-mono pt-2">
        Created {new Date(record.created_at).toLocaleDateString()} · Updated {new Date(record.updated_at).toLocaleDateString()}
      </div>
    </div>
  )
}
