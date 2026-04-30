-- Migration: email_subscribers
-- Stores newsletter sign-ups captured from the public site.

CREATE TABLE IF NOT EXISTS email_subscribers (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT         NOT NULL UNIQUE,
  source     TEXT         NOT NULL DEFAULT 'site',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;

-- Only authenticated admin roles can read the list; inserts are public (anon).
CREATE POLICY "admin_read_subscribers"
  ON email_subscribers FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'co_owner', 'admin')
  );

CREATE POLICY "public_insert_subscriber"
  ON email_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

COMMENT ON TABLE email_subscribers IS 'Newsletter / mailing-list sign-ups captured from the public site.';
