import Link from "next/link"
import { getProducers } from "@/lib/db/producers"
import { createProducer } from "@/app/actions/producers"

export const metadata = { title: "Producer Network — SUMG Admin" }

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition"

const labelClass = "block text-xs uppercase tracking-[0.2em] text-white/40 mb-2"

export default async function ProducersAdminPage() {
  const producers = await getProducers()
  const totalCredits = producers.reduce((s, p) => s + p.credits, 0)

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <h1 className="text-3xl font-semibold">Producer Network</h1>
        <p className="mt-2 text-sm text-white/50">Manage the SUMG producer roster.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-10">
        {[
          { label: "Total Producers", value: producers.length },
          { label: "Total Credits", value: totalCredits },
          { label: "Specialties", value: [...new Set(producers.flatMap((p) => p.specialties))].length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {producers.map((producer, index) => (
            <div
              key={producer.id}
              className="rounded-2xl border border-white/10 bg-[#0d1016] overflow-hidden"
            >
              <div className="flex items-start gap-5 p-6">
                <div className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-sm font-semibold text-white/60 shrink-0">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="text-base font-semibold">{producer.name}</h3>
                      <p className="text-xs text-white/35 mt-0.5">{producer.credits} credits</p>
                    </div>
                    <Link
                      href={`/producers/${producer.slug}`}
                      className="text-xs text-white/40 hover:text-white transition shrink-0"
                    >
                      Public Profile →
                    </Link>
                  </div>

                  {producer.bio && (
                    <p className="mt-3 text-sm text-white/50 leading-6 max-w-2xl line-clamp-2">{producer.bio}</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {producer.specialties.map((spec) => (
                      <span
                        key={spec}
                        className="text-xs px-2 py-0.5 rounded-full border border-white/10 text-white/35"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {producers.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-10 text-center text-sm text-white/35">
              No producers yet. Add the first one →
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-6 self-start">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-6">Add Producer</h2>

          <form action={createProducer} className="space-y-4">
            <div>
              <label htmlFor="p-name" className={labelClass}>Name</label>
              <input
                id="p-name"
                name="name"
                type="text"
                required
                placeholder="e.g. GRVND"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="p-slug" className={labelClass}>Slug</label>
              <input
                id="p-slug"
                name="slug"
                type="text"
                required
                placeholder="e.g. grvnd"
                pattern="[a-z0-9-]+"
                title="Lowercase letters, numbers, and hyphens only"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-white/25">Lowercase, hyphens only.</p>
            </div>

            <div>
              <label htmlFor="p-credits" className={labelClass}>Credits</label>
              <input
                id="p-credits"
                name="creditCount"
                type="number"
                min="0"
                defaultValue="0"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="p-specialties" className={labelClass}>Specialties</label>
              <input
                id="p-specialties"
                name="specialties"
                type="text"
                placeholder="e.g. Trap, Soul, Ambient"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-white/25">Comma-separated values.</p>
            </div>

            <div>
              <label htmlFor="p-bio" className={labelClass}>Bio</label>
              <textarea
                id="p-bio"
                name="bio"
                rows={4}
                placeholder="Short bio…"
                className={`${inputClass} resize-none`}
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
            >
              Add Producer
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
