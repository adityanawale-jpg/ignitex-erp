-- Migration 19: Add updated_at to master_lookup
ALTER TABLE master_lookup ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
UPDATE master_lookup SET updated_at = created_at WHERE updated_at IS NULL;
