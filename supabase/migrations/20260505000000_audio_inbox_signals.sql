-- PR2: Signal intelligence columns for audio_inbox
ALTER TABLE audio_inbox
  ADD COLUMN bpm              NUMERIC(6,2),
  ADD COLUMN key_signature    TEXT,
  ADD COLUMN duration_seconds NUMERIC(8,2),
  ADD COLUMN quality_score    SMALLINT,
  ADD COLUMN commercial_score SMALLINT,
  ADD COLUMN ctr_score        SMALLINT,
  ADD COLUMN signal_data      JSONB DEFAULT '{}';
