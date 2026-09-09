-- PROPOSAL — NOT APPLIED. See supabase/migrations_proposed/README.md.
--
-- A3 — Editorial / Routing. Additive only.
-- Depends on: nothing at the DB level (same loose subject_type/subject_id
-- convention as A2).

CREATE TABLE IF NOT EXISTS catalog_editorial_decisions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type  TEXT        NOT NULL CHECK (subject_type IN ('work', 'recording', 'song', 'release')),
  subject_id    TEXT        NOT NULL,
  decision_type TEXT        NOT NULL,
  value         JSONB       NOT NULL DEFAULT '{}',
  -- provenance mirror of lib/catalog/provenance.ts's ProvenanceValue shape
  source        TEXT        NOT NULL CHECK (source IN
                   ('measured', 'deterministic', 'ai_inferred', 'editor_assigned',
                    'founder_assigned', 'telemetry_learned', 'imported_source')),
  authority     TEXT        NOT NULL CHECK (authority IN ('suggestion', 'derived', 'canonical', 'policy')),
  confidence    NUMERIC,
  decided_by    TEXT        NOT NULL,
  decided_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalog_editorial_decisions_subject_idx
  ON catalog_editorial_decisions (subject_type, subject_id);

-- AI cannot author a canonical decision — mirrors the A2 rights backstop.
ALTER TABLE catalog_editorial_decisions
  ADD CONSTRAINT catalog_editorial_decisions_ai_not_canonical
  CHECK (NOT (source = 'ai_inferred' AND authority = 'canonical'));

CREATE TABLE IF NOT EXISTS catalog_routing_recipes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  description  TEXT        NOT NULL DEFAULT '',
  rules        JSONB       NOT NULL DEFAULT '{}',
  created_by   TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalog_routing_decisions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type        TEXT        NOT NULL CHECK (subject_type IN ('work', 'recording', 'song', 'release')),
  subject_id          TEXT        NOT NULL,
  recipe_id           UUID        REFERENCES catalog_routing_recipes(id) ON DELETE SET NULL,
  proposed_assignment JSONB       NOT NULL DEFAULT '{}',
  -- a routing decision is born 'proposed' and can only ever be flipped by an
  -- explicit human action — nothing in this schema lets a recipe write
  -- 'approved' directly (enforced in lib/catalog/routing.ts, mirrored here).
  status              TEXT        NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected')),
  decided_by          TEXT,
  decided_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((status = 'proposed') = (decided_by IS NULL AND decided_at IS NULL))
);
CREATE INDEX IF NOT EXISTS catalog_routing_decisions_subject_idx
  ON catalog_routing_decisions (subject_type, subject_id);

ALTER TABLE catalog_editorial_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_routing_recipes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_routing_decisions   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cms all catalog_editorial_decisions" ON catalog_editorial_decisions FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());
CREATE POLICY "cms all catalog_routing_recipes"     ON catalog_routing_recipes     FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());
CREATE POLICY "cms all catalog_routing_decisions"   ON catalog_routing_decisions   FOR ALL USING (is_cms_role()) WITH CHECK (is_cms_role());

-- Reversal: DROP TABLE IF EXISTS catalog_routing_decisions, catalog_routing_recipes, catalog_editorial_decisions.
