INSERT OR IGNORE INTO lead_magnet_resource_requests (
  id,
  lead_id,
  lead_magnet_slug,
  source_path,
  created_at
)
SELECT
  'backfill-' || e.id,
  e.lead_id,
  json_extract(e.metadata_json, '$.slug'),
  COALESCE(l.last_source_path, ''),
  e.created_at
FROM lead_magnet_events e
INNER JOIN lead_magnet_leads l ON l.id = e.lead_id
WHERE e.event_type = 'resource_sent'
  AND json_valid(e.metadata_json)
  AND typeof(json_extract(e.metadata_json, '$.slug')) = 'text'
  AND trim(json_extract(e.metadata_json, '$.slug')) <> '';
