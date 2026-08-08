-- ============================================================
-- 46_fix_fg_item_create_query.sql
-- Migration 39 accidentally re-introduced item_code (dropped in 30)
-- into the fg_item_create INSERT query. Fix it to use the correct
-- columns: no item_code, but with uom1 and uom2.
-- ============================================================

BEGIN;

UPDATE project_config
SET key_value = 'INSERT INTO item_master (design_id, design_code, design_no, collection_name, product_name, manufacturing_name, jewellery_type, sku_type, gender, tech_type, manufacturing_level, occasion, group_sales, sub_category, uom1, uom2) VALUES (:design_id, :design_code, :design_no, :collection_name, :product_name, :manufacturing_name, :jewellery_type, :sku_type, :gender, :tech_type, :manufacturing_level, :occasion, :group_sales, :sub_category, :uom1, :uom2) RETURNING *',
    description = 'Create FG item — no item_code, includes uom1/uom2'
WHERE key_code = 'fg_item_create';

COMMIT;
