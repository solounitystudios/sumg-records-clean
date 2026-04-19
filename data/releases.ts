export interface Release {
  id: string;
  title: string;
  artist: string;
  type: "Single" | "EP" | "Album" | "Mixtape";
  genre: string;
  releaseDate: string;
  description: string;
  tracklist?: string[];
}

export const releases: Release[] = [
  {
    id: "afterglow-zyson",
    title: "Afterglow",
    artist: "Zyson",
    type: "Single",
    genre: "Dark R&B",
    releaseDate: "2025",
    description: "A cold, cinematic descent into aftermath — Zyson at his most precise.",
    tracklist: ["Afterglow"],
  },
  {
    id: "veil-lysandra",
    title: "Veil",
    artist: "Lysandra Noir",
    type: "EP",
    genre: "Noir Pop",
    releaseDate: "2025",
    description: "Five movements through grief, power, and transformation.",
    tracklist: ["Entry Point", "Glass Hours", "Veil", "Undone", "Exit Ritual"],
  },
  {
    id: "monument-turkz",
    title: "Monument",
    artist: "Turkz",
    type: "Single",
    genre: "Cinematic Rap",
    releaseDate: "2025",
    description: "Hard-hitting and visually sonic — Turkz erects a legacy in real time.",
    tracklist: ["Monument"],
  },
  {
    id: "signal-marrick",
    title: "Signal",
    artist: "Marrick",
    type: "EP",
    genre: "Electronic Soul",
    releaseDate: "2025",
    description: "A transmission from the edge — layered, textured, irreducible.",
    tracklist: ["Carrier", "Signal", "Static Hours", "Last Frequency"],
  },
  {
    id: "pressure-jayno",
    title: "Pressure",
    artist: "Jayno",
    type: "Single",
    genre: "Street Minimalism",
    releaseDate: "2025",
    description: "Minimal but immense — Jayno channels focus into form.",
    tracklist: ["Pressure"],
  },
  {
    id: "hollow-sorin",
    title: "Hollow",
    artist: "Sorin",
    type: "Single",
    genre: "Atmospheric Hip-Hop",
    releaseDate: "2025",
    description: "Quiet devastation. Sorin's most introspective offering to date.",
    tracklist: ["Hollow"],
  },
];
