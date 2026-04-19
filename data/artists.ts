export interface Artist {
  id: string;
  name: string;
  role: string;
  genre: string;
  bio: string;
  featured: boolean;
  tier: "primary" | "secondary";
}

export const artists: Artist[] = [
  {
    id: "zyson",
    name: "Zyson",
    role: "Artist",
    genre: "Dark R&B / Trap Soul",
    bio: "Zyson moves between shadows and sound, crafting worlds out of silence.",
    featured: true,
    tier: "primary",
  },
  {
    id: "lysandra-noir",
    name: "Lysandra Noir",
    role: "Artist",
    genre: "Alt Soul / Noir Pop",
    bio: "Lysandra Noir dissolves genre lines with cold precision and raw vulnerability.",
    featured: true,
    tier: "primary",
  },
  {
    id: "turkz",
    name: "Turkz",
    role: "Artist",
    genre: "Cinematic Rap",
    bio: "Turkz builds sonic architecture — every bar a blueprint, every drop a monument.",
    featured: true,
    tier: "primary",
  },
  {
    id: "marrick",
    name: "Marrick",
    role: "Artist",
    genre: "Electronic Soul",
    bio: "Marrick sculpts emotion through texture, operating at the intersection of digital and visceral.",
    featured: true,
    tier: "primary",
  },
  {
    id: "sorin",
    name: "Sorin",
    role: "Artist",
    genre: "Atmospheric Hip-Hop",
    bio: "Sorin draws from stillness, producing music that breathes on its own.",
    featured: false,
    tier: "secondary",
  },
  {
    id: "yosin",
    name: "Yosin",
    role: "Artist",
    genre: "Neo Soul / Indie R&B",
    bio: "Yosin channels vulnerability into sound — intimate, unfiltered, and magnetic.",
    featured: false,
    tier: "secondary",
  },
  {
    id: "jayno",
    name: "Jayno",
    role: "Artist",
    genre: "Street Minimalism",
    bio: "Jayno strips music to its core — what remains is heavy, precise, and undeniable.",
    featured: false,
    tier: "secondary",
  },
];

export const featuredArtists = artists.filter((a) => a.featured);
export const secondaryArtists = artists.filter((a) => !a.featured);
