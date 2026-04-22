import Link from "next/link"
import { getArtists } from "@/lib/db/artists"
import { getProducers } from "@/lib/db/producers"
import { getBrands } from "@/lib/db/brands"

export default async function HomePage() {
  const [artists, producers, brands] = await Promise.all([
    getArtists(),
    getProducers(),
    getBrands(),
  ])

  return (
    <main className="min-h-screen bg-[#06070a] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(120,120,255,0.10),transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32">
          <p className="mb-4 text-xs uppercase tracking-[0.35em] text-white/50">
            SUMG Records
          </p>

          <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-tight md:text-7xl">
            Built different.
            <span className="mt-2 block text-white/70">
              Music, brands, media, and artist worldbuilding under one house.
            </span>
          </h1>

          <p className="mt-8 max-w-2xl text-base leading-7 text-white/65 md:text-lg">
            SUMG is not just a label. It is a connected ecosystem for artists,
            producers, fashion brands, releases, visuals, and the culture around
            them.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/artists"
              className="rounded-full border border-white bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
            >
              Explore Artists
            </Link>
            <Link
              href="/brands"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-medium text-white transition hover:border-white/40 hover:bg-white/5"
            >
              Enter Brand World
            </Link>
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {[
              [artists.length.toString(), "Artists"],
              [producers.length.toString(), "Producers"],
              [brands.length.toString(), "Brands"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
              >
                <div className="text-3xl font-semibold">{value}</div>
                <div className="mt-2 text-sm uppercase tracking-[0.25em] text-white/45">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              Featured Roster
            </p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
              The SUMG artists
            </h2>
          </div>
          <Link
            href="/artists"
            className="text-sm text-white/70 transition hover:text-white"
          >
            View full roster →
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {artists.map((artist, index) => (
            <Link
              key={artist.slug}
              href={`/artists/${artist.slug}`}
              className="group overflow-hidden rounded-3xl border border-white/10 bg-[#0d1016] transition hover:border-white/20 hover:bg-[#11151d]"
            >
              <div className="flex aspect-[4/5] items-end justify-start bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.08))] p-6">
                <div>
                  <div className="mb-3 text-xs uppercase tracking-[0.3em] text-white/35">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <h3 className="text-2xl font-semibold leading-tight">
                    {artist.name}
                  </h3>
                  <p className="mt-2 text-sm text-white/55">{artist.role}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#090b10]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10">
          <div className="mb-10 flex items-end justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                Producer Network
              </p>
              <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
                Sound architects
              </h2>
            </div>
            <Link
              href="/producers"
              className="text-sm text-white/70 transition hover:text-white"
            >
              View producers →
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            {producers.map((producer) => (
              <div
                key={producer.slug}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-lg font-medium transition hover:border-white/20 hover:bg-white/8"
              >
                {producer.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              Brand System
            </p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
              Fashion and identity
            </h2>
          </div>
          <Link
            href="/brands"
            className="text-sm text-white/70 transition hover:text-white"
          >
            Enter storefronts →
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-5">
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/brands/${brand.slug}`}
              className="group rounded-3xl border border-white/10 bg-[#0d1016] p-6 transition hover:border-white/20 hover:bg-[#11151d]"
            >
              <div className="mb-10 aspect-square rounded-2xl bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%),linear-gradient(180deg,#11151c,#090b10)]" />
              <h3 className="text-lg font-semibold">{brand.name}</h3>
              <p className="mt-2 text-sm text-white/55">
                {brand.tagline || "A distinct visual language inside the SUMG universe."}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#08090d]">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10">
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                Media + Releases
              </p>
              <h2 className="mt-4 max-w-2xl text-3xl font-semibold md:text-5xl">
                Built for rollout, storytelling, and long-term worldbuilding.
              </h2>
              <p className="mt-5 max-w-2xl text-white/60">
                Release campaigns, visuals, editorial pages, news drops, and
                storefront experiences all belong to one connected system.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10">
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                Catalog
              </p>
              <h3 className="mt-4 text-2xl font-semibold">
                Explore the full SUMG universe.
              </h3>
              <div className="mt-8 flex flex-col gap-3">
                <Link
                  href="/news"
                  className="rounded-full border border-white/15 px-5 py-3 text-sm transition hover:border-white/30 hover:bg-white/5"
                >
                  View News
                </Link>
                <Link
                  href="/releases"
                  className="rounded-full border border-white/15 px-5 py-3 text-sm transition hover:border-white/30 hover:bg-white/5"
                >
                  View Releases
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
