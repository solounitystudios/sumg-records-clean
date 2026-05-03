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
  image_url: string | null        // null when provider_status = 'pending'
  prompt_used: string | null
  linked_song_id: string | null
  linked_upload_job_id: string | null
  created_at: string
  // v2 fields
  style_bucket: string | null
  asset_id: string | null
  name: string | null
  // v3 provider / Midjourney fields
  provider: string                // 'manual' | 'openai' | 'midjourney'
  provider_job_id: string | null
  provider_status: string         // 'pending' | 'complete' | 'failed'
  provider_prompt: string | null
  provider_raw_response: Record<string, unknown>
}

export interface MidjourneyQueueRow extends ThumbnailAsset {
  linked_job_title: string | null
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

export interface BuildPromptOptions {
  producerSlug: string
  title?: string
  mood?: string
  sceneType?: string
  cameraStyle?: string
  presetSlug?: string
  rawIdea?: string
}
