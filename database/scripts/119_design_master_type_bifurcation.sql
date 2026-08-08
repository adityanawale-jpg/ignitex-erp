-- ══════════════════════════════════════════════════════════════
-- 119_design_master_type_bifurcation.sql
-- Master Management → FG Master / Finding Master → New Design
--   Bifurcate design_master by module (FG vs Finding) so a design
--   created from one Master's "New Design" doesn't show up in the
--   other's Design Code search.
--
--   Existing designs used by exactly one module are backfilled to
--   that type; designs already shared by both modules (or unused by
--   either) are left NULL, which design_list_get still treats as
--   visible everywhere — preserving current behavior for that
--   ambiguous slice of historical data.
-- ══════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE design_master ADD COLUMN IF NOT EXISTS design_type VARCHAR(20);

UPDATE design_master d SET design_type = 'FG'
WHERE EXISTS (SELECT 1 FROM fg_item_master f WHERE f.design_id = d.id)
  AND NOT EXISTS (SELECT 1 FROM fin_item_master f WHERE f.design_id = d.id);

UPDATE design_master d SET design_type = 'FINDING'
WHERE EXISTS (SELECT 1 FROM fin_item_master f WHERE f.design_id = d.id)
  AND NOT EXISTS (SELECT 1 FROM fg_item_master f WHERE f.design_id = d.id);

UPDATE project_config SET
  key_value = 'INSERT INTO design_master (design_code, design_no, collection_name, product_name, design_attributes, design_type) VALUES (:design_code, :design_no, :collection_name, :product_name, :design_attributes::jsonb, :design_type) RETURNING *',
  updated_at = CURRENT_TIMESTAMP
WHERE key_code = 'design_create';

UPDATE project_config SET
  key_value = 'SELECT id, design_code, design_no, collection_name, product_name, design_attributes::text AS design_attributes, design_image FROM design_master WHERE is_active = TRUE AND (design_type = :design_type OR design_type IS NULL) ORDER BY design_code',
  updated_at = CURRENT_TIMESTAMP
WHERE key_code = 'design_list_get';

COMMIT;
