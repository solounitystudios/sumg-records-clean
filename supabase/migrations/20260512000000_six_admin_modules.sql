-- ============================================================
-- Six admin modules: finance, publishing, contracts,
-- documents, messages, tasks
-- Additive-only, fully idempotent.
-- ============================================================

-- ── Finance ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS finance_transactions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT        NOT NULL CHECK (type IN ('income', 'expense')),
  category      TEXT        NOT NULL,
  amount        NUMERIC(12,2) NOT NULL,
  currency      TEXT        NOT NULL DEFAULT 'USD',
  transaction_date DATE     NOT NULL,
  description   TEXT        NOT NULL DEFAULT '',
  artist_slug   TEXT,
  release_slug  TEXT,
  notes         TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE finance_transactions
  DROP CONSTRAINT IF EXISTS finance_transactions_type_check;
ALTER TABLE finance_transactions
  ADD CONSTRAINT finance_transactions_type_check
  CHECK (type IN ('income', 'expense'));

-- ── Publishing works ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS publishing_works (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL,
  artist_slug   TEXT,
  release_slug  TEXT,
  song_id       UUID,
  iswc          TEXT        NOT NULL DEFAULT '',
  writers       JSONB       NOT NULL DEFAULT '[]',
  publishers    JSONB       NOT NULL DEFAULT '[]',
  splits        JSONB       NOT NULL DEFAULT '{}',
  pro           TEXT        NOT NULL DEFAULT '',
  status        TEXT        NOT NULL DEFAULT 'unregistered',
  notes         TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE publishing_works
  DROP CONSTRAINT IF EXISTS publishing_works_status_check;
ALTER TABLE publishing_works
  ADD CONSTRAINT publishing_works_status_check
  CHECK (status IN ('unregistered', 'pending', 'registered'));

-- ── Contracts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contracts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT        NOT NULL,
  type            TEXT        NOT NULL DEFAULT 'recording',
  status          TEXT        NOT NULL DEFAULT 'draft',
  artist_slug     TEXT,
  counterparty    TEXT        NOT NULL DEFAULT '',
  effective_date  DATE,
  expiry_date     DATE,
  notes           TEXT        NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS contracts_type_check;
ALTER TABLE contracts
  ADD CONSTRAINT contracts_type_check
  CHECK (type IN ('recording', 'distribution', 'sync', 'publishing',
                  'management', 'merchandise', 'brand_deal', 'nda'));

ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE contracts
  ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('draft', 'sent', 'signed', 'expired', 'void'));

-- ── Contract templates ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS contract_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'recording',
  body_text   TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Documents ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL,
  category      TEXT        NOT NULL DEFAULT 'other',
  status        TEXT        NOT NULL DEFAULT 'active',
  artist_slug   TEXT,
  release_slug  TEXT,
  contract_id   UUID,
  description   TEXT        NOT NULL DEFAULT '',
  file_url      TEXT        NOT NULL DEFAULT '',
  file_name     TEXT        NOT NULL DEFAULT '',
  file_size     BIGINT,
  mime_type     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_category_check;
ALTER TABLE documents
  ADD CONSTRAINT documents_category_check
  CHECK (category IN ('party', 'project', 'release', 'contract', 'task', 'legal', 'other'));

ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_status_check;
ALTER TABLE documents
  ADD CONSTRAINT documents_status_check
  CHECK (status IN ('pending', 'active', 'signed', 'expired', 'archived', 'needs_review', 'rejected'));

-- ── Message threads ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_threads (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject       TEXT        NOT NULL,
  entity_type   TEXT,
  entity_id     TEXT,
  created_by    TEXT        NOT NULL DEFAULT '',
  is_archived   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Messages ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   UUID        NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  body        TEXT        NOT NULL,
  sender_name TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Admin tasks ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_tasks (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL,
  description   TEXT        NOT NULL DEFAULT '',
  status        TEXT        NOT NULL DEFAULT 'open',
  priority      TEXT        NOT NULL DEFAULT 'medium',
  assigned_to   TEXT,
  entity_type   TEXT,
  entity_id     TEXT,
  due_date      DATE,
  created_by    TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_tasks
  DROP CONSTRAINT IF EXISTS admin_tasks_status_check;
ALTER TABLE admin_tasks
  ADD CONSTRAINT admin_tasks_status_check
  CHECK (status IN ('open', 'in_progress', 'blocked', 'done'));

ALTER TABLE admin_tasks
  DROP CONSTRAINT IF EXISTS admin_tasks_priority_check;
ALTER TABLE admin_tasks
  ADD CONSTRAINT admin_tasks_priority_check
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS finance_transactions_type_idx ON finance_transactions(type);
CREATE INDEX IF NOT EXISTS finance_transactions_date_idx ON finance_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS finance_transactions_artist_idx ON finance_transactions(artist_slug);
CREATE INDEX IF NOT EXISTS publishing_works_artist_idx ON publishing_works(artist_slug);
CREATE INDEX IF NOT EXISTS contracts_artist_idx ON contracts(artist_slug);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON contracts(status);
CREATE INDEX IF NOT EXISTS documents_category_idx ON documents(category);
CREATE INDEX IF NOT EXISTS documents_status_idx ON documents(status);
CREATE INDEX IF NOT EXISTS message_messages_thread_idx ON message_messages(thread_id);
CREATE INDEX IF NOT EXISTS admin_tasks_status_idx ON admin_tasks(status);
CREATE INDEX IF NOT EXISTS admin_tasks_priority_idx ON admin_tasks(priority);
