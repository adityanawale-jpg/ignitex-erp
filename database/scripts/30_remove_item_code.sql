-- Migration 30: Remove item_code from item_master, add sku_code to list query
-- item_code is replaced by design_code as the primary identifier.
-- SKU codes are now surfaced from item_variant in the list query.

BEGIN;

-- ── 1. Drop item_code column from item_master ────────────────────
ALTER TABLE item_master DROP COLUMN IF EXISTS item_code;
DROP SEQUENCE IF EXISTS item_code_seq;

-- ── 2. Update fg_item_list_get ──────────────────────────────────
-- Remove item_code; add sku_codes aggregated from variants; order by design_code
UPDATE project_config SET
  key_value = 'SELECT i.id, i.design_code, i.design_no, i.manufacturing_name, i.collection_name, i.product_name, i.sub_category, i.jewellery_type, i.sku_type, i.gender, i.tech_type, i.manufacturing_level, i.occasion, i.group_sales, i.status, i.is_active, i.created_at, COUNT(v.id)::int AS variant_count, STRING_AGG(v.sku_code, '', '' ORDER BY v.sku_code) AS sku_code FROM item_master i LEFT JOIN item_variant v ON v.item_id = i.id AND v.is_active = TRUE WHERE (i.is_active = CASE WHEN :status = ''active'' THEN TRUE WHEN :status = ''inactive'' THEN FALSE ELSE i.is_active END) AND (COALESCE(:search, '''') = '''' OR i.design_code ILIKE ''%'' || :search || ''%'' OR i.product_name ILIKE ''%'' || :search || ''%'' OR i.manufacturing_name ILIKE ''%'' || :search || ''%'' OR i.collection_name ILIKE ''%'' || :search || ''%'') GROUP BY i.id ORDER BY i.design_code LIMIT :limit OFFSET :offset',
  description = 'FG items worklist — no item_code, sku_code from variants'
WHERE key_code = 'fg_item_list_get';

-- ── 3. Update fg_item_list_count ────────────────────────────────
UPDATE project_config SET
  key_value = 'SELECT COUNT(*)::int AS total FROM item_master i WHERE (i.is_active = CASE WHEN :status = ''active'' THEN TRUE WHEN :status = ''inactive'' THEN FALSE ELSE i.is_active END) AND (COALESCE(:search, '''') = '''' OR i.design_code ILIKE ''%'' || :search || ''%'' OR i.product_name ILIKE ''%'' || :search || ''%'' OR i.manufacturing_name ILIKE ''%'' || :search || ''%'' OR i.collection_name ILIKE ''%'' || :search || ''%'')'
WHERE key_code = 'fg_item_list_count';

-- ── 4. Update fg_item_create ────────────────────────────────────
-- Remove item_code from INSERT (was auto-generated via sequence)
UPDATE project_config SET
  key_value = 'INSERT INTO item_master (design_id, design_code, design_no, collection_name, product_name, manufacturing_name, jewellery_type, sku_type, gender, tech_type, manufacturing_level, occasion, group_sales, sub_category, status) VALUES (:design_id, :design_code, :design_no, :collection_name, :product_name, :manufacturing_name, :jewellery_type, :sku_type, :gender, :tech_type, :manufacturing_level, :occasion, :group_sales, :sub_category, :status) RETURNING *',
  description = 'Create FG item (no item_code)'
WHERE key_code = 'fg_item_create';

-- ── 5. Update fg_item_toggle ────────────────────────────────────
UPDATE project_config SET
  key_value = 'UPDATE item_master SET is_active = NOT is_active, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING id, design_code, is_active'
WHERE key_code = 'fg_item_toggle';

COMMIT;
