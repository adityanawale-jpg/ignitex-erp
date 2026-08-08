-- Migration 29: Upsert all design_master queries + drop legacy columns
-- Uses INSERT ... ON CONFLICT so keys are created if missing, updated if present

-- ── 1. Drop legacy columns (safe if already dropped) ──────────────────────────
ALTER TABLE design_master DROP COLUMN IF EXISTS production_code;
ALTER TABLE design_master DROP COLUMN IF EXISTS manufacturing_name;

-- ── 2. design_list_get ────────────────────────────────────────────────────────
INSERT INTO project_config (key_code, key_value, description, config_type, is_active)
VALUES (
  'design_list_get',
  'SELECT id, design_code, design_no, collection_name, product_name, design_attributes::text AS design_attributes FROM design_master WHERE is_active = TRUE ORDER BY design_code',
  'List all active designs',
  'query', TRUE
)
ON CONFLICT (key_code) DO UPDATE SET
  key_value   = EXCLUDED.key_value,
  description = EXCLUDED.description;

-- ── 3. design_create ──────────────────────────────────────────────────────────
INSERT INTO project_config (key_code, key_value, description, config_type, is_active)
VALUES (
  'design_create',
  'INSERT INTO design_master (design_code, design_no, collection_name, product_name, design_attributes) VALUES (:design_code, :design_no, :collection_name, :product_name, :design_attributes::jsonb) RETURNING *',
  'Create a new design record',
  'query', TRUE
)
ON CONFLICT (key_code) DO UPDATE SET
  key_value   = EXCLUDED.key_value,
  description = EXCLUDED.description;

-- ── 4. design_next_no — sequence per product_name + collection_name ───────────
INSERT INTO project_config (key_code, key_value, description, config_type, is_active)
VALUES (
  'design_next_no',
  'SELECT LPAD((COALESCE(MAX(CASE WHEN design_no ~ ''^[0-9]+$'' THEN design_no::integer ELSE 0 END), 0) + 1)::text, 5, ''0'') AS next_no FROM design_master WHERE product_name = :product_name AND collection_name = :collection_name AND is_active = TRUE',
  'Next design_no for a product_name + collection_name combination',
  'query', TRUE
)
ON CONFLICT (key_code) DO UPDATE SET
  key_value   = EXCLUDED.key_value,
  description = EXCLUDED.description;
