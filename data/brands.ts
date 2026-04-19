export interface Brand {
  id: string;
  slug: string;
  name: string;
  category: string;
  descriptor: string;
  tagline: string;
  longDescription?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const brands: Brand[] = [
  { id: "woronoff", slug: "woronoff", name: "Woronoff", category: "Fashion / Luxury", descriptor: "Editorial streetwear rooted in the SUMG aesthetic.", tagline: "Wear the silence.", longDescription: "Woronoff is a fashion imprint born from the SUMG creative world. Severe in construction, refined in finish — it exists at the intersection of tailoring and tension. Not streetwear. Not couture. Something between.", isActive: true, createdAt: "2024-01-01", updatedAt: "2025-01-01" },
  { id: "unity-standard", slug: "unity-standard", name: "Unity Standard", category: "Lifestyle / Culture", descriptor: "A cultural imprint for the creators operating in the margin.", tagline: "Built in the dark.", longDescription: "Unity Standard is a lifestyle imprint for the people who build in the margins. Technical. Minimal. Uncompromising. It documents the culture that exists before it becomes visible.", isActive: true, createdAt: "2024-01-01", updatedAt: "2025-01-01" },
  { id: "moon-spell", slug: "moon-spell", name: "Moon Spell", category: "Sound / Wellness", descriptor: "Curated sound experiences and sensory media.", tagline: "Listen differently.", longDescription: "Moon Spell creates sound environments for altered states. Curated playlists, sensory audio, wellness media — experiences designed to change the room you're in without moving.", isActive: true, createdAt: "2024-01-01", updatedAt: "2025-01-01" },
  { id: "concrete-borough", slug: "concrete-borough", name: "Concrete Borough", category: "Visual Arts / Film", descriptor: "Visual storytelling from the streets that shaped the sound.", tagline: "Frame the underground.", longDescription: "Concrete Borough is a visual storytelling imprint. Film, photography, installation — documentation of the urban world that produces the SUMG sound. Raw. Honest. Uncategorized.", isActive: true, createdAt: "2024-01-01", updatedAt: "2025-01-01" },
  { id: "salt-current", slug: "salt-current", name: "Salt Current", category: "Publishing / Editorial", descriptor: "Words, lyrics, and long-form narrative within the SUMG world.", tagline: "The unwritten record.", longDescription: "Salt Current is a publishing and editorial imprint. Long-form essays, lyric collections, artist interviews — the written dimension of a world that is mostly heard.", isActive: true, createdAt: "2024-01-01", updatedAt: "2025-01-01" },
];
