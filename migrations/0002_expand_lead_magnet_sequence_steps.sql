CREATE TABLE IF NOT EXISTS lead_magnet_sequence_jobs_new (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES lead_magnet_leads(id) ON DELETE CASCADE,
  lead_magnet_slug TEXT NOT NULL,
  sequence_step INTEGER NOT NULL CHECK (sequence_step IN (2, 3, 4, 5, 6, 7, 8)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  due_at TEXT NOT NULL,
  sent_at TEXT,
  resend_response_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO lead_magnet_sequence_jobs_new (
  id, lead_id, lead_magnet_slug, sequence_step, status, due_at, sent_at,
  resend_response_json, created_at, updated_at
)
SELECT
  id, lead_id, lead_magnet_slug, sequence_step, status, due_at, sent_at,
  resend_response_json, created_at, updated_at
FROM lead_magnet_sequence_jobs;

DROP TABLE lead_magnet_sequence_jobs;

ALTER TABLE lead_magnet_sequence_jobs_new RENAME TO lead_magnet_sequence_jobs;

CREATE INDEX IF NOT EXISTS idx_lead_magnet_sequence_due
  ON lead_magnet_sequence_jobs(status, due_at);
