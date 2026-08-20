CREATE TABLE IF NOT EXISTS lead_magnet_leads (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  email_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  first_lead_magnet_slug TEXT NOT NULL,
  last_lead_magnet_slug TEXT NOT NULL,
  first_source_path TEXT NOT NULL,
  last_source_path TEXT NOT NULL,
  unsubscribe_token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lead_magnet_events (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES lead_magnet_leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lead_magnet_sequence_jobs (
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

CREATE INDEX IF NOT EXISTS idx_lead_magnet_sequence_due
  ON lead_magnet_sequence_jobs(status, due_at);

CREATE INDEX IF NOT EXISTS idx_lead_magnet_events_lead
  ON lead_magnet_events(lead_id, created_at);
