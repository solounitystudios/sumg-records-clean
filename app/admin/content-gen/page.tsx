import { requireAdmin } from "@/lib/auth"
import { supabase } from "@/lib/db/supabase"
import { ContentGenClient } from "./ContentGenClient"

export const metadata = { title: "Content Generator — SUMG Admin" }

export default async function ContentGenPage() {
  await requireAdmin()

  const [artistsRes, releasesRes] = await Promise.all([
    supabase.from("artists").select("slug, name, genre, bio").neq("status", "archived").order("name"),
    supabase.from("releases").select("slug, title, type, artist_slug").order("title"),
  ])

  const artists = (artistsRes.data ?? []).map((a) => ({
    slug:  a.slug,
    name:  a.name,
    genre: a.genre ?? "",
    bio:   a.bio ?? "",
  }))

  const releases = (releasesRes.data ?? []).map((r) => ({
    slug:        r.slug,
    title:       r.title,
    type:        r.type ?? "single",
    artistSlug:  r.artist_slug ?? "",
  }))

  return (
    <main className="px-6 py-10 md:px-10 max-w-3xl">
      <div className="mb-10">
        <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 mb-2 font-mono">Admin / Operations</p>
        <h1 className="text-3xl font-semibold tracking-tight">Content Generator</h1>
        <p className="mt-2 text-sm text-white/40">AI-generated marketing copy for every platform. Powered by Claude.</p>
      </div>

      {artists.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0a0c10] p-12 text-center">
          <p className="text-sm text-white/25 font-mono">No artists found. Add an artist first.</p>
        </div>
      ) : (
        <ContentGenClient artists={artists} releases={releases} />
      )}
    </main>
  )
}
