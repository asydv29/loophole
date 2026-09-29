ALTER TABLE sources ADD COLUMN integration_type TEXT NOT NULL DEFAULT 'adapter';
ALTER TABLE sources ADD COLUMN endpoint_url TEXT;
ALTER TABLE sources ADD COLUMN auth_mode TEXT NOT NULL DEFAULT 'none';
ALTER TABLE sources ADD COLUMN secret_name TEXT;
ALTER TABLE sources ADD COLUMN last_test_at TEXT;
ALTER TABLE sources ADD COLUMN last_test_status TEXT;
CREATE TABLE IF NOT EXISTS sync_logs (
  id TEXT PRIMARY KEY,
  source_id TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,
  videos_found INTEGER NOT NULL DEFAULT 0,
  videos_added INTEGER NOT NULL DEFAULT 0,
  videos_updated INTEGER NOT NULL DEFAULT 0,
  duplicates INTEGER NOT NULL DEFAULT 0,
  http_status INTEGER,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  FOREIGN KEY(source_id) REFERENCES sources(id)
);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_source ON sync_logs(source_id);
