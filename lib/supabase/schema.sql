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
-- Only published, visible, and past-their-publish-date releases are publicly readable.
-- Authenticated users (admin) can read all releases via the write policy below.
create policy "public read releases"    on releases        for select using (is_visible = true and status = 'published');
-- Only published, visible songs are publicly readable.
-- Authenticated users (admin) can read all songs via the write policy below.
create policy "public read songs"       on songs           for select using (is_visible = true and status = 'published');
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

-- ─── Phase 7 migration — DSP links, Provider config, Artist timeline ──────────
-- Safe to run multiple times (IF NOT EXISTS / DO NOTHING).

-- DSP links on songs and releases
alter table songs    add column if not exists dsp_links       jsonb;
alter table releases add column if not exists dsp_links       jsonb;

-- Provider / business config on artists and releases
alter table artists  add column if not exists provider_config jsonb;
alter table releases add column if not exists provider_config jsonb;

-- Artist timeline items
create table if not exists artist_timeline_items (
  id                    text primary key,
  artist_slug           text not null,
  type                  text not null,
  title                 text not null,
  description           text,
  event_date            text not null,
  end_date              text,
  status                text not null default 'draft',
  visibility            text not null default 'private',
  linked_release_slug   text,
  linked_song_slug      text,
  linked_asset_ids      jsonb,
  tags                  jsonb,
  importance            integer not null default 5,
  lyric_engine_eligible boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table artist_timeline_items enable row level security;
create policy "public read timeline"  on artist_timeline_items for select using (true);
create policy "auth write timeline"   on artist_timeline_items for all    using (auth.role() = 'authenticated');

-- ─── Phase A+C migration — Music Operations Layer + Data Integrity ─────────────
-- Additive only — all statements are safe to run multiple times (IF NOT EXISTS).
--
-- New fields enable:
--   • Source-of-truth labeling (data_source) on songs and releases
--   • ISRC at the song level (standard music publishing identifier)
--   • Rights metadata per song and release (PRO, IPI, songwriter credits,
--     composition/registration status, reference URLs)
--   • Distribution tracking per release (distributor, submission/delivery/live
--     status, UPC, distro reference IDs — manual entry, no fake live sync)
--
-- Run after Phase 7 migration.

-- Source-of-truth tracking
alter table songs     add column if not exists data_source         text;
alter table releases  add column if not exists data_source         text;

-- ISRC at song level
alter table songs     add column if not exists isrc                text;

-- Rights metadata (PRO, IPI/CAE, songwriter credits, registration status)
alter table songs     add column if not exists rights_metadata     jsonb;
alter table releases  add column if not exists rights_metadata     jsonb;

-- Distribution record (distributor, statuses, UPC, reference IDs)
alter table releases  add column if not exists distribution_record jsonb;


-- ============================================================
-- Phase 6 — Shopify Commerce Layer (additive migration)
-- Run once in production Supabase SQL editor.
-- ============================================================

-- Shopify products reference table
CREATE TABLE IF NOT EXISTS shopify_products (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  title TEXT NOT NULL,
  vendor TEXT NOT NULL DEFAULT '',
  product_type TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  description TEXT,
  tags JSONB DEFAULT '[]',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  compare_at_price NUMERIC(10,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  image_url TEXT,
  inventory INTEGER NOT NULL DEFAULT 0,
  variants_count INTEGER NOT NULL DEFAULT 1,
  brand_slug TEXT NOT NULL DEFAULT '',
  collection_handle TEXT,
  shopify_gid TEXT,
  last_synced TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shopify collections reference table
CREATE TABLE IF NOT EXISTS shopify_collections (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL,
  title TEXT NOT NULL,
  brand_slug TEXT NOT NULL DEFAULT '',
  description TEXT,
  image_url TEXT,
  products_count INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT false,
  shopify_gid TEXT,
  last_synced TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shopify orders reference table
CREATE TABLE IF NOT EXISTS shopify_orders (
  id TEXT PRIMARY KEY,
  order_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  financial_status TEXT NOT NULL DEFAULT 'pending',
  fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled',
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  customer_name TEXT,
  customer_email TEXT,
  line_items JSONB DEFAULT '[]',
  brand_slug TEXT,
  shopify_gid TEXT,
  last_synced TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shopify inventory items
CREATE TABLE IF NOT EXISTS shopify_inventory_items (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_title TEXT NOT NULL,
  variant_title TEXT,
  sku TEXT,
  available INTEGER NOT NULL DEFAULT 0,
  committed INTEGER NOT NULL DEFAULT 0,
  incoming INTEGER NOT NULL DEFAULT 0,
  brand_slug TEXT NOT NULL DEFAULT '',
  shopify_gid TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Campaigns (SUMG-managed, cross-references Shopify products)
CREATE TABLE IF NOT EXISTS shopify_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand_slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  description TEXT,
  featured_product_ids JSONB DEFAULT '[]',
  goal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Remove deprecated song coupling from brands (safe — columns may not exist)
ALTER TABLE brands DROP COLUMN IF EXISTS featured_song_slugs;


-- ============================================================
-- Phase Security-1 — Role-based RLS write policies
--
-- Replaces the authenticated-wide write policies ("auth.role() = 'authenticated'")
-- with app_metadata.role-based enforcement so that only users who have been
-- explicitly provisioned with a CMS role can write to any table.
--
-- Valid CMS roles: admin | editor | media_manager | release_manager
--
-- Run this migration after all previous migrations.
-- All statements are idempotent: drop-if-exists then create.
-- ============================================================

-- ─── Drop old authenticated-wide write policies ───────────────────────────────
drop policy if exists "auth write artists"   on artists;
drop policy if exists "auth write producers" on producers;
drop policy if exists "auth write brands"    on brands;
drop policy if exists "auth write releases"  on releases;
drop policy if exists "auth write songs"     on songs;
drop policy if exists "auth write assets"    on assets;
drop policy if exists "auth write homepage"  on homepage_config;
drop policy if exists "auth write timeline"  on artist_timeline_items;

-- ─── Role-based write policies (INSERT / UPDATE / DELETE) ────────────────────
-- Any user with a recognised CMS role in app_metadata may write.
-- Users who are authenticated but have no app_metadata.role are rejected.

create policy "role write artists"
  on artists for all
  using  ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor','media_manager','release_manager'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor','media_manager','release_manager'));

create policy "role write producers"
  on producers for all
  using  ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor','media_manager','release_manager'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor','media_manager','release_manager'));

create policy "role write brands"
  on brands for all
  using  ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor','media_manager','release_manager'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor','media_manager','release_manager'));

