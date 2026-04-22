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

export const artists: Artist[] = [
  {
    id: "1",
    slug: "zyson",
    name: "Zyson",
    role: "Lead Artist",
    genre: "Hip-Hop / R&B",
    bio: "Zyson is SUMG's flagship voice — a cinematic storyteller who blends introspective lyricism with dense, layered production. His sound sits at the intersection of street narrative and emotional depth, building worlds with every project.",
    tags: ["hip-hop", "cinematic", "lyricism"],
    monthlyListeners: 412000,
    totalStreams: 18200000,
    releaseCount: 4,
  },
  {
    id: "2",
    slug: "lysandra-noir",
    name: "Lysandra Noir",
    role: "Ethereal R&B",
    genre: "R&B / Soul",
    bio: "Lysandra Noir crafts atmospheric R&B that feels like midnight in a city that never sleeps. Her vocal layering technique and genre-fluid production have made her one of the most distinctive voices on the SUMG roster.",
    tags: ["r&b", "atmospheric", "soul"],
    monthlyListeners: 287000,
    totalStreams: 9800000,
    releaseCount: 3,
  },
  {
    id: "3",
    slug: "marrick",
    name: "Marrick",
    role: "Street Narrative",
    genre: "Hip-Hop",
    bio: "Marrick is a direct-contact storyteller. His bars carry the weight of lived experience — delivered with precision over beats that range from stark minimalism to full orchestration. No filler, no compromise.",
    tags: ["hip-hop", "street", "hard-bars"],
    monthlyListeners: 198000,
    totalStreams: 7400000,
    releaseCount: 5,
  },
  {
    id: "4",
    slug: "turkz",
    name: "Turkz",
    role: "West Coast Energy",
    genre: "Hip-Hop / Trap",
    bio: "Turkz brings West Coast DNA into SUMG's sonic world — high-energy flows, trap-influenced production, and an undeniable sense of momentum. His releases clock high stream velocity from day one.",
    tags: ["trap", "west-coast", "energy"],
    monthlyListeners: 334000,
    totalStreams: 14100000,
    releaseCount: 6,
  },
  {
    id: "5",
    slug: "sorin",
    name: "Sorin",
    role: "Sensual R&B",
    genre: "R&B",
    bio: "Sorin operates in the intimate space between R&B and soft soul. His music is made for late nights — warm tones, minimal production, and a vocal style that turns vulnerability into artistry.",
    tags: ["r&b", "sensual", "minimal"],
    monthlyListeners: 221000,
    totalStreams: 8600000,
    releaseCount: 3,
  },
  {
    id: "6",
    slug: "yosin",
    name: "Yosin",
    role: "Melodic Hybrid",
    genre: "Pop / Hip-Hop",
    bio: "Yosin blurs the line between rap and melody in a way that feels natural, never forced. His hybrid sound has strong crossover appeal — stadium hooks built over hip-hop foundations.",
    tags: ["melodic", "crossover", "hooks"],
    monthlyListeners: 461000,
    totalStreams: 21300000,
    releaseCount: 5,
  },
  {
    id: "7",
    slug: "jayno",
    name: "Jayno",
    role: "Atmospheric Voice",
    genre: "Alternative R&B",
    bio: "Jayno is a vocal architect — building tracks from texture outward. His alternative R&B approach incorporates ambient sound design, unconventional song structure, and a tone that is immediately recognizable.",
    tags: ["alternative", "ambient", "vocals"],
    monthlyListeners: 176000,
    totalStreams: 5900000,
    releaseCount: 2,
  },
]

export const producers: Producer[] = [
  {
    id: "1",
    slug: "nightwire",
    name: "NightWire",
    specialties: ["Cinematic", "Dark Trap", "Orchestral"],
    credits: 34,
    bio: "NightWire is the primary architect behind SUMG's signature sound — dense, cinematic, and built for impact. His beats have appeared on every major SUMG project.",
  },
  {
    id: "2",
    slug: "ironlight",
    name: "IronLight",
    specialties: ["West Coast", "Boom Bap", "Hybrid"],
    credits: 28,
    bio: "IronLight draws on classic West Coast production while pushing the envelope on sound design. His knack for sample manipulation is unmatched on the roster.",
  },
  {
    id: "3",
    slug: "deadzone310",
    name: "DeadZone310",
    specialties: ["Trap", "Minimal", "Bass"],
    credits: 19,
    bio: "DeadZone310 specializes in stripped-back, bass-forward productions — tracks that live in the space between notes as much as in them.",
  },
  {
    id: "4",
    slug: "tidewell",
    name: "Tidewell",
    specialties: ["R&B", "Soul", "Neo-soul"],
    credits: 22,
    bio: "Tidewell's productions have a warmth that is rare in modern R&B. He understands space, dynamics, and the emotional arc of a song from the first bar to the last.",
  },
  {
    id: "5",
    slug: "grvnd",
    name: "GRVND",
    specialties: ["Alternative", "Experimental", "Ambient"],
    credits: 15,
    bio: "GRVND pushes the edges of what production in SUMG's world can sound like — experimental, ambient, and often structured in ways that break conventional song form.",
  },
]

