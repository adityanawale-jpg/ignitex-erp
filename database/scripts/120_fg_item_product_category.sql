-- ══════════════════════════════════════════════════════════════
-- 120_fg_item_product_category.sql
-- FG Item Master → Product Category (PRODUCT lookup type)
--
-- Per-item field shown on the Design card after Creation Date. Distinct
-- from product_name, which carries the design's Sub Collection
-- (SUB_COLLECTION lookup) copied over at create time.
--
-- Reference copy of prisma migration 20260727000002_fg_item_product_category
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- 1. Column
ALTER TABLE fg_item_master ADD COLUMN IF NOT EXISTS product_category VARCHAR(100);

-- 2. FG item CRUD runs through project_config templates — keep them in step
--    (fg_item_get_by_id selects i.* so it needs no change)
UPDATE project_config
SET key_value = 'INSERT INTO fg_item_master (design_id, design_code, design_no, collection_name, product_name, product_category, manufacturing_name, jewellery_type, sku_type, gender, tech_type, manufacturing_level, occasion, group_sales, sub_category, status, uom1, uom2, video_upload, video_360) VALUES (:design_id, :design_code, :design_no, :collection_name, :product_name, :product_category, :manufacturing_name, :jewellery_type, :sku_type, :gender, :tech_type, :manufacturing_level, :occasion, :group_sales, :sub_category, :status, :uom1, :uom2, :video_upload, :video_360) RETURNING *'
WHERE key_code = 'fg_item_create';

UPDATE project_config
SET key_value = 'UPDATE fg_item_master SET manufacturing_name=:manufacturing_name, jewellery_type=:jewellery_type, sku_type=:sku_type, gender=:gender, tech_type=:tech_type, manufacturing_level=:manufacturing_level, occasion=:occasion, group_sales=:group_sales, sub_category=:sub_category, product_category=:product_category, status=:status, uom1=:uom1, uom2=:uom2, video_upload=:video_upload, video_360=:video_360, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *'
WHERE key_code = 'fg_item_update';

COMMIT;
