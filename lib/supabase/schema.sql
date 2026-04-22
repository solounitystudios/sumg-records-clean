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
-- All writes require a CMS role in the JWT app_metadata claim.
-- Service-role key bypasses RLS entirely (used only by server-side admin ops).
--
-- CMS roles: admin | editor | media_manager | release_manager
-- Role is provisioned via:
--   supabase.auth.admin.updateUserById(id, { app_metadata: { role: 'admin' } })
--
-- /admin/settings* is further restricted to admin only at the middleware layer
-- (proxy.ts) — there is no separate DB policy for settings.

-- ── is_cms_role() helper ──────────────────────────────────────────────────────
-- Returns true when the authenticated JWT carries a recognised CMS role.
-- Used as the WITH CHECK / USING predicate on all write policies below.
create or replace function is_cms_role()
  returns boolean
  language sql
  security definer
  stable
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    ''
  ) = any(array['admin', 'editor', 'media_manager', 'release_manager'])
$$;

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
-- Only published, visible releases are publicly readable.
-- CMS users can read all releases via the write policy below.
create policy "public read releases"    on releases        for select using (is_visible = true and status = 'published');
-- Only published, visible songs are publicly readable.
-- CMS users can read all songs via the write policy below.
create policy "public read songs"       on songs           for select using (is_visible = true and status = 'published');
create policy "public read homepage"    on homepage_config for select using (true);
create policy "public read assets"      on assets          for select using (true);

-- CMS write policies — require a valid CMS role in JWT app_metadata
create policy "cms write artists"     on artists         for all using (is_cms_role()) with check (is_cms_role());
create policy "cms write producers"   on producers       for all using (is_cms_role()) with check (is_cms_role());
create policy "cms write brands"      on brands          for all using (is_cms_role()) with check (is_cms_role());
create policy "cms write releases"    on releases        for all using (is_cms_role()) with check (is_cms_role());
create policy "cms write songs"       on songs           for all using (is_cms_role()) with check (is_cms_role());
create policy "cms write assets"      on assets          for all using (is_cms_role()) with check (is_cms_role());
create policy "cms write homepage"    on homepage_config for all using (is_cms_role()) with check (is_cms_role());

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
create policy "cms write timeline"    on artist_timeline_items for all    using (is_cms_role()) with check (is_cms_role());

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


alter table artist_spotify_snapshots enable row level security;
create policy if not exists "public read artist snapshots"
  on artist_spotify_snapshots for select using (true);
create policy if not exists "cms write artist snapshots"
  on artist_spotify_snapshots for all using (is_cms_role()) with check (is_cms_role());
-- Additive: site-wide settings persisted via /admin/settings
ALTER TABLE homepage_config
  ADD COLUMN IF NOT EXISTS site_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ─── Phase 2 — Auth / RLS Hardening ──────────────────────────────────────────
-- Run after all previous migrations.  All statements are idempotent.
--
-- Changes:
--   1. New role helper functions: is_admin_role(), is_publisher_role()
--   2. Explicit GRANT EXECUTE on all three role helpers
--   3. RLS on the five Shopify tables added in Phase 6 (previously unprotected)
--   4. site_config table — splits site_settings out of homepage_config so that
--      admin-only site settings can be enforced at the DB level independently
--      of the broader homepage curation that all CMS roles can use
--   5. Publisher-only gate on releases / songs: only admin + release_manager can
--      publish (set status='published' or is_visible=true)

-- ── Role helpers ─────────────────────────────────────────────────────────────

-- Returns true for admin role only.
create or replace function is_admin_role()
  returns boolean
  language sql
  security definer
  stable
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    ''
  ) = 'admin'
$$;

-- Returns true for admin and release_manager roles.
create or replace function is_publisher_role()
  returns boolean
  language sql
  security definer
  stable
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    ''
  ) = any(array['admin', 'release_manager'])
$$;

-- Explicit grants — Supabase auto-grants public schema functions but making this
-- explicit ensures the helpers work under the anon and authenticated roles
-- regardless of future schema ownership changes.
grant execute on function is_cms_role()       to authenticated, anon;
grant execute on function is_admin_role()     to authenticated, anon;
grant execute on function is_publisher_role() to authenticated, anon;

