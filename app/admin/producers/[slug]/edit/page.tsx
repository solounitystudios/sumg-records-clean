import { notFound } from "next/navigation"
import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { getProducerBySlug } from "@/lib/db/producers"
import { getDNAByType } from "@/lib/db/dna"
import { updateProducer } from "@/app/actions/producers"

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const producer = await getProducerBySlug(slug)
  if (!producer) return { title: "Not Found — SUMG Admin" }
  return { title: `Edit ${producer.name} — SUMG Admin` }
}

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

export default async function EditProducerPage({ params }: Props) {
  await requireAdmin()
  const { slug } = await params
  const [producer, dnaRecords] = await Promise.all([
    getProducerBySlug(slug),
    getDNAByType("producer"),
  ])
  if (!producer) notFound()

  const action = updateProducer.bind(null, slug)
  const sl = producer.socialLinks ?? {}

  return (
    <main className="px-6 py-10 md:px-10 max-w-2xl">
      <div className="mb-10">
        <Link href="/admin/producers" className="text-xs uppercase tracking-[0.2em] text-white/35 hover:text-white transition mb-4 inline-block">
          ← Producer Network
        </Link>
        <p className="text-xs uppercase tracking-[0.35em] text-white/30 mb-2">Admin</p>
        <h1 className="text-2xl font-semibold">Edit Producer</h1>
        <p className="mt-1 text-sm text-white/40">{producer.name}</p>
      </div>

      {/* Quick links */}
      <div className="flex gap-3 mb-8">
        <Link href={`/admin/producers/${slug}/assets`}
          className="text-[10px] uppercase tracking-[0.15em] border border-white/10 text-white/35 px-4 py-2 hover:border-white/25 hover:text-white transition-colors rounded-lg">
          Asset Bin →
        </Link>
        {producer.dnaSlug && (
          <Link href={`/admin/dna/producer/${producer.dnaSlug}`}
            className="text-[10px] uppercase tracking-[0.15em] border border-sky-500/25 text-sky-400/60 px-4 py-2 hover:border-sky-500/40 transition-colors rounded-lg">
            DNA Profile →
          </Link>
        )}
        {producer.ytChannelUrl && (
          <a href={producer.ytChannelUrl} target="_blank" rel="noopener noreferrer"
            className="text-[10px] uppercase tracking-[0.15em] border border-red-500/20 text-red-400/50 px-4 py-2 hover:border-red-500/40 transition-colors rounded-lg">
            YouTube ↗
          </a>
        )}
      </div>

      <form action={action} className="space-y-6">

        {/* ── Core identity ────────────────────────────────────────── */}
        <Section title="Identity">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-name" className={label}>Name</label>
              <input id="p-name" name="name" type="text" required defaultValue={producer.name} className={input} />
            </div>
            <div>
              <label htmlFor="p-status" className={label}>Status</label>
              <select id="p-status" name="status" defaultValue={producer.status ?? "active"} className={input}>
                <option value="active"   className="bg-neutral-900">Active</option>
                <option value="inactive" className="bg-neutral-900">Inactive</option>
                <option value="archived" className="bg-neutral-900">Archived</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-credits" className={label}>Credit Count</label>
              <input id="p-credits" name="creditCount" type="number" min="0" defaultValue={producer.credits} className={input} />
            </div>
            <div>
              <label htmlFor="p-specialties" className={label}>Specialties</label>
              <input id="p-specialties" name="specialties" type="text"
                defaultValue={producer.specialties.join(", ")} placeholder="Trap, Soul, Ambient" className={input} />
            </div>
          </div>

          <div>
            <label htmlFor="p-bio" className={label}>Bio</label>
            <textarea id="p-bio" name="bio" rows={5} defaultValue={producer.bio} className={textarea} />
          </div>

          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-[10px] text-white/25 font-mono">
            Slug: {producer.slug} — cannot be changed
          </div>
        </Section>

        {/* ── Media ────────────────────────────────────────────────── */}
        <Section title="Media">
          <div>
            <label htmlFor="p-image" className={label}>Profile Image URL</label>
            <input id="p-image" name="image_url" type="url" defaultValue={producer.imageUrl ?? ""}
              placeholder="https://…" className={input} />
            <p className={hint}>Upload to <Link href="/admin/assets" className="underline underline-offset-2">Assets</Link> first, then paste the URL.</p>
          </div>
          <div>
            <label htmlFor="p-banner" className={label}>Banner / Hero Image URL</label>
            <input id="p-banner" name="banner_url" type="url" defaultValue={producer.bannerUrl ?? ""}
              placeholder="https://…" className={input} />
          </div>
        </Section>

        {/* ── Social links ─────────────────────────────────────────── */}
        <Section title="Social Links">
          {[
            { key: "youtube",    lbl: "YouTube Channel",  ph: "https://youtube.com/@..." },
            { key: "instagram",  lbl: "Instagram",        ph: "https://instagram.com/..." },
            { key: "twitter",    lbl: "Twitter / X",      ph: "https://x.com/..." },
            { key: "soundcloud", lbl: "SoundCloud",       ph: "https://soundcloud.com/..." },
            { key: "tiktok",     lbl: "TikTok",           ph: "https://tiktok.com/@..." },
          ].map(({ key, lbl, ph }) => (
            <div key={key}>
              <label htmlFor={`p-social-${key}`} className={label}>{lbl}</label>
              <input id={`p-social-${key}`} name={`social_${key}`} type="url"
                defaultValue={sl[key as keyof typeof sl] ?? ""} placeholder={ph} className={input} />
            </div>
          ))}
        </Section>

        {/* ── YouTube automation ───────────────────────────────────── */}
        <Section title="YouTube Automation">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-yt-handle" className={label}>YouTube Handle</label>
              <input id="p-yt-handle" name="yt_handle" type="text"
                defaultValue={producer.ytHandle ?? ""} placeholder="@GRVNDbeats" className={input} />
            </div>
            <div>
              <label htmlFor="p-yt-id" className={label}>Channel ID</label>
              <input id="p-yt-id" name="yt_channel_id" type="text"
                defaultValue={producer.ytChannelId ?? ""} placeholder="UC…" className={input} />
              <p className={hint}>Required for upload automation.</p>
            </div>
          </div>
          <div>
            <label htmlFor="p-yt-url" className={label}>Channel URL</label>
            <input id="p-yt-url" name="yt_channel_url" type="url"
              defaultValue={producer.ytChannelUrl ?? ""} placeholder="https://youtube.com/@GRVNDbeats" className={input} />
          </div>
          <div>
            <label htmlFor="p-yt-cadence" className={label}>Upload Cadence (per day)</label>
            <input id="p-yt-cadence" name="yt_upload_cadence" type="number" min="1" max="10"
              defaultValue={producer.ytUploadCadence ?? 3} className={input} />
          </div>
          <div>
            <label htmlFor="p-yt-title" className={label}>Default Title Template</label>
            <input id="p-yt-title" name="yt_title_template" type="text"
              defaultValue={producer.ytTitleTemplate ?? ""}
              placeholder="{TRACK} — {ARTIST} [Type Beat]" className={input} />
            <p className={hint}>Tokens: {"{TRACK}"}, {"{ARTIST}"}, {"{GENRE}"}, {"{YEAR}"}</p>
          </div>
          <div>
            <label htmlFor="p-yt-desc" className={label}>Default Description Template</label>
            <textarea id="p-yt-desc" name="yt_description_template" rows={5}
              defaultValue={producer.ytDescriptionTemplate ?? ""}
              placeholder={"🎧 {TRACK} — produced by {ARTIST}\n\n#typebeat #hiphop"} className={textarea} />
          </div>
          <div>
            <label htmlFor="p-yt-tags" className={label}>Default Tags</label>
            <textarea id="p-yt-tags" name="yt_default_tags" rows={4}
              defaultValue={(producer.ytDefaultTags ?? []).join("\n")}
              placeholder={"type beat\nhip hop\nfree beat"} className={textarea} />
            <p className={hint}>One tag per line.</p>
          </div>
        </Section>

        {/* ── DNA link ─────────────────────────────────────────────── */}
        <Section title="DNA Profile">
          <div>
            <label htmlFor="p-dna" className={label}>Linked DNA Record</label>
            <select id="p-dna" name="dna_slug" defaultValue={producer.dnaSlug ?? ""} className={input}>
              <option value="">None</option>
              {dnaRecords.map((d) => (
                <option key={d.slug} value={d.slug}>{d.name}</option>
              ))}
            </select>
          </div>
        </Section>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button type="submit"
            className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black hover:bg-white/90 transition">
            Save Changes
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
