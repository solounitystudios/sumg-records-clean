import { notFound } from "next/navigation"
import Link from "next/link"
import { getProducers, getProducerBySlug } from "@/lib/db/producers"
import { getReleases } from "@/lib/db/releases"
import { formatStreams } from "@/lib/data"

export async function generateStaticParams() {
  const producers = await getProducers()
  return producers.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const producer = await getProducerBySlug(slug)
  if (!producer) return { title: "Producer Not Found — SUMG Records" }
  return { title: `${producer.name} — SUMG Records` }
}

export default async function ProducerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const producer = await getProducerBySlug(slug)
  if (!producer) notFound()

  const allReleases = await getReleases()
  const liveReleases = allReleases.filter((r) => r.status === "live")
  const totalStreams = liveReleases.reduce((s, r) => s + r.streams, 0)

  return (
    <main className="min-h-screen bg-[#06070a] text-white">
      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
        <Link
          href="/producers"
          className="mb-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/40 hover:text-white transition"
        >
          ← Producer Network
        </Link>

        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/40 mb-3">Sound Architect</p>
            <h1 className="text-5xl font-semibold md:text-7xl">{producer.name}</h1>

            <p className="mt-8 text-base leading-8 text-white/65 max-w-2xl">{producer.bio}</p>

            <div className="mt-8 flex flex-wrap gap-2">
              {producer.specialties.map((spec) => (
                <span
                  key={spec}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.15em] text-white/50"
                >
                  {spec}
                </span>
              ))}
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-2xl font-semibold">{producer.credits}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/40">Production Credits</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-2xl font-semibold">{producer.specialties.length}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/40">Specialties</div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-5">
              <h3 className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">Catalog Context</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Total Roster Streams</span>
                  <span className="font-medium">{formatStreams(totalStreams)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Live Releases</span>
                  <span className="font-medium">{liveReleases.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">House</span>
                  <span className="font-medium text-white/80">SUMG Records</span>
                </div>
              </div>
            </div>

            <Link
              href="/producers"
              className="block rounded-2xl border border-white/10 bg-[#0d1016] p-5 hover:border-white/20 transition"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">Network</p>
              <p className="text-sm font-medium">View all producers →</p>
            </Link>

            <Link
              href="/releases"
              className="block rounded-2xl border border-white/10 bg-[#0d1016] p-5 hover:border-white/20 transition"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">Catalog</p>
              <p className="text-sm font-medium">Browse releases →</p>
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
