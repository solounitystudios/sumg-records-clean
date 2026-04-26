-- PR4: Intelligent routing config per YouTube channel
ALTER TABLE yt_channels
  ADD COLUMN preferred_genres  TEXT[]   NOT NULL DEFAULT '{}',
  ADD COLUMN bpm_min           SMALLINT,
  ADD COLUMN bpm_max           SMALLINT,
  ADD COLUMN routing_priority  SMALLINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN yt_channels.preferred_genres IS 'Genres routed to this channel. Empty = accepts all.';
COMMENT ON COLUMN yt_channels.bpm_min          IS 'Lower BPM bound for routing. NULL = no bound.';
COMMENT ON COLUMN yt_channels.bpm_max          IS 'Upper BPM bound for routing. NULL = no bound.';
COMMENT ON COLUMN yt_channels.routing_priority IS 'Tiebreaker when routing scores are equal. Higher = preferred.';