-- ── Shopify table RLS ────────────────────────────────────────────────────────
-- Phase 6 created these tables without RLS — any bearer of the publishable key
-- could read and write them.  shopify_orders contains customer PII (name, email,
-- line_items) and must be restricted to CMS users only.

alter table shopify_products         enable row level security;
alter table shopify_collections      enable row level security;
alter table shopify_orders           enable row level security;
alter table shopify_inventory_items  enable row level security;
alter table shopify_campaigns        enable row level security;

-- shopify_orders: customer PII — CMS read, admin-only write
create policy "cms read orders"       on shopify_orders for select using (is_cms_role());
create policy "admin write orders"    on shopify_orders for all    using (is_admin_role()) with check (is_admin_role());

-- shopify_products: internal Shopify sync cache — all CMS roles read/write
create policy "cms read products"     on shopify_products for select using (is_cms_role());
create policy "cms write products"    on shopify_products for all   using (is_cms_role()) with check (is_cms_role());

-- shopify_collections: internal Shopify sync cache — all CMS roles read/write
create policy "cms read collections"  on shopify_collections for select using (is_cms_role());
create policy "cms write collections" on shopify_collections for all   using (is_cms_role()) with check (is_cms_role());

-- shopify_inventory_items: internal Shopify sync cache — all CMS roles read/write
create policy "cms read inventory"    on shopify_inventory_items for select using (is_cms_role());
create policy "cms write inventory"   on shopify_inventory_items for all   using (is_cms_role()) with check (is_cms_role());

-- shopify_campaigns: SUMG-managed campaigns — all CMS roles read/write
create policy "cms read campaigns"    on shopify_campaigns for select using (is_cms_role());
create policy "cms write campaigns"   on shopify_campaigns for all   using (is_cms_role()) with check (is_cms_role());

-- ── site_config table ────────────────────────────────────────────────────────
-- Holds site-wide settings (site name, social links, analytics IDs, etc.).
-- Split out of homepage_config.site_settings so it can carry an admin-only
-- write policy without affecting the broader homepage curation workflow.
--
-- Migration path:
--   1. Create the table and seed it from homepage_config.site_settings.
--   2. Update app/admin/settings/page.tsx to read/write site_config.
--   3. Drop homepage_config.site_settings in a later cleanup migration once the
--      app has been deployed and the column is confirmed unused.

create table if not exists site_config (
  id            text primary key default 'global',
  site_settings jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now()
);

-- Seed from existing homepage_config.site_settings (runs once; safe to re-run)
insert into site_config (id, site_settings)
  select 'global', coalesce(site_settings, '{}'::jsonb)
  from homepage_config
  where id = 'homepage'
  on conflict (id) do update
    set site_settings = excluded.site_settings;

alter table site_config enable row level security;

-- All CMS roles can read site_config (needed for the settings page load).
create policy "cms read site_config"    on site_config for select using (is_cms_role());
-- Only admins may write site_config — enforces the /admin/settings DB-level gate.
create policy "admin write site_config" on site_config for all    using (is_admin_role()) with check (is_admin_role());

-- ── Publisher gate on releases and songs ─────────────────────────────────────
-- Replace the broad 'for all' write policies with per-operation policies so that
-- only admin + release_manager can publish content (set status='published' or
-- is_visible=true).  Any other CMS role (editor, media_manager) can only write
-- rows that result in status != 'published' AND is_visible = false.
--
-- Trade-off: editors cannot save changes to a row that is already in published
-- state at the DB level.  In practice, all CMS writes go through server-side
-- lib/cms/ functions that use the service-role key, which bypasses RLS.
-- Direct client-side SDK calls from the browser (the attack surface this closes)
-- are still correctly gated.
--
-- NOTE: 'drop policy if exists' requires Postgres 9.4+ (Supabase default).

-- Helper used in WITH CHECK on releases and songs UPDATE policies.
-- Returns true when the candidate row is in a non-published, non-visible state —
-- i.e. safe for a non-publisher to write.
create or replace function is_unpublished_state(p_status text, p_is_visible boolean)
  returns boolean
  language sql
  immutable
as $$
  select p_status != 'published' and not p_is_visible
$$;

grant execute on function is_unpublished_state(text, boolean) to authenticated, anon;

