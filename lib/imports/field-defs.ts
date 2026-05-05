export interface FieldDef {
  key:         string    // DB field name
  label:       string    // Display label
  required:    boolean
  aliases:     string[]  // Lowercase CSV header alternatives for auto-detection
  description?: string
}

// ─── Artists ──────────────────────────────────────────────────────────────────

export const ARTIST_FIELDS: FieldDef[] = [
  {
    key: 'name',
    label: 'Artist Name',
    required: true,
    aliases: ['name', 'artist name', 'artist', 'artist_name', 'performer', 'act', 'band name', 'band'],
    description: 'Full artist or band name',
  },
  {
    key: 'slug',
    label: 'Slug',
    required: false,
    aliases: ['slug', 'url slug', 'url_slug', 'handle', 'identifier', 'id slug'],
  },
  {
    key: 'bio',
    label: 'Biography',
    required: false,
    aliases: ['bio', 'biography', 'description', 'about', 'artist bio', 'artist_bio', 'artist description', 'summary'],
  },
  {
    key: 'genre',
    label: 'Genre',
    required: false,
    aliases: ['genre', 'genres', 'music genre', 'primary genre', 'style', 'music style', 'category'],
  },
  {
    key: 'role',
    label: 'Role',
    required: false,
    aliases: ['role', 'artist role', 'type', 'artist type', 'function'],
  },
  {
    key: 'status',
    label: 'Status',
    required: false,
    aliases: ['status', 'active status', 'artist status', 'state'],
  },
  {
    key: 'spotify_id',
    label: 'Spotify ID',
    required: false,
    aliases: ['spotify id', 'spotify_id', 'spotify artist id', 'spotify artist', 'spotify uri', 'spotify url'],
  },
  {
    key: 'instagram',
    label: 'Instagram',
    required: false,
    aliases: ['instagram', 'instagram handle', 'instagram url', 'ig', 'ig handle', 'instagram username'],
  },
  {
    key: 'twitter',
    label: 'Twitter / X',
    required: false,
    aliases: ['twitter', 'twitter handle', 'twitter url', 'x handle', 'x url', 'twitter username'],
  },
  {
    key: 'website',
    label: 'Website',
    required: false,
    aliases: ['website', 'url', 'web', 'website url', 'artist website', 'official site', 'official website', 'site'],
  },
]

// ─── Releases ─────────────────────────────────────────────────────────────────

export const RELEASE_FIELDS: FieldDef[] = [
  {
    key: 'title',
    label: 'Release Title',
    required: true,
    aliases: [
      'title', 'release title', 'album title', 'ep title', 'single title',
      'release name', 'album name', 'product title', 'album', 'release',
    ],
    description: 'Title of the album, EP, or single',
  },
  {
    key: 'artist_name',
    label: 'Artist Name',
    required: true,
    aliases: [
      'artist name', 'artist', 'artist_name', 'primary artist', 'performer',
      'band', 'act', 'credited artist',
    ],
  },
  {
    key: 'artist_slug',
    label: 'Artist Slug',
    required: false,
    aliases: ['artist slug', 'artist_slug', 'artist id', 'artist identifier'],
  },
  {
    key: 'release_date',
    label: 'Release Date',
    required: false,
    aliases: [
      'release date', 'release_date', 'date', 'publish date', 'publication date',
      'drop date', 'street date', 'released', 'released on', 'date released',
    ],
  },
  {
    key: 'type',
    label: 'Release Type',
    required: false,
    aliases: [
      'type', 'release type', 'product type', 'format', 'album type',
      'release format', 'record type',
    ],
    description: 'album, ep, single, compilation, etc.',
  },
  {
    key: 'upc',
    label: 'UPC',
    required: false,
    aliases: [
      'upc', 'upc code', 'barcode', 'universal product code', 'ean',
      'ean code', 'catalog upc',
    ],
  },
  {
    key: 'genre',
    label: 'Genre',
    required: false,
    aliases: ['genre', 'genres', 'music genre', 'primary genre', 'style', 'category'],
  },
  {
    key: 'status',
    label: 'Status',
    required: false,
    aliases: ['status', 'release status', 'state', 'availability'],
  },
  {
    key: 'artwork_url',
    label: 'Artwork URL',
    required: false,
    aliases: [
      'artwork url', 'artwork_url', 'artwork', 'cover art', 'cover art url',
      'image url', 'image', 'artwork link', 'album art', 'album art url',
    ],
  },
  {
    key: 'label',
    label: 'Label',
    required: false,
    aliases: [
      'label', 'record label', 'label name', 'imprint', 'distributor label',
      'released by', 'published by',
    ],
  },
]

