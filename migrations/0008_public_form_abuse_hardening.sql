CREATE TABLE IF NOT EXISTS lead_magnet_resource_requests (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES lead_magnet_leads(id) ON DELETE CASCADE,
  lead_magnet_slug TEXT NOT NULL,
  source_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (lead_id, lead_magnet_slug)
);

CREATE INDEX IF NOT EXISTS idx_lead_magnet_resource_requests_lead
  ON lead_magnet_resource_requests(lead_id, created_at);

CREATE TABLE IF NOT EXISTS lead_magnet_submission_attempts (
  id TEXT PRIMARY KEY,
  email_hash TEXT NOT NULL,
  client_key TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_magnet_submission_attempts_email
  ON lead_magnet_submission_attempts(email_hash, created_at);

CREATE INDEX IF NOT EXISTS idx_lead_magnet_submission_attempts_client
  ON lead_magnet_submission_attempts(client_key, created_at);
