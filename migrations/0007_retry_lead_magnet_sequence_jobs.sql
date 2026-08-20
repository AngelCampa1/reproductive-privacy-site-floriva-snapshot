ALTER TABLE lead_magnet_sequence_jobs
  ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_lead_magnet_sequence_stale_processing
  ON lead_magnet_sequence_jobs(status, updated_at);
