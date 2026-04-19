export interface Artist {
  id: string;
  name: string;
  genre: string;
  image: string;
  bio: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    spotify?: string;
  };
}

export interface Producer {
  id: string;
  name: string;
  specialty: string;
  image: string;
  bio: string;
  credits?: string[];
}

export interface Release {
  id: string;
  title: string;
  artist: string;
  coverArt: string;
  releaseDate: string;
  type: "album" | "ep" | "single" | "mixtape";
  genre: string;
  streamingLinks?: {
    spotify?: string;
    appleMusic?: string;
    youtube?: string;
  };
}

export interface Brand {
  id: string;
  name: string;
  description: string;
  logo: string;
  category: string;
  url?: string;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface AdminNavItem {
  label: string;
  href: string;
  icon: string;
}
