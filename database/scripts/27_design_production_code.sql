-- Migration 27: Add production_code to design_master
-- Auto-generate design_no and design_code: PROD_CODE + COLLECTION + 5-digit sequence

-- ── 1. Add production_code column ─────────────────────────────
ALTER TABLE design_master ADD COLUMN IF NOT EXISTS production_code VARCHAR(20);

-- ── 2. Update design_list_get — include production_code ───────
UPDATE project_config SET
  key_value = 'SELECT id, production_code, design_code, design_no, collection_name, product_name, manufacturing_name, design_attributes::text AS design_attributes FROM design_master WHERE is_active = TRUE ORDER BY design_code'
WHERE key_code = 'design_list_get';

-- ── 3. Update design_create — include production_code ─────────
UPDATE project_config SET
  key_value = 'INSERT INTO design_master (production_code, design_code, design_no, collection_name, product_name, manufacturing_name, design_attributes) VALUES (:production_code, :design_code, :design_no, :collection_name, :product_name, :manufacturing_name, :design_attributes::jsonb) RETURNING *'
WHERE key_code = 'design_create';

-- ── 4. Add design_next_no — next sequential no for prod+collection ──
INSERT INTO project_config (key_code, key_value, description, config_type, is_active)
VALUES (
  'design_next_no',
  'SELECT LPAD((COALESCE(MAX(CASE WHEN design_no ~ ''^[0-9]+$'' THEN design_no::integer ELSE 0 END), 0) + 1)::text, 5, ''0'') AS next_no FROM design_master WHERE COALESCE(production_code, '''') = COALESCE(:production_code, '''') AND collection_name = :collection_name AND is_active = TRUE',
  'Next design_no for a production_code + collection_name combination',
  'query', TRUE
)
ON CONFLICT (key_code) DO UPDATE SET
  key_value   = EXCLUDED.key_value,
  description = EXCLUDED.description;