export const brands: Brand[] = [
  {
    id: "1",
    slug: "woronoff",
    name: "Woronoff",
    tagline: "Precision cut for the relentless.",
    description: "Woronoff is SUMG's premier fashion brand — sharp tailoring, dark palettes, and a design language built for the stage and the street. Each piece is engineered for presence.",
    category: "Luxury Streetwear",
  },
  {
    id: "2",
    slug: "unity-standard",
    name: "Unity Standard",
    tagline: "The uniform of the movement.",
    description: "Unity Standard is community-first streetwear — accessible, intentional, and built to last. Designed to be worn by anyone who understands that culture is built collectively.",
    category: "Streetwear",
  },
  {
    id: "3",
    slug: "moon-spell",
    name: "Moon Spell",
    tagline: "Worn after midnight.",
    description: "Moon Spell occupies the space between fashion and ritual — gothic undertones, silver hardware, and silhouettes that belong to the night. Limited drops, high conviction.",
    category: "Alternative / Goth",
  },
  {
    id: "4",
    slug: "concrete-borough",
    name: "Concrete Borough",
    tagline: "Built from the block.",
    description: "Concrete Borough is raw, utilitarian streetwear that speaks directly to urban architecture and energy. No noise — just product that earns its place in the rotation.",
    category: "Urban Workwear",
  },
  {
    id: "5",
    slug: "salt-current",
    name: "Salt Current",
    tagline: "Coastal clarity.",
    description: "Salt Current brings a coastal California influence into SUMG's brand ecosystem — relaxed silhouettes, ocean-influenced palettes, and an energy that moves against the grain.",
    category: "Coastal Casual",
  },
]

