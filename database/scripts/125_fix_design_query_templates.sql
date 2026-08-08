-- ══════════════════════════════════════════════════════════════
-- 125_fix_design_query_templates.sql
-- Master Management → FG Master / Finding Master → Add New Design
--
-- The design_create / design_list_get / design_update templates in
-- project_config had drifted to reference design_master.product_category — a
-- column that does not exist. Product Category is a per-item field on
-- fg_item_master (migration 20260727000002_fg_item_product_category), not a
-- design attribute, and migration 20260726000001_design_master_type_bifurcation
-- had left these templates without it.
--
-- The drift broke two things at once, on both masters:
--   • Save Design → "Failed to create record"
--   • Design Code dropdown → silently empty (the page swallows list errors)
--
-- Reset all three to the schema they actually run against. Written as plain
-- assignments rather than a conditional patch so any environment that drifted
-- lands on the same text.
-- Reference copy of prisma migration 20260728000005_fix_design_query_templates
-- Run after 124_sales_order_line_rework.sql
-- ══════════════════════════════════════════════════════════════

BEGIN;


UPDATE project_config SET
  key_value = 'INSERT INTO design_master (design_code, design_no, collection_name, product_name, design_attributes, design_type) VALUES (:design_code, :design_no, :collection_name, :product_name, :design_attributes::jsonb, :design_type) RETURNING *',
  updated_at = CURRENT_TIMESTAMP
WHERE key_code = 'design_create';

UPDATE project_config SET
  key_value = 'SELECT id, design_code, design_no, collection_name, product_name, design_attributes::text AS design_attributes, design_image FROM design_master WHERE is_active = TRUE AND (design_type = :design_type OR design_type IS NULL) ORDER BY design_code',
  updated_at = CURRENT_TIMESTAMP
WHERE key_code = 'design_list_get';

UPDATE project_config SET
  key_value = 'UPDATE design_master SET design_no=:design_no, collection_name=:collection_name, product_name=:product_name, design_attributes=:design_attributes::jsonb, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *',
  updated_at = CURRENT_TIMESTAMP
WHERE key_code = 'design_update';

COMMIT;
