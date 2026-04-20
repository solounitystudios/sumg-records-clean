export type ReleaseStatus = "draft" | "scheduled" | "published" | "archived";
export type EntityStatus = "draft" | "active" | "archived";

// ─── Music Operations Layer ───────────────────────────────────────────────────

/** Where a record's data originated — used for source-of-truth labeling. */
export type DataOriginSource =
  | "manual"
  | "supabase"
  | "imported"
  | "distro"
  | "bmi"
  | "ascap"
  | "shopify";

/** Rights / publishing registration status for a composition or recording. */
export type RightsStatus = "draft" | "pending" | "registered" | "issue";

/** Distribution pipeline status for a release. */
export type DistributionStatus =
  | "draft"
  | "queued"
  | "submitted"
  | "delivered"
  | "live"
  | "issue";

/** A single songwriter / composer credit with optional split percentage. */
export interface SongwriterCredit {
  name: string;
  role: "Songwriter" | "Composer" | "Co-Writer" | "Producer" | "Other";
  splitPct?: number;
  /** IPI / CAE number for this contributor. */
  ipi?: string;
  pro?: PROName;
}

/**
 * Rights metadata for a song or release.
 * Populated manually or imported — BMI/ASCAP have no real-time public API.
 * Reference URLs and registration status must be confirmed by the rights team.
 */
export interface RightsMetadata {
  /** Performing Rights Organization for the primary rights holder. */
  pro?: PROName;
  /** IPI / CAE number of the primary rights holder. */
  ipiCae?: string;
  publisher?: string;
  publishingAdmin?: string;
  songwriterCredits?: SongwriterCredit[];
  /** Registration status of the musical composition with the PRO. */
  compositionStatus?: RightsStatus;
  /** Whether the master recording is registered / tracked. */
  registrationStatus?: RightsStatus;
  /** Songview or other PRO work reference URL. */
  songviewUrl?: string;
  bmiWorkUrl?: string;
  ascapWorkUrl?: string;
  rightsNotes?: string;
  source?: DataOriginSource;
  /** ISO date — last time rights data was verified by the team. */
  lastVerified?: string;
}

/**
 * Distribution tracking record — attached to a release.
 * DistroKid and similar services do not provide a real-time public API.
 * Store reference IDs and status manually; link back to distributor dashboard.
 */
export interface DistributionRecord {
  distributor?: string;
  submissionStatus?: DistributionStatus;
  deliveryStatus?: DistributionStatus;
  liveStatus?: DistributionStatus;
  /** Planned release / delivery date for distribution. */
  scheduledDate?: string;
  /** DSP platform names where this release is confirmed live. */
  dspCoverage?: string[];
  upc?: string;
  /** Distributor-assigned internal release reference ID (e.g. DistroKid ID). */
  distroReferenceId?: string;
  distroNotes?: string;
  source?: DataOriginSource;
  /** ISO date — last time distribution data was verified / synced manually. */
  lastSynced?: string;
}

// ─── DSP / Streaming ─────────────────────────────────────────────────────────

/** First-class DSP link set — used on both songs and releases. */
export interface DSPLinks {
  spotify?: string;
  appleMusic?: string;
  youtubeMusic?: string;
  soundcloud?: string;
  tidal?: string;
  deezer?: string;
}

// ─── Provider / Business config ───────────────────────────────────────────────

export type DistributorName =
  | "DistroKid"
  | "TuneCore"
  | "CD Baby"
  | "Stem"
  | "AWAL"
  | "UnitedMasters"
  | "Other";

export type PROName = "BMI" | "ASCAP" | "SESAC" | "PRS" | "SOCAN" | "Other";

export interface ProviderConfig {
  distributor?: string;
  pro?: string;
  publishingAdmin?: string;
  neighboringRightsOrg?: string;
  soundExchangeStatus?: "registered" | "pending" | "not_registered";
  isrc?: string;
  upc?: string;
  submissionStatus?:
    | "not_submitted"
    | "pending"
    | "submitted"
    | "distributed"
    | "rejected";
  providerNotes?: string;
  providerLinks?: Record<string, string>;
}

// ─── Artist timeline ──────────────────────────────────────────────────────────

export type TimelineItemType =
  | "release"
  | "song"
  | "video"
  | "event"
  | "performance"
  | "milestone"
  | "press"
  | "relationship"
  | "career"
  | "creative_note"
  | "story_seed"
  | "personal_lore"
  | "campaign_phase";

export type TimelineItemStatus =
  | "draft"
  | "confirmed"
  | "completed"
  | "cancelled";

export type TimelineItemVisibility = "private" | "team" | "public";

export interface ArtistTimelineItem {
  id: string;
  artistSlug: string;
  type: TimelineItemType;
  title: string;
  description?: string;
  /** ISO date string for the primary date of the event */
  eventDate: string;
  endDate?: string;
  status: TimelineItemStatus;
  visibility: TimelineItemVisibility;
  linkedReleaseSlug?: string;
  linkedSongSlug?: string;
  linkedAssetIds?: string[];
  tags?: string[];
  /** 1 (low) — 10 (critical) */
  importance: number;
  /** When true this item is eligible to inform the lyric engine */
  lyricEngineEligible: boolean;
  createdAt: string;
  updatedAt: string;
}
/**
 * Admin user roles — controls what actions each user can perform.
 *
 *   admin           → full access (all CRUD, settings, delete, publish, upload)
 *   release_manager → can publish releases and songs; cannot delete or change settings
 *   media_manager   → can upload / replace / delete media assets; cannot publish or delete entities
 *   editor          → can edit content (text, metadata) but cannot publish, delete, or manage media
 */
export type UserRole = "admin" | "editor" | "media_manager" | "release_manager";
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
  providerConfig?: ProviderConfig;
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
  /** Primary headline text for the brand hero section (H1-level) */
  heroHeadline?: string;
  /** Subtitle / subcopy displayed beneath heroHeadline */
  heroSubcopy?: string;
  longDescription?: string;
  heroImageUrl?: string;
  logoUrl?: string;
  accentColor?: string;
  heroStyle?: HeroStyle;
  /** Lifecycle state of the brand's active campaign */
  campaignStatus?: "active" | "inactive" | "upcoming";
  /** Current collection or capsule name (e.g. "Spring 2025 — Void Series") */
  collectionName?: string;
  /** Slugs of releases featured on the brand page */
  /**
   * @deprecated Music releases should not be coupled to brand pages.
   * Use Shopify collections for brand commerce content.
   * Preserved for data migration compatibility.
   */
  featuredReleaseSlugs?: string[];
  /** IDs of media assets featured on the brand page */
  featuredAssetIds?: string[];
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
  dspLinks?: DSPLinks;
  providerConfig?: ProviderConfig;
  /** Publishing / rights metadata for this release. */
  rightsMetadata?: RightsMetadata;
  /** Distribution tracking record for this release. */
  distributionRecord?: DistributionRecord;
  /** Where this record's data originated (manual entry, import, etc.). */
  dataSource?: DataOriginSource;
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
  dspLinks?: DSPLinks;
  /** International Standard Recording Code — song-level identifier. */
  isrc?: string;
  /** Publishing / rights metadata for this composition. */
  rightsMetadata?: RightsMetadata;
  /** Where this record's data originated (manual entry, import, etc.). */
  dataSource?: DataOriginSource;
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
  /** True for admin + media_manager */
  isMediaManager: boolean;
  /** True for admin + release_manager */
  isReleaseManager: boolean;
}

export interface UploadResult {
  success: boolean;
  asset?: CMSAsset;
  error?: string;
}
