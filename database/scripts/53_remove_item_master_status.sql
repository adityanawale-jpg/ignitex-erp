-- ============================================================
-- 53_remove_item_master_status.sql -> done in local
-- Remove status column from item_master — field no longer used
-- in Finished Goods Items master management.
-- ============================================================

BEGIN;

-- Drop the status column from item_master
ALTER TABLE item_master DROP COLUMN IF EXISTS status;

-- Remove STATUS lookup values from master_lookup
DELETE FROM master_lookup WHERE lookup_type = 'STATUS';

-- Update project_config queries to remove status field

-- fg_item_list_get: remove i.status from SELECT
UPDATE project_config
SET key_value = $q$SELECT i.id, i.design_code, i.design_no, i.manufacturing_name, i.collection_name, i.product_name, i.sub_category, i.jewellery_type, i.sku_type, i.gender, i.tech_type, i.manufacturing_level, i.occasion, i.group_sales, i.is_active, i.created_at, STRING_AGG(v.sku_code, ', ' ORDER BY v.sku_code) AS sku_code FROM item_master i LEFT JOIN item_variant v ON v.item_id = i.id AND v.is_active = TRUE WHERE (i.is_active = CASE WHEN :status = 'active' THEN TRUE WHEN :status = 'inactive' THEN FALSE ELSE i.is_active END) AND (COALESCE(:search, '') = '' OR i.design_code ILIKE '%' || :search || '%' OR i.product_name ILIKE '%' || :search || '%' OR i.manufacturing_name ILIKE '%' || :search || '%' OR i.collection_name ILIKE '%' || :search || '%') GROUP BY i.id ORDER BY i.design_code LIMIT :limit OFFSET :offset$q$,
    description = 'FG items worklist — paginated, searchable, sku_code aggregated from variants'
WHERE key_code = 'fg_item_list_get';

-- fg_item_create: remove status column and :status param
UPDATE project_config
SET key_value = 'INSERT INTO item_master (design_id, design_code, design_no, collection_name, product_name, manufacturing_name, jewellery_type, sku_type, gender, tech_type, manufacturing_level, occasion, group_sales, sub_category, uom1, uom2) VALUES (:design_id, :design_code, :design_no, :collection_name, :product_name, :manufacturing_name, :jewellery_type, :sku_type, :gender, :tech_type, :manufacturing_level, :occasion, :group_sales, :sub_category, :uom1, :uom2) RETURNING *',
    description = 'Create FG item'
WHERE key_code = 'fg_item_create';

-- fg_item_update: remove status=:status from SET
UPDATE project_config
SET key_value = 'UPDATE item_master SET manufacturing_name=:manufacturing_name, jewellery_type=:jewellery_type, sku_type=:sku_type, gender=:gender, tech_type=:tech_type, manufacturing_level=:manufacturing_level, occasion=:occasion, group_sales=:group_sales, sub_category=:sub_category, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *',
    description = 'Update FG item classification'
WHERE key_code = 'fg_item_update';

COMMIT;