export const releases: Release[] = [
  {
    id: "1",
    slug: "nocturnal-index",
    title: "Nocturnal Index",
    artistSlug: "zyson",
    artistName: "Zyson",
    releaseDate: "2025-11-14",
    type: "album",
    status: "live",
    streams: 4200000,
    platforms: ["Spotify", "Apple Music", "TIDAL", "Amazon Music"],
    accentColor: "#6366f1",
    tracks: [
      { number: 1, title: "Signal Start", duration: "3:12", streams: 820000 },
      { number: 2, title: "Weight in Wire", duration: "3:44", streams: 960000 },
      { number: 3, title: "Black Latitude", duration: "4:01", streams: 710000 },
      { number: 4, title: "Drift Protocol", duration: "3:28", streams: 540000 },
      { number: 5, title: "Nocturnal Index", duration: "5:02", streams: 1170000 },
    ],
  },
  {
    id: "2",
    slug: "cold-archive",
    title: "Cold Archive",
    artistSlug: "lysandra-noir",
    artistName: "Lysandra Noir",
    releaseDate: "2025-09-05",
    type: "EP",
    status: "live",
    streams: 2100000,
    platforms: ["Spotify", "Apple Music", "YouTube Music"],
    accentColor: "#8b5cf6",
    tracks: [
      { number: 1, title: "Obsidian", duration: "3:55", streams: 670000 },
      { number: 2, title: "Echo Fade", duration: "4:10", streams: 590000 },
      { number: 3, title: "Cold Archive", duration: "3:37", streams: 840000 },
    ],
  },
  {
    id: "3",
    slug: "velocity-protocol",
    title: "Velocity Protocol",
    artistSlug: "turkz",
    artistName: "Turkz",
    releaseDate: "2026-01-20",
    type: "single",
    status: "live",
    streams: 3800000,
    platforms: ["Spotify", "Apple Music", "TIDAL", "SoundCloud"],
    accentColor: "#f59e0b",
    tracks: [
      { number: 1, title: "Velocity Protocol", duration: "2:58", streams: 3800000 },
    ],
  },
  {
    id: "4",
    slug: "floor-frequency",
    title: "Floor Frequency",
    artistSlug: "yosin",
    artistName: "Yosin",
    releaseDate: "2026-03-08",
    type: "EP",
    status: "live",
    streams: 5100000,
    platforms: ["Spotify", "Apple Music", "Amazon Music"],
    accentColor: "#10b981",
    tracks: [
      { number: 1, title: "Higher Signal", duration: "3:20", streams: 1400000 },
      { number: 2, title: "Neon Core", duration: "3:05", streams: 1100000 },
      { number: 3, title: "Floor Frequency", duration: "3:48", streams: 1600000 },
      { number: 4, title: "Endline", duration: "2:55", streams: 1000000 },
    ],
  },
  {
    id: "5",
    slug: "low-current",
    title: "Low Current",
    artistSlug: "sorin",
    artistName: "Sorin",
    releaseDate: "2026-04-15",
    type: "single",
    status: "scheduled",
    streams: 0,
    platforms: ["Spotify", "Apple Music"],
    accentColor: "#ec4899",
    tracks: [
      { number: 1, title: "Low Current", duration: "3:33", streams: 0 },
    ],
  },
  {
    id: "6",
    slug: "iron-latitude",
    title: "Iron Latitude",
    artistSlug: "marrick",
    artistName: "Marrick",
    releaseDate: "2026-06-01",
    type: "album",
    status: "draft",
    streams: 0,
    platforms: [],
    accentColor: "#ef4444",
    tracks: [
      { number: 1, title: "Steel Entry", duration: "3:15", streams: 0 },
      { number: 2, title: "Iron Latitude", duration: "4:22", streams: 0 },
      { number: 3, title: "Borough Address", duration: "3:40", streams: 0 },
      { number: 4, title: "Night Credential", duration: "3:58", streams: 0 },
      { number: 5, title: "Closing Statement", duration: "5:10", streams: 0 },
      { number: 6, title: "Last Word", duration: "4:01", streams: 0 },
    ],
  },
  {
    id: "7",
    slug: "void-signal",
    title: "Void Signal",
    artistSlug: "jayno",
    artistName: "Jayno",
    releaseDate: "2025-07-22",
    type: "EP",
    status: "live",
    streams: 1400000,
    platforms: ["Spotify", "Apple Music", "TIDAL"],
    accentColor: "#14b8a6",
    tracks: [
      { number: 1, title: "Void Signal", duration: "4:40", streams: 640000 },
      { number: 2, title: "Hollow Return", duration: "3:55", streams: 760000 },
    ],
  },
]

export const royalties: RoyaltyRecord[] = [
  {
    period: "2026-Q1",
    artistSlug: "zyson",
    artistName: "Zyson",
    streams: 1840000,
    revenue: 734600,
    platforms: [
      { platform: "Spotify", streams: 920000, revenue: 367200 },
      { platform: "Apple Music", streams: 480000, revenue: 240000 },
      { platform: "TIDAL", streams: 290000, revenue: 98600 },
      { platform: "Amazon Music", streams: 150000, revenue: 28800 },
    ],
  },
  {
    period: "2026-Q1",
    artistSlug: "yosin",
    artistName: "Yosin",
    streams: 2240000,
    revenue: 896000,
    platforms: [
      { platform: "Spotify", streams: 1200000, revenue: 480000 },
      { platform: "Apple Music", streams: 680000, revenue: 340000 },
      { platform: "Amazon Music", streams: 360000, revenue: 76000 },
    ],
  },
  {
    period: "2026-Q1",
    artistSlug: "turkz",
    artistName: "Turkz",
    streams: 1920000,
    revenue: 768000,
    platforms: [
      { platform: "Spotify", streams: 960000, revenue: 384000 },
      { platform: "Apple Music", streams: 520000, revenue: 260000 },
      { platform: "TIDAL", streams: 280000, revenue: 95200 },
      { platform: "SoundCloud", streams: 160000, revenue: 28800 },
    ],
  },
  {
    period: "2026-Q1",
    artistSlug: "lysandra-noir",
    artistName: "Lysandra Noir",
    streams: 980000,
    revenue: 392000,
    platforms: [
      { platform: "Spotify", streams: 500000, revenue: 200000 },
      { platform: "Apple Music", streams: 320000, revenue: 160000 },
      { platform: "YouTube Music", streams: 160000, revenue: 32000 },
    ],
  },
  {
    period: "2026-Q1",
    artistSlug: "marrick",
    artistName: "Marrick",
    streams: 740000,
    revenue: 296000,
    platforms: [
      { platform: "Spotify", streams: 460000, revenue: 184000 },
      { platform: "Apple Music", streams: 280000, revenue: 112000 },
    ],
  },
  {
    period: "2026-Q1",
    artistSlug: "sorin",
    artistName: "Sorin",
    streams: 860000,
    revenue: 344000,
    platforms: [
      { platform: "Spotify", streams: 520000, revenue: 208000 },
      { platform: "Apple Music", streams: 340000, revenue: 136000 },
    ],
  },
  {
    period: "2026-Q1",
    artistSlug: "jayno",
    artistName: "Jayno",
    streams: 490000,
    revenue: 196000,
    platforms: [
      { platform: "Spotify", streams: 260000, revenue: 104000 },
      { platform: "Apple Music", streams: 150000, revenue: 75000 },
      { platform: "TIDAL", streams: 80000, revenue: 17000 },
    ],
  },
  {
    period: "2025-Q4",
    artistSlug: "zyson",
    artistName: "Zyson",
    streams: 2100000,
    revenue: 840000,
    platforms: [
      { platform: "Spotify", streams: 1050000, revenue: 420000 },
      { platform: "Apple Music", streams: 620000, revenue: 310000 },
      { platform: "TIDAL", streams: 290000, revenue: 81200 },
      { platform: "Amazon Music", streams: 140000, revenue: 28800 },
    ],
  },
  {
    period: "2025-Q4",
    artistSlug: "yosin",
    artistName: "Yosin",
    streams: 1980000,
    revenue: 792000,
    platforms: [
      { platform: "Spotify", streams: 1080000, revenue: 432000 },
      { platform: "Apple Music", streams: 580000, revenue: 290000 },
      { platform: "Amazon Music", streams: 320000, revenue: 70000 },
    ],
  },
]

