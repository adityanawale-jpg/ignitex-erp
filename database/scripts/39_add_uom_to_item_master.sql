-- ============================================================
-- 39_add_uom_to_item_master.sql
-- Add uom1 and uom2 columns to item_master; update project_config
-- queries for fg_item_create and fg_item_update to include them.
-- Run after 38_remove_bom_tables.sql
-- ============================================================

BEGIN;

-- 1. Add columns
ALTER TABLE item_master
  ADD COLUMN IF NOT EXISTS uom1 VARCHAR(50),
  ADD COLUMN IF NOT EXISTS uom2 VARCHAR(50);

-- 2. Update fg_item_create to include uom1, uom2
UPDATE project_config
SET key_value = E'INSERT INTO item_master (item_code, design_id, design_code, design_no, collection_name, product_name, manufacturing_name, jewellery_type, sku_type, gender, tech_type, manufacturing_level, occasion, group_sales, sub_category, status, uom1, uom2) VALUES (\'FG-\' || TO_CHAR(CURRENT_DATE, \'YYYYMM\') || \'-\' || LPAD(nextval(\'item_code_seq\')::text, 4, \'0\'), :design_id, :design_code, :design_no, :collection_name, :product_name, :manufacturing_name, :jewellery_type, :sku_type, :gender, :tech_type, :manufacturing_level, :occasion, :group_sales, :sub_category, :status, :uom1, :uom2) RETURNING *'
WHERE key_code = 'fg_item_create';

-- 3. Update fg_item_update to include uom1, uom2
UPDATE project_config
SET key_value = 'UPDATE item_master SET jewellery_type=:jewellery_type, sku_type=:sku_type, gender=:gender, tech_type=:tech_type, manufacturing_level=:manufacturing_level, occasion=:occasion, group_sales=:group_sales, sub_category=:sub_category, status=:status, uom1=:uom1, uom2=:uom2, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *'
WHERE key_code = 'fg_item_update';

COMMIT;
