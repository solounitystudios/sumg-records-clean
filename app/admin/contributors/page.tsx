import { getContributors } from "@/lib/db/contributors"

export const dynamic = "force-dynamic"
export const metadata = { title: "Contributors — SUMG Admin" }

const typeBadge: Record<string, string> = {
  human: "bg-sky-500/15 text-sky-400",
  ai_persona: "bg-violet-500/15 text-violet-400",
}

export default async function ContributorsAdminPage() {
  const contributors = await getContributors()
  const humans = contributors.filter((c) => c.type === "human")
  const personas = contributors.filter((c) => c.type === "ai_persona")

  return (
    <main className="px-6 py-10 md:px-10">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.35em] text-white/35 mb-2">Admin</p>
        <h1 className="text-3xl font-semibold">Contributors</h1>
        <p className="mt-2 text-sm text-white/50">Lyric writers, co-writers, and AI personas.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-10">
        {[
          { label: "Total", value: contributors.length },
          { label: "Human Writers", value: humans.length },
          { label: "AI Personas", value: personas.length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35 mb-2">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {contributors.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl border border-white/10 bg-[#0d1016] p-5 flex items-start gap-5"
          >
            <div className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-base font-semibold text-white/60 shrink-0">
              {c.name.charAt(0)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-semibold">{c.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${typeBadge[c.type]}`}>
                  {c.type === "ai_persona" ? "AI Persona" : "Human"}
                </span>
                {c.royaltyEligible && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                    Royalty Eligible
                  </span>
                )}
              </div>

              {c.email && (
                <p className="mt-0.5 text-xs text-white/40">{c.email}</p>
              )}

              {c.bio && (
                <p className="mt-2 text-sm text-white/50 leading-6 line-clamp-2">{c.bio}</p>
              )}

              {c.artistSlug && (
                <p className="mt-1.5 text-xs text-white/30">
                  Artist profile: <span className="text-white/50">{c.artistSlug}</span>
                </p>
              )}
            </div>
          </div>
        ))}

        {contributors.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#0d1016] p-8 text-center text-sm text-white/35">
            No contributors yet.
          </div>
        )}
      </div>
    </main>
  )
}
