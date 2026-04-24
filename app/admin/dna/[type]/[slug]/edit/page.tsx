import { notFound } from "next/navigation"
import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getDNABySlug } from "@/lib/db/dna"
import { updateDNARecord } from "@/app/actions/dna"

interface Props { params: Promise<{ type: string; slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { type, slug } = await params
  if (type !== "artist" && type !== "producer") return { title: "Not Found — SUMG Admin" }
  const record = await getDNABySlug(type, slug)
  if (!record) return { title: "Not Found — SUMG Admin" }
  return { title: `Edit ${record.name} DNA — SUMG Admin` }
}

const input =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"

const textarea =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition resize-y"

const codeTextarea =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[11px] font-mono text-white/70 placeholder:text-white/20 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition resize-y leading-relaxed"

const label = "block text-[10px] uppercase tracking-[0.2em] text-white/35 mb-1.5"

const hint = "mt-1 text-[10px] text-white/20"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#0d1016] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.05]">
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">{title}</p>
      </div>
      <div className="px-5 py-5 space-y-5">{children}</div>
    </div>
  )
}

function jsonDefault(value: Record<string, unknown> | null): string {
  if (!value || Object.keys(value).length === 0) return ""
  return JSON.stringify(value, null, 2)
}

export default async function EditDNAPage({ params }: Props) {
  await requireAdmin()
  const { type, slug } = await params

  if (type !== "artist" && type !== "producer") notFound()
  const record = await getDNABySlug(type, slug)
  if (!record) notFound()

  const action = updateDNARecord.bind(null, record.id)
  const detailHref = `/admin/dna/${type}/${slug}`

  return (
    <main className="px-6 py-10 md:px-10 max-w-2xl">
      {/* Header */}
      <div className="mb-10">
        <Link href={detailHref} className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block">
          ← {record.name}
        </Link>
        <p className="text-xs uppercase tracking-[0.35em] text-white/30 mb-2">DNA System</p>
        <h1 className="text-2xl font-semibold">Edit DNA</h1>
        <p className="mt-1 text-sm text-white/40">{record.name} · {record.entity_type}</p>
      </div>

      <form action={action} className="space-y-6">
        {/* Hidden routing fields */}
        <input type="hidden" name="entity_type" value={record.entity_type} />
        <input type="hidden" name="slug" value={record.slug} />

        {/* ── Identity ─────────────────────────────────────────────── */}
        <Section title="Identity">
          <div>
            <label htmlFor="dna-name" className={label}>Name</label>
            <input id="dna-name" name="name" type="text" required defaultValue={record.name} className={input} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="dna-status" className={label}>Status</label>
              <select id="dna-status" name="status" defaultValue={record.status} className={input}>
                <option value="active"   className="bg-neutral-900">Active</option>
                <option value="inactive" className="bg-neutral-900">Inactive</option>
                <option value="archived" className="bg-neutral-900">Archived</option>
              </select>
            </div>
            <div>
              <label htmlFor="dna-priority" className={label}>Priority Level</label>
              <select id="dna-priority" name="priority_level" defaultValue={record.priority_level} className={input}>
                <option value="flagship"          className="bg-neutral-900">Flagship</option>
                <option value="flagship producer" className="bg-neutral-900">Flagship Producer</option>
                <option value="high"              className="bg-neutral-900">High</option>
                <option value="medium"            className="bg-neutral-900">Medium</option>
                <option value="low"               className="bg-neutral-900">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="dna-archetype" className={label}>Archetype</label>
            <input id="dna-archetype" name="archetype" type="text" placeholder="e.g. The Storyteller" defaultValue={record.archetype ?? ""} className={input} />
          </div>

          <div>
            <label htmlFor="dna-brand" className={label}>Brand Positioning</label>
            <textarea id="dna-brand" name="brand_positioning" rows={3} placeholder="One-paragraph brand positioning statement…" defaultValue={record.brand_positioning ?? ""} className={textarea} />
          </div>

          <div>
            <label htmlFor="dna-identity" className={label}>Identity Summary</label>
            <textarea id="dna-identity" name="identity_summary" rows={4} placeholder="Comprehensive identity summary…" defaultValue={record.identity_summary ?? ""} className={textarea} />
          </div>
        </Section>

        {/* ── Genre Core ───────────────────────────────────────────── */}
        <Section title="Genre & Sonic Core">
          <div>
            <label htmlFor="dna-genre-core" className={label}>Genre Core</label>
            <textarea id="dna-genre-core" name="genre_core" rows={4} placeholder={"Hip-Hop\nR&B\nTrap"} defaultValue={record.genre_core.join("\n")} className={textarea} />
            <p className={hint}>One entry per line.</p>
          </div>
          <div>
            <label htmlFor="dna-genre-sec" className={label}>Genre Secondary</label>
            <textarea id="dna-genre-sec" name="genre_secondary" rows={3} placeholder={"Soul\nAlternative"} defaultValue={record.genre_secondary.join("\n")} className={textarea} />
            <p className={hint}>One entry per line.</p>
          </div>
          <div>
            <label htmlFor="dna-keys" className={label}>Key Preferences</label>
            <textarea id="dna-keys" name="key_preferences" rows={3} placeholder={"C minor\nF# major"} defaultValue={record.key_preferences.join("\n")} className={textarea} />
            <p className={hint}>One entry per line.</p>
          </div>
        </Section>

        {/* ── Mood Language ────────────────────────────────────────── */}
        <Section title="Mood Language">
          <div>
            <label htmlFor="dna-emotional" className={label}>Emotional Targets</label>
            <textarea id="dna-emotional" name="emotional_targets" rows={4} placeholder={"introspective\nempowered\nnostalgic"} defaultValue={record.emotional_targets.join("\n")} className={textarea} />
            <p className={hint}>One entry per line.</p>
          </div>
          <div>
            <label htmlFor="dna-energy" className={label}>Mix Energy</label>
            <textarea id="dna-energy" name="mix_energy" rows={3} placeholder={"cinematic\nhigh-energy\nmelancholic"} defaultValue={record.mix_energy.join("\n")} className={textarea} />
            <p className={hint}>One entry per line.</p>
          </div>
          <div>
            <label htmlFor="dna-tempo" className={label}>Tempo Range (JSON)</label>
            <textarea id="dna-tempo" name="tempo_range" rows={4} placeholder={'{\n  "min": 80,\n  "max": 140,\n  "sweet_spot": 100\n}'} defaultValue={jsonDefault(record.tempo_range)} className={codeTextarea} />
          </div>
        </Section>

        {/* ── Vocal Rules ──────────────────────────────────────────── */}
        <Section title="Vocal Rules">
          <div>
            <label htmlFor="dna-vocal" className={label}>Vocal DNA (JSON)</label>
            <textarea id="dna-vocal" name="vocal_dna" rows={8} placeholder={'{\n  "style": "melodic trap",\n  "range": "tenor",\n  "delivery": ["ad-libs", "ad-libs-heavy"],\n  "avoid": ["oversinging"]\n}'} defaultValue={jsonDefault(record.vocal_dna)} className={codeTextarea} />
          </div>
          <div>
            <label htmlFor="dna-lyrical" className={label}>Lyrical DNA (JSON)</label>
            <textarea id="dna-lyrical" name="lyrical_dna" rows={8} placeholder={'{\n  "themes": ["street narratives", "ambition"],\n  "pov": "first-person",\n  "vocabulary": "street-academic"\n}'} defaultValue={jsonDefault(record.lyrical_dna)} className={codeTextarea} />
          </div>
        </Section>

        {/* ── Arrangement Rules ────────────────────────────────────── */}
        <Section title="Arrangement Rules">
          <div>
            <label htmlFor="dna-arrangement" className={label}>Arrangement DNA (JSON)</label>
            <textarea id="dna-arrangement" name="arrangement_dna" rows={8} placeholder={'{\n  "structure": "verse-hook-verse-hook-bridge",\n  "drop": "hard",\n  "layers": "minimal intro, full outro"\n}'} defaultValue={jsonDefault(record.arrangement_dna)} className={codeTextarea} />
          </div>
          <div>
            <label htmlFor="dna-instruments" className={label}>Instrumentation Rules (JSON)</label>
            <textarea id="dna-instruments" name="instrumentation_rules" rows={6} placeholder={'{\n  "drums": "808-forward",\n  "melodics": ["piano", "strings"],\n  "avoid": ["live drums"]\n}'} defaultValue={jsonDefault(record.instrumentation_rules)} className={codeTextarea} />
          </div>
          <div>
            <label htmlFor="dna-fx" className={label}>FX Language (JSON)</label>
            <textarea id="dna-fx" name="fx_language" rows={5} placeholder={'{\n  "reverb": "room, not hall",\n  "delays": "triplet",\n  "signature": "tape saturation"\n}'} defaultValue={jsonDefault(record.fx_language)} className={codeTextarea} />
          </div>
        </Section>

        {/* ── Suno / AI Presets ────────────────────────────────────── */}
        <Section title="Suno / AI Presets">
          <div>
            <label htmlFor="dna-suno" className={label}>Suno Metatag Rules (JSON)</label>
            <textarea id="dna-suno" name="suno_metatag_rules" rows={8} placeholder={'{\n  "metatags": ["dark trap", "melodic", "808 heavy"],\n  "exclude": ["EDM", "house"],\n  "bpm_hint": 140\n}'} defaultValue={jsonDefault(record.suno_metatag_rules)} className={codeTextarea} />
          </div>
          <div>
            <label htmlFor="dna-keywords" className={label}>Metadata Keywords</label>
            <textarea id="dna-keywords" name="metadata_keywords" rows={4} placeholder={"hip-hop\nurban\ncinematic\nlyricism"} defaultValue={record.metadata_keywords.join("\n")} className={textarea} />
            <p className={hint}>One entry per line. Used for platform metadata tagging.</p>
          </div>
        </Section>

        {/* ── Visual DNA ───────────────────────────────────────────── */}
        <Section title="Visual DNA">
          <div>
            <label htmlFor="dna-visual" className={label}>Visual DNA (JSON)</label>
            <textarea id="dna-visual" name="visual_dna" rows={8} placeholder={'{\n  "palette": ["black", "gold", "deep red"],\n  "aesthetic": "luxury streetwear",\n  "mood_board_refs": ["Kendrick Lamar TPAB era"]\n}'} defaultValue={jsonDefault(record.visual_dna)} className={codeTextarea} />
          </div>
          <div>
            <label htmlFor="dna-cover" className={label}>Cover Art DNA (JSON)</label>
            <textarea id="dna-cover" name="cover_art_dna" rows={6} placeholder={'{\n  "style": "dark photography",\n  "typography": "bold serif",\n  "avoid": ["stock imagery"]\n}'} defaultValue={jsonDefault(record.cover_art_dna)} className={codeTextarea} />
          </div>
          <div>
            <label htmlFor="dna-video" className={label}>Video DNA (JSON)</label>
            <textarea id="dna-video" name="video_dna" rows={5} placeholder={'{\n  "format": "cinematic short-form",\n  "color_grade": "teal-orange",\n  "editing": "cut-on-beat"\n}'} defaultValue={jsonDefault(record.video_dna)} className={codeTextarea} />
          </div>
        </Section>

        {/* ── Forbidden Elements ───────────────────────────────────── */}
        <Section title="Forbidden Elements">
          <div>
            <label htmlFor="dna-forbidden" className={label}>Forbidden Elements</label>
            <textarea id="dna-forbidden" name="forbidden_elements" rows={5} placeholder={"country elements\nlive band arrangements\nauto-tune overuse"} defaultValue={record.forbidden_elements.join("\n")} className={textarea} />
            <p className={hint}>One entry per line. Hard constraints that must never appear in this artist's work.</p>
          </div>
        </Section>

        {/* ── Rollout & Packaging ──────────────────────────────────── */}
        <Section title="Rollout & Packaging">
          <div>
            <label htmlFor="dna-rollout" className={label}>Rollout DNA (JSON)</label>
            <textarea id="dna-rollout" name="rollout_dna" rows={8} placeholder={'{\n  "release_cadence": "single every 6 weeks",\n  "pre_save_window": "2 weeks",\n  "platform_priority": ["Spotify", "Apple Music", "YouTube"]\n}'} defaultValue={jsonDefault(record.rollout_dna)} className={codeTextarea} />
          </div>
          <div>
            <label htmlFor="dna-yt" className={label}>YouTube Packaging DNA (JSON)</label>
            <textarea id="dna-yt" name="youtube_packaging_dna" rows={6} placeholder={'{\n  "thumbnail_style": "face-forward, high contrast",\n  "title_format": "ARTIST - TRACK (Official Video)",\n  "tags": ["hip-hop", "new music"]\n}'} defaultValue={jsonDefault(record.youtube_packaging_dna)} className={codeTextarea} />
          </div>
        </Section>

        {/* ── Collaborations ───────────────────────────────────────── */}
        <Section title="Collaborations">
          <div>
            <label htmlFor="dna-producers" className={label}>Best Producer Matches</label>
            <textarea id="dna-producers" name="best_producer_matches" rows={3} placeholder={"Metro Boomin\nMike WiLL Made-It"} defaultValue={record.best_producer_matches.join("\n")} className={textarea} />
            <p className={hint}>One entry per line.</p>
          </div>
          <div>
            <label htmlFor="dna-artists" className={label}>Best Artist Matches</label>
            <textarea id="dna-artists" name="best_artist_matches" rows={3} placeholder={"Future\nYoung Thug"} defaultValue={record.best_artist_matches.join("\n")} className={textarea} />
            <p className={hint}>One entry per line.</p>
          </div>
          <div>
            <label htmlFor="dna-audience" className={label}>Audience Profile (JSON)</label>
            <textarea id="dna-audience" name="audience_profile" rows={6} placeholder={'{\n  "age_range": "18-35",\n  "core_markets": ["US", "UK", "CA"],\n  "listening_context": ["gym", "commute", "parties"]\n}'} defaultValue={jsonDefault(record.audience_profile)} className={codeTextarea} />
          </div>
        </Section>

        {/* ── Notes ────────────────────────────────────────────────── */}
        <Section title="Notes">
          <div>
            <label htmlFor="dna-notes" className={label}>Internal Notes</label>
            <textarea id="dna-notes" name="notes" rows={5} defaultValue={record.notes ?? ""} placeholder="Any additional context, exceptions, or reminders…" className={textarea} />
          </div>
        </Section>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black hover:bg-white/90 transition"
          >
            Save DNA
          </button>
          <Link
            href={detailHref}
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/60 hover:border-white/40 hover:text-white transition"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  )
}
