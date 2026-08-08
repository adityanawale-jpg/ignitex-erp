-- ============================================================
-- 24_item_update_mfg_name.sql
-- Adds manufacturing_name to fg_item_update query so it can
-- be edited from the Item Classification section
-- Run after 23_design_create_update.sql
-- ============================================================

BEGIN;

UPDATE project_config
SET
  key_value  = 'UPDATE item_master SET manufacturing_name=:manufacturing_name, jewellery_type=:jewellery_type, sku_type=:sku_type, gender=:gender, tech_type=:tech_type, manufacturing_level=:manufacturing_level, occasion=:occasion, group_sales=:group_sales, sub_category=:sub_category, status=:status, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *',
  updated_at = CURRENT_TIMESTAMP
WHERE key_code = 'fg_item_update';

COMMIT;
