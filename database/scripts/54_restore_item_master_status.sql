-- ============================================================
-- 54_restore_item_master_status.sql
-- Restore status column to item_master — reverses script 53
-- ============================================================

BEGIN;

-- Restore status column
ALTER TABLE item_master ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'DRAFT';

-- Re-insert STATUS lookup values
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('STATUS', 'DRAFT', 'Draft',        1, TRUE),
  ('STATUS', 'ACTIVE', 'Active',      2, TRUE),
  ('STATUS', 'HOLD',  'On Hold',      3, TRUE),
  ('STATUS', 'DISC',  'Discontinued', 4, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

-- Restore fg_item_list_get — include i.status in SELECT
UPDATE project_config
SET key_value = $q$SELECT i.id, i.design_code, i.design_no, i.manufacturing_name, i.collection_name, i.product_name, i.sub_category, i.jewellery_type, i.sku_type, i.gender, i.tech_type, i.manufacturing_level, i.occasion, i.group_sales, i.status, i.is_active, i.created_at, STRING_AGG(v.sku_code, ', ' ORDER BY v.sku_code) AS sku_code FROM item_master i LEFT JOIN item_variant v ON v.item_id = i.id AND v.is_active = TRUE WHERE (i.is_active = CASE WHEN :status = 'active' THEN TRUE WHEN :status = 'inactive' THEN FALSE ELSE i.is_active END) AND (COALESCE(:search, '') = '' OR i.design_code ILIKE '%' || :search || '%' OR i.product_name ILIKE '%' || :search || '%' OR i.manufacturing_name ILIKE '%' || :search || '%' OR i.collection_name ILIKE '%' || :search || '%') GROUP BY i.id ORDER BY i.design_code LIMIT :limit OFFSET :offset$q$,
    description = 'FG items worklist — paginated, searchable, sku_code aggregated from variants'
WHERE key_code = 'fg_item_list_get';

-- Restore fg_item_create — include status
UPDATE project_config
SET key_value = $q$INSERT INTO item_master (design_id, design_code, design_no, collection_name, product_name, manufacturing_name, jewellery_type, sku_type, gender, tech_type, manufacturing_level, occasion, group_sales, sub_category, status, uom1, uom2) VALUES (:design_id, :design_code, :design_no, :collection_name, :product_name, :manufacturing_name, :jewellery_type, :sku_type, :gender, :tech_type, :manufacturing_level, :occasion, :group_sales, :sub_category, :status, :uom1, :uom2) RETURNING *$q$,
    description = 'Create FG item'
WHERE key_code = 'fg_item_create';

-- Restore fg_item_update — include status
UPDATE project_config
SET key_value = $q$UPDATE item_master SET manufacturing_name=:manufacturing_name, jewellery_type=:jewellery_type, sku_type=:sku_type, gender=:gender, tech_type=:tech_type, manufacturing_level=:manufacturing_level, occasion=:occasion, group_sales=:group_sales, sub_category=:sub_category, status=:status, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *$q$,
    description = 'Update FG item classification'
WHERE key_code = 'fg_item_update';

COMMIT;
