CREATE TABLE IF NOT EXISTS ai_sdr_handoffs (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  reason TEXT,
  message TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_company TEXT,
  source_path TEXT,
  forwarded_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_sdr_handoffs_created_at ON ai_sdr_handoffs (created_at);
CREATE INDEX IF NOT EXISTS idx_ai_sdr_handoffs_session_id ON ai_sdr_handoffs (session_id);