// ─── Songs ────────────────────────────────────────────────────────────────────

export const SONG_FIELDS: FieldDef[] = [
  {
    key: 'title',
    label: 'Song Title',
    required: true,
    aliases: [
      'title', 'song title', 'track title', 'track name', 'song name',
      'work title', 'recording title', 'name',
    ],
    description: 'Title of the individual track or song',
  },
  {
    key: 'artist_name',
    label: 'Artist Name',
    required: true,
    aliases: [
      'artist name', 'artist', 'artist_name', 'primary artist', 'performer',
      'band', 'act', 'credited artist', 'artists',
    ],
  },
  {
    key: 'artist_slug',
    label: 'Artist Slug',
    required: false,
    aliases: ['artist slug', 'artist_slug', 'artist id', 'artist identifier'],
  },
  {
    key: 'release_title',
    label: 'Release Title',
    required: false,
    aliases: [
      'release title', 'release_title', 'album title', 'album', 'release',
      'album name', 'ep title', 'release name', 'product title',
    ],
  },
  {
    key: 'release_slug',
    label: 'Release Slug',
    required: false,
    aliases: ['release slug', 'release_slug', 'album slug', 'album id'],
  },
  {
    key: 'isrc',
    label: 'ISRC',
    required: false,
    aliases: [
      'isrc', 'isrc code', 'international standard recording code',
      'recording code', 'track isrc',
    ],
  },
  {
    key: 'track_number',
    label: 'Track Number',
    required: false,
    aliases: [
      'track number', 'track_number', 'track no', 'track no.', 'track #',
      'track num', 'position', 'disc track', 'order',
    ],
  },
  {
    key: 'duration',
    label: 'Duration',
    required: false,
    aliases: [
      'duration', 'length', 'track length', 'track duration', 'running time',
      'time', 'playtime', 'song length',
    ],
  },
  {
    key: 'genre',
    label: 'Genre',
    required: false,
    aliases: ['genre', 'genres', 'music genre', 'primary genre', 'style', 'category', 'track genre'],
  },
  {
    key: 'bpm',
    label: 'BPM',
    required: false,
    aliases: [
      'bpm', 'beats per minute', 'tempo', 'track bpm', 'song bpm',
    ],
  },
  {
    key: 'key',
    label: 'Musical Key',
    required: false,
    aliases: [
      'key', 'musical key', 'song key', 'track key', 'camelot', 'tonality',
    ],
  },
  {
    key: 'is_explicit',
    label: 'Explicit',
    required: false,
    aliases: [
      'is explicit', 'is_explicit', 'explicit', 'explicit content',
      'parental advisory', 'clean', 'advisory',
    ],
  },
  {
    key: 'status',
    label: 'Status',
    required: false,
    aliases: ['status', 'song status', 'track status', 'state', 'availability'],
  },
]

// ─── Field lookup helper ───────────────────────────────────────────────────────

import type { ImportEntityType } from './types'

export function getFieldDefs(entityType: ImportEntityType): FieldDef[] {
  switch (entityType) {
    case 'artists':  return ARTIST_FIELDS
    case 'releases': return RELEASE_FIELDS
    case 'songs':    return SONG_FIELDS
    default:         return []
  }
}
