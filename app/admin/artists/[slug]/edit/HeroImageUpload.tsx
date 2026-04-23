"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { uploadArtistPhoto, uploadArtistHeroImage } from "@/app/actions/artists"

interface Props {
  artistSlug: string
  currentHeroUrl?: string | null
  currentProfileUrl?: string | null
}

export default function HeroImageUpload({ artistSlug, currentHeroUrl, currentProfileUrl }: Props) {
  const profileRef = useRef<HTMLInputElement>(null)
  const heroRef    = useRef<HTMLInputElement>(null)
  const [profilePending, startProfileTransition] = useTransition()
  const [heroPending, startHeroTransition]       = useTransition()
  const [profileError, setProfileError] = useState<string | null>(null)
  const [heroError, setHeroError]       = useState<string | null>(null)
  const [profileUrl, setProfileUrl] = useState(currentProfileUrl)
  const [heroUrl, setHeroUrl]       = useState(currentHeroUrl)
  const router = useRouter()

  function handleProfile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setProfileError(null)
    const fd = new FormData()
    fd.set("file", file)
    startProfileTransition(async () => {
      const result = await uploadArtistPhoto(fd, artistSlug)
      if ("error" in result) setProfileError(result.error)
      else { setProfileUrl(result.url); router.refresh() }
      if (profileRef.current) profileRef.current.value = ""
    })
  }

  function handleHero(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setHeroError(null)
    const fd = new FormData()
    fd.set("file", file)
    startHeroTransition(async () => {
      const result = await uploadArtistHeroImage(fd, artistSlug)
      if ("error" in result) setHeroError(result.error)
      else { setHeroUrl(result.url); router.refresh() }
      if (heroRef.current) heroRef.current.value = ""
    })
  }

  return (
    <div className="space-y-4">
      {/* Profile photo */}
      <div className="flex items-center gap-4">
        <div className="relative group shrink-0">
          {profileUrl ? (
            <img src={profileUrl} alt="" className="w-16 h-16 rounded-2xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center text-xl text-white/30">
              ☉
            </div>
          )}
          <button
            type="button"
            onClick={() => profileRef.current?.click()}
            disabled={profilePending}
            className="absolute inset-0 rounded-2xl bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white disabled:cursor-wait text-sm"
          >
            {profilePending ? "…" : "↑"}
          </button>
        </div>
        <div>
          <p className="text-xs text-white/50 font-medium">Profile Photo</p>
          <p className="text-[10px] text-white/25 mt-0.5">Shown on artist card. Square recommended.</p>
          {profileError && <p className="text-[10px] text-red-400 mt-1">{profileError}</p>}
        </div>
        <input ref={profileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleProfile} />
      </div>

      {/* Hero image */}
      <div className="flex items-start gap-4">
        <div className="relative group shrink-0">
          {heroUrl ? (
            <img src={heroUrl} alt="" className="w-24 h-14 rounded-xl object-cover" />
          ) : (
            <div className="w-24 h-14 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/20 text-xs">
              Hero
            </div>
          )}
          <button
            type="button"
            onClick={() => heroRef.current?.click()}
            disabled={heroPending}
            className="absolute inset-0 rounded-xl bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white disabled:cursor-wait text-sm"
          >
            {heroPending ? "…" : "↑"}
          </button>
        </div>
        <div>
          <p className="text-xs text-white/50 font-medium">Hero Image</p>
          <p className="text-[10px] text-white/25 mt-0.5">Full-width banner on artist page. 16:9 recommended.</p>
          {heroError && <p className="text-[10px] text-red-400 mt-1">{heroError}</p>}
        </div>
        <input ref={heroRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleHero} />
      </div>
    </div>
  )
}
