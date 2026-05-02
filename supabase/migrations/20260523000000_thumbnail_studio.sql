-- Thumbnail Intelligence System
-- Adds scalable per-producer thumbnail generation, versioning, and approval workflow.
-- Non-destructive: all new tables, only additive columns on existing tables.

-- ─── Extend yt_upload_jobs ────────────────────────────────────────────────────

ALTER TABLE yt_upload_jobs
  ADD COLUMN IF NOT EXISTS thumbnail_mode   text DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS thumbnail_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS thumbnail_prompt text;

-- ─── thumbnail_profiles ───────────────────────────────────────────────────────
-- One row per producer/artist. Stores visual identity for prompt generation.

CREATE TABLE IF NOT EXISTS thumbnail_profiles (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_slug    text        UNIQUE NOT NULL,
  identity_json    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  color_palette    jsonb       NOT NULL DEFAULT '[]'::jsonb,
  banned_elements  jsonb       NOT NULL DEFAULT '[]'::jsonb,
  title_style      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  active           boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE thumbnail_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_thumbnail_profiles"
  ON thumbnail_profiles FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'co_owner', 'admin')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'co_owner', 'admin')
  );

-- ─── thumbnail_presets ────────────────────────────────────────────────────────
-- Named visual presets per producer (e.g. NightWire — MindLoft, Buffalo Noir).

CREATE TABLE IF NOT EXISTS thumbnail_presets (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_slug      text        UNIQUE NOT NULL,
  producer_slug    text,
  name             text        NOT NULL,
  description      text,
  canvas_defaults  jsonb       NOT NULL DEFAULT '{}'::jsonb,
  prompt_defaults  jsonb       NOT NULL DEFAULT '{}'::jsonb,
  active           boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE thumbnail_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_thumbnail_presets"
  ON thumbnail_presets FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'co_owner', 'admin')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'co_owner', 'admin')
  );

-- ─── thumbnail_projects ───────────────────────────────────────────────────────
-- One studio project per upload job. Tracks the approval lifecycle.

CREATE TABLE IF NOT EXISTS thumbnail_projects (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_job_id        uuid        REFERENCES yt_upload_jobs(id) ON DELETE CASCADE,
  producer_slug        text,
  title                text,
  status               text        NOT NULL DEFAULT 'draft',
  selected_version_id  uuid,
  approved_asset_id    uuid,
  canvas_json          jsonb       NOT NULL DEFAULT '{}'::jsonb,
  preset_slug          text,
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tnail_project_status CHECK (status IN ('draft','in_review','approved','rejected'))
);

ALTER TABLE thumbnail_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_thumbnail_projects"
  ON thumbnail_projects FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'co_owner', 'admin')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'co_owner', 'admin')
  );

-- ─── thumbnail_versions ───────────────────────────────────────────────────────
-- Multiple image variants per project (generated or manually added).

CREATE TABLE IF NOT EXISTS thumbnail_versions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid        NOT NULL REFERENCES thumbnail_projects(id) ON DELETE CASCADE,
  asset_id       uuid,
  image_url      text        NOT NULL,
  prompt         text,
  provider       text,
  style_bucket   text,
  version_number integer     NOT NULL DEFAULT 1,
  selected       boolean     NOT NULL DEFAULT false,
  rejected       boolean     NOT NULL DEFAULT false,
  ctr_score      numeric,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE thumbnail_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_thumbnail_versions"
  ON thumbnail_versions FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'co_owner', 'admin')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'co_owner', 'admin')
  );

-- ─── thumbnail_prompts ────────────────────────────────────────────────────────
-- Prompt library per producer. Grows over time with winners/losers.

CREATE TABLE IF NOT EXISTS thumbnail_prompts (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_slug  text        NOT NULL,
  category       text,
  prompt         text        NOT NULL,
  style_bucket   text,
  ctr_score      numeric,
  winner_bool    boolean     NOT NULL DEFAULT false,
  active         boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE thumbnail_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_thumbnail_prompts"
  ON thumbnail_prompts FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'co_owner', 'admin')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'co_owner', 'admin')
  );

-- ─── thumbnail_assets ─────────────────────────────────────────────────────────
-- Studio-generated or curated thumbnail image library.

CREATE TABLE IF NOT EXISTS thumbnail_assets (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_slug        text,
  image_url            text        NOT NULL,
  prompt_used          text,
  linked_song_id       uuid,
  linked_upload_job_id uuid        REFERENCES yt_upload_jobs(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE thumbnail_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_thumbnail_assets"
  ON thumbnail_assets FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'co_owner', 'admin')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'co_owner', 'admin')
  );

-- ─── FK: yt_upload_jobs → thumbnail_projects ─────────────────────────────────
-- Added after thumbnail_projects is created.

ALTER TABLE yt_upload_jobs
  ADD COLUMN IF NOT EXISTS thumbnail_project_id uuid REFERENCES thumbnail_projects(id) ON DELETE SET NULL;

-- ─── Seed NightWire presets ───────────────────────────────────────────────────

