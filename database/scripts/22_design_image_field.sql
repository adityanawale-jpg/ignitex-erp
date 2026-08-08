-- ============================================================
-- 22_design_image_field.sql
-- Adds design_image column to design_master
-- Updates design_list_get query to include image URL
-- Run after 21_finished_goods_items.sql
-- ============================================================

BEGIN;

ALTER TABLE design_master
  ADD COLUMN IF NOT EXISTS design_image VARCHAR(500);

-- Update the design_list_get query to include design_image
UPDATE project_config
SET
  key_value  = 'SELECT id, design_code, design_no, collection_name, product_name, manufacturing_name, design_attributes::text AS design_attributes, design_image FROM design_master WHERE is_active = TRUE ORDER BY design_code',
  updated_at = CURRENT_TIMESTAMP
WHERE key_code = 'design_list_get';

COMMIT;
