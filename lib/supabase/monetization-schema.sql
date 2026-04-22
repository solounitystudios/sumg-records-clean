-- ============================================================
-- Monetization schema — email subscribers + contact submissions
-- Run once in Supabase SQL editor after the main schema.sql.
-- All statements are additive and safe to re-run.
-- ============================================================

-- ─── Email subscribers ───────────────────────────────────────────────────────
-- Collects opt-in emails from site widgets (footer, artist pages, release
-- pages, homepage).  The `source` column records which widget fired the
-- signup so you can measure which surface converts best.

CREATE TABLE IF NOT EXISTS email_subscribers (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  email      TEXT        UNIQUE NOT NULL,
  source     TEXT,                       -- 'footer' | 'artist' | 'release' | 'homepage'
  status     TEXT        NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (anon insert)
CREATE POLICY "anon insert subscribers"
  ON email_subscribers FOR INSERT
  WITH CHECK (true);

-- Only authenticated admins can read the list
CREATE POLICY "auth read subscribers"
  ON email_subscribers FOR SELECT
  USING (auth.role() = 'authenticated');

-- ─── Contact submissions ─────────────────────────────────────────────────────
-- Stores messages from the public /contact form.
-- Admins read these via the dashboard; no auto-email yet.

CREATE TABLE IF NOT EXISTS contact_submissions (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  subject    TEXT,
  message    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can submit (anon insert)
CREATE POLICY "anon insert contacts"
  ON contact_submissions FOR INSERT
  WITH CHECK (true);

-- Only authenticated admins can read submissions
CREATE POLICY "auth read contacts"
  ON contact_submissions FOR SELECT
  USING (auth.role() = 'authenticated');
