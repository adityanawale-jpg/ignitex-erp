-- ============================================================
-- 112_finding_used_in_bom.sql
-- Add used_in_bom computed boolean to the Finding Master list
-- query (fin_item_list_get). A Finding's variants can be picked
-- as a line item (item_type = 'FINDING') inside an FG's BOM or
-- another Finding's BOM, so "used elsewhere" here means: does
-- any variant of this Finding appear as an active BOM line.
-- Edit/Deactivate buttons hide on the frontend when this is TRUE
-- (same convention as Component/Metal/Stone's used_in_bom flag).
-- Safe to re-run (UPDATE is idempotent).
-- NOTE: query-config is cached in memory — restart the API (or
-- call the admin cache-flush endpoint) after running this.
-- ============================================================

BEGIN;

UPDATE project_config
SET key_value = $q$SELECT i.id, i.design_code, i.design_no, i.manufacturing_name, i.collection_name, i.product_name, i.sub_category, i.jewellery_type, i.sku_type, i.gender, i.tech_type, i.manufacturing_level, i.occasion, i.group_sales, i.status, i.is_active, i.deactivation_reason, i.deactivated_at, i.created_at, COUNT(v.id)::int AS variant_count, STRING_AGG(v.sku_code, ', ' ORDER BY v.sku_code) AS sku_code, EXISTS (SELECT 1 FROM fin_item_variant v2 WHERE v2.item_id = i.id AND (EXISTS(SELECT 1 FROM bom_fg_detail  d WHERE d.item_id = v2.id AND d.item_type = 'FINDING' AND d.is_active = TRUE) OR EXISTS(SELECT 1 FROM bom_fin_detail d WHERE d.item_id = v2.id AND d.item_type = 'FINDING' AND d.is_active = TRUE))) AS used_in_bom FROM fin_item_master i LEFT JOIN fin_item_variant v ON v.item_id = i.id AND v.is_active = TRUE WHERE (i.is_active = CASE WHEN :status = 'active' THEN TRUE WHEN :status = 'inactive' THEN FALSE ELSE i.is_active END) AND (COALESCE(:search, '') = '' OR i.design_code ILIKE '%' || :search || '%' OR i.product_name ILIKE '%' || :search || '%' OR i.manufacturing_name ILIKE '%' || :search || '%' OR i.collection_name ILIKE '%' || :search || '%') GROUP BY i.id ORDER BY i.design_code LIMIT :limit OFFSET :offset$q$
WHERE key_code = 'fin_item_list_get';

COMMIT;
