export type ThumbnailMode = 'auto' | 'generated' | 'edited' | 'custom'
export type ThumbnailJobStatus = 'pending' | 'draft' | 'approved' | 'skipped'
export type ThumbnailProjectStatus = 'draft' | 'in_review' | 'approved' | 'rejected'

export interface ThumbnailProfile {
  id: string
  producer_slug: string
  identity_json: Record<string, unknown>
  color_palette: string[]
  banned_elements: string[]
  title_style: Record<string, unknown>
  active: boolean
  created_at: string
  updated_at: string
}

export interface CanvasDefaults {
  textPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  logoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'none'
  overlay?: 'none' | 'soft-black-gradient' | 'cold-blue-vignette' | 'warm-vignette'
  fontStyle?: string
  textColor?: string
  strokeColor?: string
  fontSize?: number
}

export interface PromptDefaults {
  style_bucket?: string
  camera?: string
  colors?: string[]
  mood?: string[]
}

export interface ThumbnailPreset {
  id: string
  preset_slug: string
  producer_slug: string | null
  name: string
  description: string | null
  canvas_defaults: CanvasDefaults
  prompt_defaults: PromptDefaults
  active: boolean
}

export interface ThumbnailProject {
  id: string
  upload_job_id: string
  producer_slug: string | null
  title: string | null
  status: ThumbnailProjectStatus
  selected_version_id: string | null
  approved_asset_id: string | null
  canvas_json: CanvasConfig
  preset_slug: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ThumbnailVersion {
  id: string
  project_id: string
  asset_id: string | null
  image_url: string
  prompt: string | null
  provider: string | null
  style_bucket: string | null
  version_number: number
  selected: boolean
  rejected: boolean
  ctr_score: number | null
  notes: string | null
  created_at: string
}

export interface ThumbnailPromptRow {
  id: string
  producer_slug: string
  category: string | null
  prompt: string
  style_bucket: string | null
  ctr_score: number | null
  winner_bool: boolean
  active: boolean
  created_at: string
  updated_at: string
  // v2 library management fields
  name: string | null
  description: string | null
  favorite: boolean
  archived_at: string | null
  use_count: number
  last_used_at: string | null
}

export interface PromptLibraryFilters {
  search?: string
  producerSlug?: string
  styleBucket?: string
  category?: string
  favoritesOnly?: boolean
  winnersOnly?: boolean
  includeArchived?: boolean
}

export interface ThumbnailAsset {
  id: string
  producer_slug: string | null
  image_url: string
  prompt_used: string | null
  linked_song_id: string | null
  linked_upload_job_id: string | null
  created_at: string
  // v2 fields
  style_bucket: string | null
  asset_id: string | null
  name: string | null
  // v3 provider fields
  provider: string                // 'manual' | 'openai' | 'midjourney'
  provider_job_id: string | null
  provider_status: string         // always 'complete' for stored assets
  provider_prompt: string | null
  provider_raw_response: Record<string, unknown>
}

export interface ThumbnailGenerationJob {
  id: string
  provider: string                // 'midjourney'
  status: string                  // 'pending' | 'complete' | 'failed'
  prompt: string
  producer_slug: string | null
  upload_job_id: string | null
  style_bucket: string | null
  provider_job_id: string | null
  provider_raw_response: Record<string, unknown>
  completed_thumbnail_asset_id: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface MidjourneyQueueRow extends ThumbnailGenerationJob {
  linked_job_title: string | null
  image_url: string | null        // populated from completed asset when status='complete'
}

export interface CanvasConfig {
  titleText?: string
  titlePosition?: CanvasDefaults['textPosition']
  logoPosition?: CanvasDefaults['logoPosition']
  overlay?: CanvasDefaults['overlay']
  fontStyle?: string
  fontSize?: number
  textColor?: string
  strokeColor?: string
  shadowEnabled?: boolean
}

export interface UploadJobForStudio {
  id: string
  title: string | null
  producer_slug: string | null
  status: string
  thumbnail_mode: string | null
  thumbnail_status: string | null
  thumbnail_asset_id: string | null
  thumbnail_project_id: string | null
  scheduled_at: string | null
  created_at: string
  yt_channel_id: string | null
}

export type PersonaSubject = 'none' | 'zyson' | 'lysandra' | 'sorin' | 'marrick' | 'turkz' | 'custom'

export interface BuildPromptOptions {
  producerSlug: string
  title?: string
  mood?: string
  sceneType?: string
  cameraStyle?: string
  presetSlug?: string
  rawIdea?: string
  // Persona / Artist Subject — only included in prompt when explicitly selected
  personaSubject?: PersonaSubject
  personaCustom?: string
  subjectRole?: string
  pose?: string
  wardrobe?: string
  expression?: string
  faceReferenceLock?: boolean
  // Output / composition hints — injected at prompt build time
  compositionHint?: string
  mjAspectRatio?:   string
  coverArtMode?:    boolean
  coverArtStyle?:   string
}

/** Stored as JSON in thumbnail_versions.notes. Carries the full truth of what was requested vs. what was generated. */
export interface ThumbnailOutputMeta {
  // Studio mode
  mode:                   'thumbnail' | 'cover-art'
  // Platform
  platformPreset:         string
  platformLabel:          string
  aspectRatio:            string
  orientation:            string
  // Dimensions — three layers of truth
  requestedWidth:         number   // what the platform spec demands (e.g. 3000 for Spotify)
  requestedHeight:        number
  generatedWidth:         number   // what the engine actually produced (e.g. 1024 for DALL-E)
  generatedHeight:        number
  finalExportWidth:       number   // target after any post-processing (= requested once upscale runs)
  finalExportHeight:      number
  // Quality
  qualityLevel:           string
  // Upscale
  upscaleRequested:       boolean
  upscaleApplied:         boolean  // always false until backend exists
  // Multi-platform
  multiPlatformRequested: boolean  // always false until backend exists
  // Optional enrichments
  coverArtStyle?:         string
  compositionHint?:       string
}
