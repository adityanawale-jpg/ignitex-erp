-- ============================================================
-- 41_variant_client.sql
-- Add item_variant_client table for multiple client variants
-- per SKU variant. Add project_config CRUD entries.
-- Run after 40_variant_vendor_name.sql
-- ============================================================

BEGIN;

-- 1. Create child table
CREATE TABLE IF NOT EXISTS item_variant_client (
  id                    SERIAL PRIMARY KEY,
  variant_id            INT          NOT NULL REFERENCES item_variant(id) ON DELETE CASCADE,
  customer_name         VARCHAR(255),
  customer_variant_code VARCHAR(100),
  customer_variant_name VARCHAR(200),
  is_active             BOOLEAN      DEFAULT TRUE,
  created_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ivc_variant ON item_variant_client(variant_id);

-- 2. project_config entries
INSERT INTO project_config (key_code, key_value, description, config_type, is_active) VALUES

('fg_variant_client_get',
 'SELECT id, variant_id, customer_name, customer_variant_code, customer_variant_name FROM item_variant_client WHERE variant_id=:variant_id AND is_active=TRUE ORDER BY id',
 'Client variants for a SKU variant', 'query', TRUE),

('fg_variant_client_delete_all',
 'DELETE FROM item_variant_client WHERE variant_id=:variant_id',
 'Delete all client variants for a SKU variant', 'query', TRUE),

('fg_variant_client_create',
 'INSERT INTO item_variant_client (variant_id, customer_name, customer_variant_code, customer_variant_name) VALUES (:variant_id, :customer_name, :customer_variant_code, :customer_variant_name) RETURNING *',
 'Create client variant row', 'query', TRUE);

COMMIT;
