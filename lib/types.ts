export type ReleaseStatus = "draft" | "scheduled" | "published";
export type UserRole = "admin" | "editor";
export type AssetType = "image" | "video" | "audio" | "document";
export type HeroStyle = "editorial" | "minimal" | "mystic" | "industrial" | "coastal";

export interface CMSArtist {
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
  socialLinks?: SocialLinks;
  associatedBrands?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CMSProducer {
  id: string;
  slug: string;
  name: string;
  specialty: string;
  credits: string;
  signature: string;
  bio?: string;
  profileImageUrl?: string;
  socialLinks?: SocialLinks;
  createdAt: string;
  updatedAt: string;
}

export interface CMSBrand {
  id: string;
  slug: string;
  name: string;
  category: string;
  descriptor: string;
  tagline: string;
  longDescription?: string;
  heroImageUrl?: string;
  logoUrl?: string;
  accentColor?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CMSRelease {
  id: string;
  slug: string;
  title: string;
  artistSlug: string;
  artistName: string;
  type: "Single" | "EP" | "Album" | "Mixtape";
  genre: string;
  releaseDate: string;
  publishAt?: string;
  status: ReleaseStatus;
  isVisible: boolean;
  description: string;
  coverArtUrl?: string;
  tracklist?: CMSSong[];
  streamingLinks?: StreamingLinks;
  createdAt: string;
  updatedAt: string;
}

export interface CMSSong {
  id: string;
  title: string;
  releaseSlug: string;
  artistSlug: string;
  duration?: string;
  audioUrl?: string;
  isExplicit?: boolean;
  trackNumber?: number;
}

export interface CMSAsset {
  id: string;
  type: AssetType;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes?: number;
  altText?: string;
  attachedTo?: AssetAttachment[];
  uploadedBy?: string;
  createdAt: string;
}

export interface AssetAttachment {
  entityType: "artist" | "producer" | "brand" | "release";
  entityId: string;
  role: "hero" | "profile" | "cover" | "gallery" | "video" | "audio";
}

export interface CMSUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface CMSHomepageConfig {
  id: string;
  featuredArtistSlugs: string[];
  heroHeadline: string;
  heroSubtext: string;
  showLatestReleases: boolean;
  latestReleasesCount: number;
  updatedAt: string;
}

export interface SocialLinks {
  instagram?: string;
  twitter?: string;
  spotify?: string;
  soundcloud?: string;
  youtube?: string;
}

export interface StreamingLinks {
  spotify?: string;
  appleMusic?: string;
  tidal?: string;
  soundcloud?: string;
  youtube?: string;
}

export interface BrandTheme {
  slug: string;
  displayName: string;
  heroStyle: HeroStyle;
  accentColor: string;
  accentColorHex: string;
  surfaceClassName: string;
  cardClassName: string;
  buttonVariant: string;
  headingClassName: string;
  bodyClassName: string;
  gridStyle: string;
  borderStyle: string;
  separatorStyle: string;
  backgroundStyle: string;
}

export interface AuthSession {
  user: CMSUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEditor: boolean;
}

export interface UploadResult {
  success: boolean;
  asset?: CMSAsset;
  error?: string;
}
