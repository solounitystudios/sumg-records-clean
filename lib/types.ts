export type ReleaseStatus = "draft" | "scheduled" | "published" | "archived";
export type EntityStatus = "draft" | "active" | "archived";
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
  featuredOnHomepage?: boolean;
  tier: "primary" | "secondary";
  status?: EntityStatus;
  sortOrder?: number;
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
  status?: EntityStatus;
  sortOrder?: number;
  featuredOnHomepage?: boolean;
  profileImageUrl?: string;
  heroImageUrl?: string;
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
  manifesto?: string;
  heroCopy?: string;
  longDescription?: string;
  heroImageUrl?: string;
  logoUrl?: string;
  accentColor?: string;
  heroStyle?: HeroStyle;
  isActive: boolean;
  featuredOnHomepage?: boolean;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CMSRelease {
  id: string;
  slug: string;
  title: string;
  artistSlug: string;
  artistName: string;
  featuredArtistSlugs?: string[];
  producerSlugs?: string[];
  type: "Single" | "EP" | "Album" | "Mixtape";
  genre: string;
  releaseDate: string;
  publishAt?: string;
  status: ReleaseStatus;
  isVisible: boolean;
  featuredOnHomepage?: boolean;
  description: string;
  coverArtUrl?: string;
  tracklist?: CMSSong[];
  streamingLinks?: StreamingLinks;
  createdAt: string;
  updatedAt: string;
}

/**
 * CMSSong — first-class entity.
 *
 * Songs are independently managed and linked to releases, artists, and
 * producers.  When a release is published, all linked songs whose status
 * is not "archived" are automatically set to "published".
 *
 * The `trackNumber` / `releaseSlug` fields are retained so that songs
 * continue to work as inline tracklist items inside the release editor.
 */
export interface CMSSong {
  id: string;
  /** URL-safe identifier — doubles as the public /songs/[slug] path */
  slug: string;
  title: string;
  /** Primary artist */
  artistSlug: string;
  artistName: string;
  /** Release this song belongs to (may be undefined for standalone singles) */
  releaseSlug?: string;
  releaseName?: string;
  producerSlugs?: string[];
  genre?: string;
  duration?: string;
  audioUrl?: string;
  lyrics?: string;
  isExplicit?: boolean;
  trackNumber?: number;
  status: ReleaseStatus;
  isVisible: boolean;
  publishAt?: string;
  featuredOnHomepage?: boolean;
  /** ID of a linked CMSAsset (audio file in the media library) */
  mediaAssetId?: string;
  createdAt: string;
  updatedAt: string;
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
  entityType: "artist" | "producer" | "brand" | "release" | "song";
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
  featuredBrandSlugs?: string[];
  featuredReleaseSlugs?: string[];
  heroHeadline: string;
  heroSubtext: string;
  showLatestReleases: boolean;
  latestReleasesCount: number;
  sectionOrder?: string[];
  sectionVisibility?: Record<string, boolean>;
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
