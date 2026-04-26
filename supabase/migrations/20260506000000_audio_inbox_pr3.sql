-- PR3: Metadata variants, selection, locking, pinned comment, CTA copy
ALTER TABLE audio_inbox
  ADD COLUMN title_variants            JSONB    NOT NULL DEFAULT '[]',
  ADD COLUMN selected_title_index      SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN thumbnail_variants        JSONB    NOT NULL DEFAULT '[]',
  ADD COLUMN selected_thumbnail_index  SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN pinned_comment            TEXT,
  ADD COLUMN cta_copy                  TEXT,
  ADD COLUMN locked_title              BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN locked_metadata           BOOLEAN  NOT NULL DEFAULT FALSE;
