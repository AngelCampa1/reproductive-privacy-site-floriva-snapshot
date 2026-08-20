-- Revive the dormant lead_magnet_sequence_jobs table for the in-app nurture drip
-- (previously handled by the external Sequencer service). The table + base indexes
-- already exist from 0001/0002/0007; this migration only adds the idempotency
-- guarantee and a deterministic key so re-enrollment can never double-schedule.

-- The pre-Sequencer in-app scheme left duplicate (lead, slug, step) rows in the
-- table (all terminal: sent/cancelled). Collapse each group to one row so the
-- unique index below can be created. No-op on a table without duplicates.
DELETE FROM lead_magnet_sequence_jobs
WHERE rowid NOT IN (
  SELECT MIN(rowid)
  FROM lead_magnet_sequence_jobs
  GROUP BY lead_id, lead_magnet_slug, sequence_step
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_magnet_sequence_unique
  ON lead_magnet_sequence_jobs(lead_id, lead_magnet_slug, sequence_step);

ALTER TABLE lead_magnet_sequence_jobs
  ADD COLUMN idempotency_key TEXT;
