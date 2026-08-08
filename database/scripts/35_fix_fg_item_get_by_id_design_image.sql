-- ============================================================
-- 35_fix_fg_item_get_by_id_design_image.sql
-- Fix 1: fg_item_get_by_id was not returning d.design_image from
--        the design_master JOIN → photo missing in edit mode.
-- Fix 2: design_list_get (from PROD_item_master_setup.sql) was
--        missing design_image column → dropdown thumbnails broken
--        and matched.design_image was always undefined.
-- Run after 34_supplier_master.sql
-- ============================================================

UPDATE project_config
SET key_value = 'SELECT i.*, d.design_attributes::text AS design_attributes_json, d.design_image FROM item_master i LEFT JOIN design_master d ON d.design_code = i.design_code WHERE i.id = :id',
    description = 'FG item by id (incl. design_image)'
WHERE key_code = 'fg_item_get_by_id';

UPDATE project_config
SET key_value = 'SELECT id, design_code, design_no, collection_name, product_name, design_attributes::text AS design_attributes, design_image FROM design_master WHERE is_active = TRUE ORDER BY design_code',
    description = 'List all active designs (incl. design_image)'
WHERE key_code = 'design_list_get';
