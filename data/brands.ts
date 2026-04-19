export interface Brand {
  id: string;
  name: string;
  category: string;
  descriptor: string;
  tagline: string;
}

export const brands: Brand[] = [
  {
    id: "woronoff",
    name: "Woronoff",
    category: "Fashion / Luxury",
    descriptor: "Editorial streetwear rooted in the SUMG aesthetic.",
    tagline: "Wear the silence.",
  },
  {
    id: "unity-standard",
    name: "Unity Standard",
    category: "Lifestyle / Culture",
    descriptor: "A cultural imprint for the creators operating in the margin.",
    tagline: "Built in the dark.",
  },
  {
    id: "moon-spell",
    name: "Moon Spell",
    category: "Sound / Wellness",
    descriptor: "Curated sound experiences and sensory media.",
    tagline: "Listen differently.",
  },
  {
    id: "concrete-borough",
    name: "Concrete Borough",
    category: "Visual Arts / Film",
    descriptor: "Visual storytelling from the streets that shaped the sound.",
    tagline: "Frame the underground.",
  },
  {
    id: "salt-current",
    name: "Salt Current",
    category: "Publishing / Editorial",
    descriptor: "Words, lyrics, and long-form narrative within the SUMG world.",
    tagline: "The unwritten record.",
  },
];