create policy "role write releases"
  on releases for all
  using  ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor','media_manager','release_manager'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor','media_manager','release_manager'));

create policy "role write songs"
  on songs for all
  using  ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor','media_manager','release_manager'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor','media_manager','release_manager'));

create policy "role write assets"
  on assets for all
  using  ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor','media_manager','release_manager'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor','media_manager','release_manager'));

create policy "role write homepage"
  on homepage_config for all
  using  ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor','media_manager','release_manager'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor','media_manager','release_manager'));

create policy "role write timeline"
  on artist_timeline_items for all
  using  ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor','media_manager','release_manager'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor','media_manager','release_manager'));

-- ─── Admin read policies — draft / non-visible content ───────────────────────
-- The public read policies only expose published + visible rows.
-- These supplemental policies allow role-bearing users to SELECT all rows
-- (including drafts) so the admin UI can display unpublished content.

create policy "role read all releases"
  on releases for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor','media_manager','release_manager'));

create policy "role read all songs"
  on songs for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor','media_manager','release_manager'));

-- ─── Storage object RLS policies — "media" bucket ────────────────────────────
-- Supabase Storage uses RLS on the storage.objects system table.
-- These policies apply after the "media" bucket has been created.
--
-- Public read: any user (anon or authenticated) can read stored files.
--   This preserves existing public-URL behaviour for published assets.
-- Role-gated write: only role-bearing users can upload, update, or delete.
--
-- NOTE: To restrict unreleased content from public access, change the
-- bucket to "Private" in the Supabase Dashboard (Storage → media → Edit)
-- and use signed URLs (sb.storage.createSignedUrl) for display.  That
-- change requires broader app-level updates and is tracked for Phase 2.

drop policy if exists "allow public read media"  on storage.objects;
drop policy if exists "role insert media"         on storage.objects;
drop policy if exists "role update media"         on storage.objects;
drop policy if exists "role delete media"         on storage.objects;

create policy "allow public read media"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

create policy "role insert media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'media' and
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor','media_manager','release_manager')
  );

create policy "role update media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'media' and
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor','media_manager','release_manager')
  )
  with check (
    bucket_id = 'media' and
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor','media_manager','release_manager')
  );

create policy "role delete media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'media' and
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin','editor','media_manager','release_manager')
  );
