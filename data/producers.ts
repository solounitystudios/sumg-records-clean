export interface Producer {
  id: string;
  name: string;
  specialty: string;
  credits: string;
  signature: string;
}

export const producers: Producer[] = [
  {
    id: "ironlight",
    name: "IronLight",
    specialty: "Dark Electronic / Cinematic",
    credits: "Zyson, Marrick, Turkz",
    signature: "Layered tension, percussive architecture",
  },
  {
    id: "deadzone310",
    name: "DeadZone310",
    specialty: "Trap Soul / Bass-Heavy",
    credits: "Lysandra Noir, Sorin",
    signature: "Sub-bass mastery, haunting atmospheres",
  },
  {
    id: "nightwire",
    name: "NightWire",
    specialty: "Neo Soul / Noir R&B",
    credits: "Yosin, Lysandra Noir, Zyson",
    signature: "Warm analog textures, midnight energy",
  },
  {
    id: "tidewell",
    name: "Tidewell",
    specialty: "Atmospheric Hip-Hop",
    credits: "Sorin, Jayno, Marrick",
    signature: "Slow-burn builds, spatial production",
  },
  {
    id: "grvnd",
    name: "GRVND",
    specialty: "Street Minimalism / Drill",
    credits: "Turkz, Jayno",
    signature: "Stripped percussion, high-pressure flows",
  },
];
