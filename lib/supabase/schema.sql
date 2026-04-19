-- SUMG Records — Supabase Migration
-- Run in your Supabase project: SQL Editor → New Query → paste → Run
-- Tables use snake_case columns; the app mappers translate to camelCase.

-- ─── Extensions ─────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Artists ────────────────────────────────────────────────────────────────
create table if not exists artists (
  id                  text primary key,
  slug                text unique not null,
  name                text not null,
  role                text not null default '',
  genre               text not null default '',
  bio                 text not null default '',
  long_bio            text,
  featured            boolean not null default false,
  featured_on_homepage boolean not null default false,
  tier                text not null default 'secondary',
  status              text not null default 'active',
  sort_order          integer not null default 0,
  hero_image_url      text,
  profile_image_url   text,
  social_links        jsonb,
  associated_brands   jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── Producers ──────────────────────────────────────────────────────────────
create table if not exists producers (
  id                  text primary key,
  slug                text unique not null,
  name                text not null,
  specialty           text not null default '',
  credits             text not null default '',
  signature           text not null default '',
  bio                 text,
  status              text not null default 'active',
  sort_order          integer not null default 0,
  featured_on_homepage boolean not null default false,
  profile_image_url   text,
  hero_image_url      text,
  social_links        jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── Brands ─────────────────────────────────────────────────────────────────
create table if not exists brands (
  id                  text primary key,
  slug                text unique not null,
  name                text not null,
  category            text not null default '',
  descriptor          text not null default '',
  tagline             text not null default '',
  manifesto           text,
  hero_copy           text,
  long_description    text,
  hero_image_url      text,
  logo_url            text,
  accent_color        text,
  hero_style          text,
  is_active           boolean not null default true,
  featured_on_homepage boolean not null default false,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── Releases ───────────────────────────────────────────────────────────────
create table if not exists releases (
  id                    text primary key,
  slug                  text unique not null,
  title                 text not null,
  artist_slug           text not null,
  artist_name           text not null,
  featured_artist_slugs jsonb,
  producer_slugs        jsonb,
  type                  text not null default 'Single',
  genre                 text not null default '',
  release_date          text not null,
  publish_at            text,
  status                text not null default 'draft',
  is_visible            boolean not null default false,
  featured_on_homepage  boolean not null default false,
  description           text not null default '',
  cover_art_url         text,
  tracklist             jsonb,
  streaming_links       jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─── Assets ─────────────────────────────────────────────────────────────────
create table if not exists assets (
  id            text primary key default gen_random_uuid()::text,
  type          text not null,
  url           text not null,
  filename      text not null,
  mime_type     text not null,
  size_bytes    bigint,
  alt_text      text,
  attached_to   jsonb,
  uploaded_by   text,
  created_at    timestamptz not null default now()
);

-- ─── Songs ──────────────────────────────────────────────────────────────────
-- First-class entity. Linked to artists, releases, and producers.
-- When a release is published, the app automatically publishes all linked songs.
create table if not exists songs (
  id                    text primary key,
  slug                  text unique not null,
  title                 text not null,
  artist_slug           text not null,
  artist_name           text not null,
  release_slug          text,
  release_name          text,
  producer_slugs        jsonb,
  genre                 text,
  duration              text,
  audio_url             text,
  lyrics                text,
  is_explicit           boolean not null default false,
  track_number          integer,
  status                text not null default 'draft',
  is_visible            boolean not null default false,
  publish_at            text,
  featured_on_homepage  boolean not null default false,
  media_asset_id        text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─── Homepage Config ─────────────────────────────────────────────────────────
create table if not exists homepage_config (
  id                      text primary key default 'homepage',
  featured_artist_slugs   jsonb not null default '[]'::jsonb,
  featured_brand_slugs    jsonb not null default '[]'::jsonb,
  featured_release_slugs  jsonb not null default '[]'::jsonb,
  hero_headline           text not null default 'Sound. Vision. Culture.',
  hero_subtext            text not null default '',
  show_latest_releases    boolean not null default true,
  latest_releases_count   integer not null default 4,
  section_order           jsonb,
  section_visibility      jsonb,
  updated_at              timestamptz not null default now()
);

-- Insert default homepage config row if missing
insert into homepage_config (id) values ('homepage') on conflict (id) do nothing;

-- ─── Row-Level Security ──────────────────────────────────────────────────────
-- Public read (anon) for artists, producers, brands, releases, homepage_config.
-- All writes require authenticated admin session (service role bypasses RLS).

alter table artists enable row level security;
alter table producers enable row level security;
alter table brands enable row level security;
alter table releases enable row level security;
alter table songs enable row level security;
alter table assets enable row level security;
alter table homepage_config enable row level security;

-- Public read policies
create policy "public read artists"     on artists         for select using (true);
create policy "public read producers"   on producers       for select using (true);
create policy "public read brands"      on brands          for select using (true);
create policy "public read releases"    on releases        for select using (is_visible = true and status = 'published');
create policy "public read all releases" on releases       for select using (true); -- admin reads all
create policy "public read songs"       on songs           for select using (is_visible = true and status = 'published');
create policy "public read all songs"   on songs           for select using (true); -- admin reads all
create policy "public read homepage"    on homepage_config for select using (true);
create policy "public read assets"      on assets          for select using (true);

-- Authenticated write policies (admin users only)
create policy "auth write artists"     on artists         for all using (auth.role() = 'authenticated');
create policy "auth write producers"   on producers       for all using (auth.role() = 'authenticated');
create policy "auth write brands"      on brands          for all using (auth.role() = 'authenticated');
create policy "auth write releases"    on releases        for all using (auth.role() = 'authenticated');
create policy "auth write songs"       on songs           for all using (auth.role() = 'authenticated');
create policy "auth write assets"      on assets          for all using (auth.role() = 'authenticated');
create policy "auth write homepage"    on homepage_config for all using (auth.role() = 'authenticated');

-- ─── Storage Buckets ────────────────────────────────────────────────────────
-- Run in Supabase Dashboard → Storage → New Bucket:
-- Bucket name: "media"   → Public: true
-- Or via CLI: supabase storage buckets create media --public

-- ─── Phase 5 migration — Brand operations ────────────────────────────────────
-- Run these ALTER TABLE statements after the initial schema above if upgrading
-- an existing database.  They are safe to run multiple times (IF NOT EXISTS).

alter table brands add column if not exists hero_headline       text;
alter table brands add column if not exists hero_subcopy        text;
alter table brands add column if not exists campaign_status     text
  check (campaign_status in ('active', 'inactive', 'upcoming'));
alter table brands add column if not exists collection_name     text;
alter table brands add column if not exists featured_release_slugs jsonb;
alter table brands add column if not exists featured_song_slugs    jsonb;
alter table brands add column if not exists featured_asset_ids     jsonb;
