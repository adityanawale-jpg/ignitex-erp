-- ============================================================
-- 110_deactivation_cols_in_item_lists.sql
-- Add deactivation_reason + deactivated_at to the FG / Finding
-- item list queries so the main grids can show Deactive Reason
-- and Deactive Date after the Active column.
-- Safe to re-run (UPDATE is idempotent).
-- NOTE: query-config is cached in memory — restart the API (or
-- call the admin cache-flush endpoint) after running this.
-- ============================================================

BEGIN;

UPDATE project_config
SET key_value = $q$SELECT i.id, i.design_code, i.design_no, i.manufacturing_name, i.collection_name, i.product_name, i.sub_category, i.jewellery_type, i.sku_type, i.gender, i.tech_type, i.manufacturing_level, i.occasion, i.group_sales, i.status, i.is_active, i.deactivation_reason, i.deactivated_at, i.created_at, STRING_AGG(v.sku_code, ', ' ORDER BY v.sku_code) AS sku_code FROM fg_item_master i LEFT JOIN fg_item_variant v ON v.item_id = i.id AND v.is_active = TRUE WHERE (i.is_active = CASE WHEN :status = 'active' THEN TRUE WHEN :status = 'inactive' THEN FALSE ELSE i.is_active END) AND (COALESCE(:search, '') = '' OR i.design_code ILIKE '%' || :search || '%' OR i.product_name ILIKE '%' || :search || '%' OR i.manufacturing_name ILIKE '%' || :search || '%' OR i.collection_name ILIKE '%' || :search || '%') GROUP BY i.id ORDER BY i.design_code LIMIT :limit OFFSET :offset$q$
WHERE key_code = 'fg_item_list_get';

UPDATE project_config
SET key_value = $q$SELECT i.id, i.design_code, i.design_no, i.manufacturing_name, i.collection_name, i.product_name, i.sub_category, i.jewellery_type, i.sku_type, i.gender, i.tech_type, i.manufacturing_level, i.occasion, i.group_sales, i.status, i.is_active, i.deactivation_reason, i.deactivated_at, i.created_at, COUNT(v.id)::int AS variant_count, STRING_AGG(v.sku_code, ', ' ORDER BY v.sku_code) AS sku_code FROM fin_item_master i LEFT JOIN fin_item_variant v ON v.item_id = i.id AND v.is_active = TRUE WHERE (i.is_active = CASE WHEN :status = 'active' THEN TRUE WHEN :status = 'inactive' THEN FALSE ELSE i.is_active END) AND (COALESCE(:search, '') = '' OR i.design_code ILIKE '%' || :search || '%' OR i.product_name ILIKE '%' || :search || '%' OR i.manufacturing_name ILIKE '%' || :search || '%' OR i.collection_name ILIKE '%' || :search || '%') GROUP BY i.id ORDER BY i.design_code LIMIT :limit OFFSET :offset$q$
WHERE key_code = 'fin_item_list_get';

COMMIT;
