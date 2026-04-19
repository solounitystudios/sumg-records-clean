export interface Artist {
  id: string;
  slug: string;
  name: string;
  role: string;
  genre: string;
  bio: string;
  longBio?: string;
  featured: boolean;
  tier: "primary" | "secondary";
  heroImageUrl?: string;
  profileImageUrl?: string;
  socialLinks?: { instagram?: string; spotify?: string; soundcloud?: string };
  createdAt: string;
  updatedAt: string;
}

export const artists: Artist[] = [
  { id: "zyson", slug: "zyson", name: "Zyson", role: "Artist", genre: "Dark R&B / Trap Soul", bio: "Zyson moves between shadows and sound, crafting worlds out of silence.", longBio: "Zyson operates at the outer edge of R&B — where silence is a weapon and restraint becomes devastation. His process is architectural, his delivery surgical. Every release is a world unto itself.", featured: true, tier: "primary", createdAt: "2024-01-01", updatedAt: "2025-01-01" },
  { id: "lysandra-noir", slug: "lysandra-noir", name: "Lysandra Noir", role: "Artist", genre: "Alt Soul / Noir Pop", bio: "Lysandra Noir dissolves genre lines with cold precision and raw vulnerability.", longBio: "Lysandra Noir exists at the convergence of alt-soul, noir pop, and cinematic minimalism. Her voice is a duality — simultaneously intimate and unreachable. She writes her own world.", featured: true, tier: "primary", createdAt: "2024-01-01", updatedAt: "2025-01-01" },
  { id: "turkz", slug: "turkz", name: "Turkz", role: "Artist", genre: "Cinematic Rap", bio: "Turkz builds sonic architecture — every bar a blueprint, every drop a monument.", longBio: "Turkz approaches rap as an architectural discipline. The bars are load-bearing. The cadences are structural. What he builds does not collapse under scrutiny — it deepens.", featured: true, tier: "primary", createdAt: "2024-01-01", updatedAt: "2025-01-01" },
  { id: "marrick", slug: "marrick", name: "Marrick", role: "Artist", genre: "Electronic Soul", bio: "Marrick sculpts emotion through texture, operating at the intersection of digital and visceral.", longBio: "Marrick makes electronic music for people who distrust electronic music. The warmth in his work comes from friction — analogue sensibility applied to digital space.", featured: true, tier: "primary", createdAt: "2024-01-01", updatedAt: "2025-01-01" },
  { id: "sorin", slug: "sorin", name: "Sorin", role: "Artist", genre: "Atmospheric Hip-Hop", bio: "Sorin draws from stillness, producing music that breathes on its own.", longBio: "Sorin is a practitioner of negative space. His tracks are built around what is absent — the pauses that carry more weight than the notes themselves.", featured: false, tier: "secondary", createdAt: "2024-01-01", updatedAt: "2025-01-01" },
  { id: "yosin", slug: "yosin", name: "Yosin", role: "Artist", genre: "Neo Soul / Indie R&B", bio: "Yosin channels vulnerability into sound — intimate, unfiltered, and magnetic.", longBio: "Yosin works without armor. The recordings feel like first takes — because often they are. His gift is making exposure feel like strength.", featured: false, tier: "secondary", createdAt: "2024-01-01", updatedAt: "2025-01-01" },
  { id: "jayno", slug: "jayno", name: "Jayno", role: "Artist", genre: "Street Minimalism", bio: "Jayno strips music to its core — what remains is heavy, precise, and undeniable.", longBio: "Jayno is a reductionist. Every element that survives the edit earns its place. The result is music of uncommon density — minimal in form, maximal in pressure.", featured: false, tier: "secondary", createdAt: "2024-01-01", updatedAt: "2025-01-01" },
];

export const featuredArtists = artists.filter((a) => a.featured);
export const secondaryArtists = artists.filter((a) => !a.featured);
