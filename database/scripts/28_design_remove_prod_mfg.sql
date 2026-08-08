-- Migration 28: Remove production_code and manufacturing_name from design_master

-- ── 1. Drop columns ────────────────────────────────────────────
ALTER TABLE design_master DROP COLUMN IF EXISTS production_code;
ALTER TABLE design_master DROP COLUMN IF EXISTS manufacturing_name;

-- ── 2. Update design_list_get ──────────────────────────────────
UPDATE project_config SET
  key_value = 'SELECT id, design_code, design_no, collection_name, product_name, design_attributes::text AS design_attributes FROM design_master WHERE is_active = TRUE ORDER BY design_code'
WHERE key_code = 'design_list_get';

-- ── 3. Update design_create ────────────────────────────────────
UPDATE project_config SET
  key_value = 'INSERT INTO design_master (design_code, design_no, collection_name, product_name, design_attributes) VALUES (:design_code, :design_no, :collection_name, :product_name, :design_attributes::jsonb) RETURNING *'
WHERE key_code = 'design_create';

-- ── 4. Update design_next_no — filter by collection only ───────
UPDATE project_config SET
  key_value = 'SELECT LPAD((COALESCE(MAX(CASE WHEN design_no ~ ''^[0-9]+$'' THEN design_no::integer ELSE 0 END), 0) + 1)::text, 5, ''0'') AS next_no FROM design_master WHERE collection_name = :collection_name AND is_active = TRUE'
WHERE key_code = 'design_next_no';