INSERT INTO thumbnail_presets (preset_slug, producer_slug, name, description, canvas_defaults, prompt_defaults)
VALUES
  (
    'nightwire-mindloft',
    'nightwire',
    'NightWire — MindLoft',
    'Hidden private lofts, strange luxury, Black creative society, smoke, jazz psychedelic trap.',
    '{"textPosition":"bottom-left","logoPosition":"bottom-right","overlay":"soft-black-gradient","fontStyle":"bold-condensed","textColor":"#f5f0e8","strokeColor":"#1a0a2e","fontSize":52}',
    '{"style_bucket":"MindLoft Sessions","camera":"disposable flash photography","colors":["purple","gold","black"],"mood":["hidden luxury","private culture","jazz psychedelic"]}'
  ),
  (
    'nightwire-buffalo-noir',
    'nightwire',
    'NightWire — Buffalo Noir',
    'Route 33, wet asphalt, Buffalo lights, VHS movement, late-night dangerous calm.',
    '{"textPosition":"top-left","logoPosition":"bottom-right","overlay":"cold-blue-vignette","fontStyle":"bold-industrial","textColor":"#e8f0ff","strokeColor":"#050a0d","fontSize":56}',
    '{"style_bucket":"Buffalo Noir","camera":"VHS camcorder","colors":["navy","wet asphalt","purple neon"],"mood":["late night","dangerous calm","city motion"]}'
  ),
  (
    'nightwire-jazz-smoke',
    'nightwire',
    'NightWire — Jazz Smoke',
    'Jazz rooms, red velvet, smoke, emotional loneliness, elegant underground music energy.',
    '{"textPosition":"bottom-left","logoPosition":"top-right","overlay":"warm-vignette","fontStyle":"serif-italic","textColor":"#ffe8cc","strokeColor":"#0d0205","fontSize":48}',
    '{"style_bucket":"Jazz Smoke","camera":"35mm film grain","colors":["crimson","deep purple","tungsten yellow"],"mood":["emotional","rare","jazz underground"]}'
  ),
  (
    'nightwire-harlem-private-society',
    'nightwire',
    'NightWire — Harlem Private Society',
    'Brownstones, lofts, private parties, secret cultural rooms, warm flash, elite underground.',
    '{"textPosition":"bottom-right","logoPosition":"top-left","overlay":"soft-black-gradient","fontStyle":"bold-condensed","textColor":"#ffffff","strokeColor":"#1a0a2e","fontSize":50}',
    '{"style_bucket":"Harlem Private Society","camera":"magazine editorial flash","colors":["warm gold","emerald","black"],"mood":["exclusive","cultural","stylish chaos"]}'
  )
ON CONFLICT (preset_slug) DO NOTHING;

-- ─── Seed NightWire profile ───────────────────────────────────────────────────

INSERT INTO thumbnail_profiles (producer_slug, identity_json, color_palette, banned_elements, title_style)
VALUES (
  'nightwire',
  '{
    "genre": "Jazz Psychedelic Trap",
    "audience": "18-34 creators, beat lovers, Black creatives, nightlife people, future tastemakers",
    "brand": "Young Black creative moving through culture, private rooms, hidden luxury, jazz energy, elevated underground",
    "core_emotions": ["mysterious","stylish","cultural","exclusive","creative genius","nightlife energy","nostalgic future","weird but tasteful"],
    "visual_world": ["Harlem loft parties","Buffalo Route 33","hidden lounges","museum after-hours","jazz rooms","luxury townhouse kitchens","underground parking garages","brownstone poker rooms"],
    "camera_styles": ["disposable flash camera","35mm film grain","VHS camcorder","old iPhone footage","CCTV security camera","Arri Alexa cinematic","paparazzi zoom lens","magazine editorial flash","macro close-up","backseat POV"],
    "auto_rules": "Use Black culture scenes, elite weird moments, jazz mood, nightlife, stylish realism, nostalgia, secret rooms, Buffalo/Harlem references, cinematic grain, elevated underground energy"
  }',
  '["#2d1b69","#0f0f1a","#7b2d2d","#1a472a","#1e3a5f","#f0c040","#c0a060","#f5d0b0","#c0c0c0"]',
  '["cheap trap money clichés","anime/cartoon art","corny fake AI rappers","generic sports cars","generic laptop-in-studio thumbnails","random flames/lightning","low-taste luxury","overused chains-only","cluttered unreadable thumbnails"]',
  '{"style":"emotional/curiosity","examples":["They Didn''t See This Coming","Entered Different","Buffalo Nights Feel Different","Hidden Room Energy","This Beat Should Be Illegal","Rare Vibes Only","What Was Happening Here?","Nobody Talks About This Side","Midnight in Buffalo","Dangerous Taste"]}'
)
ON CONFLICT (producer_slug) DO NOTHING;

COMMENT ON TABLE thumbnail_profiles  IS 'Per-producer visual identity used to generate consistent thumbnail prompts.';
COMMENT ON TABLE thumbnail_projects  IS 'One studio project per upload job — tracks generation, editing, and approval.';
COMMENT ON TABLE thumbnail_versions  IS 'Generated or uploaded image variants for a thumbnail project.';
COMMENT ON TABLE thumbnail_presets   IS 'Named visual presets (e.g. NightWire MindLoft) with canvas + prompt defaults.';
COMMENT ON TABLE thumbnail_prompts   IS 'Prompt library per producer, grows with CTR-tracked winners.';
COMMENT ON TABLE thumbnail_assets    IS 'Curated thumbnail image library linked to producers and jobs.';
