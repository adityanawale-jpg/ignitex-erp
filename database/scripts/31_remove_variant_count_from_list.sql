-- Migration 31: Remove variant_count from fg_item_list_get
-- variant_count column is removed from the grid; JOIN on item_variant is
-- still needed for STRING_AGG(sku_code).

BEGIN;

UPDATE project_config SET
  key_value = 'SELECT i.id, i.design_code, i.design_no, i.manufacturing_name, i.collection_name, i.product_name, i.sub_category, i.jewellery_type, i.sku_type, i.gender, i.tech_type, i.manufacturing_level, i.occasion, i.group_sales, i.status, i.is_active, i.created_at, STRING_AGG(v.sku_code, '', '' ORDER BY v.sku_code) AS sku_code FROM item_master i LEFT JOIN item_variant v ON v.item_id = i.id AND v.is_active = TRUE WHERE (i.is_active = CASE WHEN :status = ''active'' THEN TRUE WHEN :status = ''inactive'' THEN FALSE ELSE i.is_active END) AND (COALESCE(:search, '''') = '''' OR i.design_code ILIKE ''%'' || :search || ''%'' OR i.product_name ILIKE ''%'' || :search || ''%'' OR i.manufacturing_name ILIKE ''%'' || :search || ''%'' OR i.collection_name ILIKE ''%'' || :search || ''%'') GROUP BY i.id ORDER BY i.design_code LIMIT :limit OFFSET :offset',
  description = 'FG items worklist — no variant_count, sku_code from variants'
WHERE key_code = 'fg_item_list_get';

COMMIT;