export const news: NewsItem[] = [
  {
    id: "1",
    slug: "yosin-floor-frequency-debut",
    title: "Yosin's 'Floor Frequency' Debuts in Top 10 on R&B Charts",
    excerpt: "The four-track EP from SUMG's melodic standout opens strong across all platforms, marking his biggest release yet.",
    date: "2026-03-10",
    category: "Release",
    featured: true,
  },
  {
    id: "2",
    slug: "turkz-velocity-protocol-video",
    title: "Turkz Drops Cinematic Visual for 'Velocity Protocol'",
    excerpt: "Directed by acclaimed visual director Khalid Rowe, the video took three weeks to shoot across Los Angeles and the Mojave Desert.",
    date: "2026-02-14",
    category: "Visual",
    featured: true,
  },
  {
    id: "3",
    slug: "marrick-iron-latitude-announced",
    title: "Marrick Announces 'Iron Latitude' — His Most Ambitious Project Yet",
    excerpt: "A six-track album slated for June 2026 that Marrick describes as a direct conversation with the architecture of the city.",
    date: "2026-02-01",
    category: "Announcement",
    featured: false,
  },
  {
    id: "4",
    slug: "woronoff-spring-drop",
    title: "Woronoff Spring Drop Sells Out in 48 Hours",
    excerpt: "The label's flagship fashion brand released its spring collection and saw full sell-through within two days of launch.",
    date: "2026-01-28",
    category: "Brand",
    featured: false,
  },
  {
    id: "5",
    slug: "sumg-producer-network-expansion",
    title: "SUMG Producer Network Expands — GRVND Signs Exclusive Deal",
    excerpt: "Experimental producer GRVND signs an exclusive production deal with SUMG, bringing his unique ambient approach to the full roster.",
    date: "2026-01-15",
    category: "Business",
    featured: false,
  },
  {
    id: "6",
    slug: "sorin-low-current-preview",
    title: "Sorin Previews 'Low Current' Single — April Release Confirmed",
    excerpt: "A 30-second clip shared on social media sent listeners into a frenzy. The full single drops April 15th.",
    date: "2026-01-05",
    category: "Release",
    featured: false,
  },
]

export function getArtist(slug: string) {
  return artists.find((a) => a.slug === slug)
}

export function getBrand(slug: string) {
  return brands.find((b) => b.slug === slug)
}

export function getArtistReleases(artistSlug: string) {
  return releases.filter((r) => r.artistSlug === artistSlug)
}

export function getArtistRoyalties(artistSlug: string) {
  return royalties.filter((r) => r.artistSlug === artistSlug)
}

export function formatStreams(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

export function formatRevenue(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
