export interface Producer {
  id: string;
  slug: string;
  name: string;
  specialty: string;
  credits: string;
  signature: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export const producers: Producer[] = [
  { id: "ironlight", slug: "ironlight", name: "IronLight", specialty: "Dark Electronic / Cinematic", credits: "Zyson, Marrick, Turkz", signature: "Layered tension, percussive architecture", bio: "IronLight builds from the bottom — heavy foundations, architectural percussion, cinematic tension that never fully resolves.", createdAt: "2024-01-01", updatedAt: "2025-01-01" },
  { id: "deadzone310", slug: "deadzone310", name: "DeadZone310", specialty: "Trap Soul / Bass-Heavy", credits: "Lysandra Noir, Sorin", signature: "Sub-bass mastery, haunting atmospheres", bio: "DeadZone310 operates in the frequencies most people feel rather than hear. His productions are immersive environments.", createdAt: "2024-01-01", updatedAt: "2025-01-01" },
  { id: "nightwire", slug: "nightwire", name: "NightWire", specialty: "Neo Soul / Noir R&B", credits: "Yosin, Lysandra Noir, Zyson", signature: "Warm analog textures, midnight energy", bio: "NightWire records as if the session never ends. The warmth in his work is structural — the result of process, not accident.", createdAt: "2024-01-01", updatedAt: "2025-01-01" },
  { id: "tidewell", slug: "tidewell", name: "Tidewell", specialty: "Atmospheric Hip-Hop", credits: "Sorin, Jayno, Marrick", signature: "Slow-burn builds, spatial production", bio: "Tidewell is a spatial thinker. He produces as if arranging architecture — every element placed with consideration for what surrounds it.", createdAt: "2024-01-01", updatedAt: "2025-01-01" },
  { id: "grvnd", slug: "grvnd", name: "GRVND", specialty: "Street Minimalism / Drill", credits: "Turkz, Jayno", signature: "Stripped percussion, high-pressure flows", bio: "GRVND removes until there is nothing left to remove — then removes one more thing. What remains creates pressure.", createdAt: "2024-01-01", updatedAt: "2025-01-01" },
];