drop policy if exists "cms write releases" on releases;
-- CMS roles can read all releases (drafts, scheduled, published, archived).
create policy "cms select releases"  on releases for select using (is_cms_role());
-- Any CMS role can insert a new release (always starts as draft/not-visible).
create policy "cms insert releases"  on releases for insert with check (is_cms_role());
-- Any CMS role can update; but the resulting row must not be published/visible
-- unless the caller is a publisher (admin or release_manager).
create policy "cms update releases"  on releases
  for update
  using (is_cms_role())
  with check (
    is_cms_role()
    and (is_publisher_role() or is_unpublished_state(status, is_visible))
  );
-- Only publishers (admin, release_manager) may delete releases.
create policy "cms delete releases"  on releases for delete using (is_publisher_role());

drop policy if exists "cms write songs" on songs;
-- CMS roles can read all songs.
create policy "cms select songs"     on songs for select using (is_cms_role());
-- Any CMS role can insert a new song (always starts as draft/not-visible).
create policy "cms insert songs"     on songs for insert with check (is_cms_role());
-- Publisher gate mirrors the releases policy above.
create policy "cms update songs"     on songs
  for update
  using (is_cms_role())
  with check (
    is_cms_role()
    and (is_publisher_role() or is_unpublished_state(status, is_visible))
  );
-- Only publishers may delete songs.
create policy "cms delete songs"     on songs for delete using (is_publisher_role());


-- ─── Agent 7 — Royalty Platform ──────────────────────────────────────────────
-- Three tables: royalty_earnings, royalty_splits, royalty_payouts.
-- All tables are restricted to CMS roles.  Payouts can only be created or
-- mutated by admin + release_manager (publishers) to prevent unauthorised
-- payment manipulation.  Earnings and splits are editable by all CMS roles.

-- ── royalty_earnings ──────────────────────────────────────────────────────────
-- One row per (song/release, platform, period_month) import batch.
create table if not exists royalty_earnings (
  id            text primary key,
  song_slug     text,
  release_slug  text,
  artist_slug   text not null,
  title         text not null default '',
  platform      text not null,
  period_month  text not null, -- YYYY-MM
  gross_amount  numeric(14,4) not null default 0,
  currency      text not null default 'USD',
  streams       integer,
  notes         text,
  created_at    timestamptz not null default now()
);

alter table royalty_earnings enable row level security;
create policy "cms read earnings"   on royalty_earnings for select using (is_cms_role());
create policy "cms write earnings"  on royalty_earnings for all    using (is_cms_role()) with check (is_cms_role());

-- ── royalty_splits ────────────────────────────────────────────────────────────
-- Configures split percentages per song/release for each participant.
-- Sum of split_pct per (song_slug or release_slug) should equal 100.
create table if not exists royalty_splits (
  id                text primary key,
  song_slug         text,
  release_slug      text,
  participant_type  text not null default 'artist'
    check (participant_type in ('artist', 'producer', 'other')),
  participant_slug  text,
  participant_name  text not null,
  split_pct         numeric(6,3) not null default 0
    check (split_pct >= 0 and split_pct <= 100),
  role              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table royalty_splits enable row level security;
create policy "cms read splits"     on royalty_splits for select using (is_cms_role());
create policy "cms write splits"    on royalty_splits for all    using (is_cms_role()) with check (is_cms_role());

-- ── royalty_payouts ───────────────────────────────────────────────────────────
-- Computed payout records — one per participant per period.
-- Only publishers may create or mutate payouts to prevent tampering.
create table if not exists royalty_payouts (
  id                text primary key,
  participant_type  text not null default 'artist'
    check (participant_type in ('artist', 'producer', 'other')),
  participant_slug  text,
  participant_name  text not null,
  period_month      text not null, -- YYYY-MM
  gross_amount      numeric(14,4) not null default 0,
  net_amount        numeric(14,4) not null default 0,
  currency          text not null default 'USD',
  status            text not null default 'pending'
    check (status in ('pending', 'processing', 'paid', 'cancelled')),
  paid_at           timestamptz,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table royalty_payouts enable row level security;
-- All CMS roles may read payouts (transparency).
create policy "cms read payouts"      on royalty_payouts for select using (is_cms_role());
-- Only publishers (admin, release_manager) may create / modify / delete payouts.
create policy "publisher write payouts" on royalty_payouts for all using (is_publisher_role()) with check (is_publisher_role());
