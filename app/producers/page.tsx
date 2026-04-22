import { getProducers } from "@/lib/db/producers"

export const metadata = { title: "Producers — SUMG Records" }

export default async function ProducersPage() {
  const producers = await getProducers()

  return (
    <main className="min-h-screen bg-[#06070a] text-white">
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
        <div className="mb-14">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40 mb-3">Sound Architects</p>
          <h1 className="text-4xl font-semibold md:text-6xl">Producer Network</h1>
          <p className="mt-5 max-w-2xl text-base text-white/60 leading-7">
            The producers behind SUMG&apos;s sonic identity. Each brings a distinct approach
            to production — together they shape the sound of the label.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {producers.map((producer, index) => (
            <div
              key={producer.slug}
              className="rounded-3xl border border-white/10 bg-[#0d1016] p-8"
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-white/35 mb-2">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <h2 className="text-2xl font-semibold">{producer.name}</h2>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">{producer.credits}</div>
                  <div className="text-xs uppercase tracking-[0.15em] text-white/35">Credits</div>
                </div>
              </div>

              <p className="text-sm text-white/55 leading-7 mb-6">{producer.bio}</p>

              <div className="flex flex-wrap gap-2">
                {producer.specialties.map((spec) => (
                  <span
                    key={spec}
                    className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.12em] text-white/45"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
