export interface Artist {
  id: string
  slug: string
  name: string
  role: string
  genre: string
  bio: string
  tags: string[]
  monthlyListeners: number
  totalStreams: number
  releaseCount: number
  profileImageUrl?: string | null
  heroImageUrl?: string | null
  status?: string | null
  featured?: boolean
  spotifyId?: string | null
  socialLinks?: {
    spotify?: string
    instagram?: string
    youtube?: string
    twitter?: string
    soundcloud?: string
    tiktok?: string
  } | null
}

export interface Producer {
  id: string
  slug: string
  name: string
  specialties: string[]
  credits: number
  bio: string
}

export interface Brand {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  category: string
  accentColor: string | null
  logoUrl: string | null
  heroImageUrl: string | null
  shopifyUrl: string | null
  isActive: boolean
  campaignStatus: string | null
  collectionName: string | null
  manifesto: string | null
}

export interface Track {
  number: number
  title: string
  duration: string
  streams: number
}

export interface Release {
  id: string
  slug: string
  title: string
  artistSlug: string
  artistName: string
  releaseDate: string
  type: "single" | "EP" | "album"
  status: "draft" | "scheduled" | "live" | "archived"
  streams: number
  platforms: string[]
  tracks: Track[]
  accentColor: string
  spotifyUrl?: string | null
}

export interface PlatformRoyalty {
  platform: string
  streams: number
  revenue: number
}

export interface RoyaltyRecord {
  period: string
  artistSlug: string
  artistName: string
  streams: number
  revenue: number
  platforms: PlatformRoyalty[]
}

export interface NewsItem {
  id: string
  slug: string
  title: string
  excerpt: string
  date: string
  category: string
  featured: boolean
}

export function formatStreams(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

export function formatRevenue(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
