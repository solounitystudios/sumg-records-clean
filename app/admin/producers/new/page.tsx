import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { createProducer } from "@/app/actions/producers"
import { getDNAByType } from "@/lib/db/dna"

export const metadata = { title: "New Producer — SUMG Admin" }

const input =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"

const textarea =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition resize-y"

const label = "block text-[10px] uppercase tracking-[0.2em] text-white/35 mb-1.5"
const hint  = "mt-1 text-[10px] text-white/20"

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

export default async function NewProducerPage() {
  await requireAdmin()
  const dnaRecords = await getDNAByType("producer")

  return (
    <main className="px-6 py-10 md:px-10 max-w-2xl">
      <div className="mb-10">
        <Link href="/admin/producers" className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block">
          ← Producer Network
        </Link>
        <p className="text-xs uppercase tracking-[0.35em] text-white/30 mb-2">Admin</p>
        <h1 className="text-2xl font-semibold">New Producer</h1>
      </div>

      <form action={createProducer} className="space-y-6">

        {/* ── Core identity ────────────────────────────────────────── */}
        <Section title="Identity">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-name" className={label}>Name *</label>
              <input id="p-name" name="name" type="text" required placeholder="e.g. GRVND" className={input} />
            </div>
            <div>
              <label htmlFor="p-slug" className={label}>Slug *</label>
              <input id="p-slug" name="slug" type="text" required placeholder="e.g. grvnd"
                pattern="[a-z0-9-]+" title="Lowercase letters, numbers, and hyphens only" className={input} />
              <p className={hint}>Lowercase, hyphens only. Cannot be changed.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-status" className={label}>Status</label>
              <select id="p-status" name="status" defaultValue="active" className={input}>
                <option value="active"   className="bg-neutral-900">Active</option>
                <option value="inactive" className="bg-neutral-900">Inactive</option>
                <option value="archived" className="bg-neutral-900">Archived</option>
              </select>
            </div>
            <div>
              <label htmlFor="p-credits" className={label}>Credit Count</label>
              <input id="p-credits" name="creditCount" type="number" min="0" defaultValue="0" className={input} />
            </div>
          </div>

          <div>
            <label htmlFor="p-specialties" className={label}>Specialties</label>
            <input id="p-specialties" name="specialties" type="text" placeholder="Trap, Soul, Ambient" className={input} />
            <p className={hint}>Comma-separated.</p>
          </div>

          <div>
            <label htmlFor="p-bio" className={label}>Bio</label>
            <textarea id="p-bio" name="bio" rows={5} placeholder="Producer bio…" className={textarea} />
          </div>
        </Section>

        {/* ── Media ────────────────────────────────────────────────── */}
        <Section title="Media">
          <div>
            <label htmlFor="p-image" className={label}>Profile Image URL</label>
            <input id="p-image" name="image_url" type="url" placeholder="https://…" className={input} />
            <p className={hint}>Upload to <Link href="/admin/assets" className="underline underline-offset-2">Assets</Link> first, then paste the URL.</p>
          </div>
          <div>
            <label htmlFor="p-banner" className={label}>Banner / Hero Image URL</label>
            <input id="p-banner" name="banner_url" type="url" placeholder="https://…" className={input} />
          </div>
        </Section>

        {/* ── Social links ─────────────────────────────────────────── */}
        <Section title="Social Links">
          {[
            { key: "youtube",    label: "YouTube Channel",  ph: "https://youtube.com/@..." },
            { key: "instagram",  label: "Instagram",        ph: "https://instagram.com/..." },
            { key: "twitter",    label: "Twitter / X",      ph: "https://x.com/..." },
            { key: "soundcloud", label: "SoundCloud",       ph: "https://soundcloud.com/..." },
            { key: "tiktok",     label: "TikTok",           ph: "https://tiktok.com/@..." },
          ].map(({ key, label: lbl, ph }) => (
            <div key={key}>
              <label htmlFor={`p-social-${key}`} className={label}>{lbl}</label>
              <input id={`p-social-${key}`} name={`social_${key}`} type="url" placeholder={ph} className={input} />
            </div>
          ))}
        </Section>

        {/* ── YouTube automation ───────────────────────────────────── */}
        <Section title="YouTube Automation">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-yt-handle" className={label}>YouTube Handle</label>
              <input id="p-yt-handle" name="yt_handle" type="text" placeholder="@GRVNDbeats" className={input} />
            </div>
            <div>
              <label htmlFor="p-yt-id" className={label}>Channel ID</label>
              <input id="p-yt-id" name="yt_channel_id" type="text" placeholder="UC…" className={input} />
              <p className={hint}>Required for upload automation.</p>
            </div>
          </div>
          <div>
            <label htmlFor="p-yt-url" className={label}>Channel URL</label>
            <input id="p-yt-url" name="yt_channel_url" type="url" placeholder="https://youtube.com/@GRVNDbeats" className={input} />
          </div>
          <div>
            <label htmlFor="p-yt-cadence" className={label}>Upload Cadence (per day)</label>
            <input id="p-yt-cadence" name="yt_upload_cadence" type="number" min="1" max="10" defaultValue="3" className={input} />
          </div>
          <div>
            <label htmlFor="p-yt-title" className={label}>Default Title Template</label>
            <input id="p-yt-title" name="yt_title_template" type="text"
              placeholder="{TRACK} — {ARTIST} [Type Beat]" className={input} />
            <p className={hint}>Tokens: {"{TRACK}"}, {"{ARTIST}"}, {"{GENRE}"}, {"{YEAR}"}</p>
          </div>
          <div>
            <label htmlFor="p-yt-desc" className={label}>Default Description Template</label>
            <textarea id="p-yt-desc" name="yt_description_template" rows={4}
              placeholder={"🎧 {TRACK} — produced by {ARTIST}\n\n#typebeat #hiphop"} className={textarea} />
          </div>
          <div>
            <label htmlFor="p-yt-tags" className={label}>Default Tags</label>
            <textarea id="p-yt-tags" name="yt_default_tags" rows={4}
              placeholder={"type beat\nhip hop\nfree beat"} className={textarea} />
            <p className={hint}>One tag per line.</p>
          </div>
        </Section>

        {/* ── DNA link ─────────────────────────────────────────────── */}
        <Section title="DNA Profile">
          <div>
            <label htmlFor="p-dna" className={label}>Linked DNA Record</label>
            <select id="p-dna" name="dna_slug" className={input}>
              <option value="">None</option>
              {dnaRecords.map((d) => (
                <option key={d.slug} value={d.slug}>{d.name}</option>
              ))}
            </select>
            <p className={hint}>Links to the producer&apos;s DNA profile in the DNA System.</p>
          </div>
        </Section>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button type="submit"
            className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black hover:bg-white/90 transition">
            Create Producer
          </button>
          <Link href="/admin/producers"
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white/60 hover:border-white/40 hover:text-white transition">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  )
}
