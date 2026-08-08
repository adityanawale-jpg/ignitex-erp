-- Migration 26: Move item master list query to server-side pagination + search
-- Updates fg_item_list_get to accept :search, :status, :limit, :offset
-- Adds fg_item_list_count for total count with same filters
-- Adds fg_item_stats for active/inactive summary counts

-- ── 1. Update fg_item_list_get ─────────────────────────────────
UPDATE project_config SET
  key_value = 'SELECT i.id, i.item_code, i.design_code, i.manufacturing_name, i.collection_name, i.product_name, i.sub_category, i.jewellery_type, i.sku_type, i.gender, i.tech_type, i.manufacturing_level, i.occasion, i.group_sales, i.status, i.is_active, i.created_at, COUNT(v.id)::int AS variant_count FROM item_master i LEFT JOIN item_variant v ON v.item_id = i.id AND v.is_active = TRUE WHERE (i.is_active = CASE WHEN :status = ''active'' THEN TRUE WHEN :status = ''inactive'' THEN FALSE ELSE i.is_active END) AND (COALESCE(:search, '''') = '''' OR i.item_code ILIKE ''%'' || :search || ''%'' OR i.product_name ILIKE ''%'' || :search || ''%'' OR i.manufacturing_name ILIKE ''%'' || :search || ''%'' OR i.collection_name ILIKE ''%'' || :search || ''%'') GROUP BY i.id ORDER BY i.item_code LIMIT :limit OFFSET :offset',
  description = 'FG items worklist — server-side search + pagination (:status, :search, :limit, :offset)'
WHERE key_code = 'fg_item_list_get';

-- ── 2. Add count query ─────────────────────────────────────────
INSERT INTO project_config (key_code, key_value, description, config_type, is_active)
VALUES (
  'fg_item_list_count',
  'SELECT COUNT(*)::int AS total FROM item_master i WHERE (i.is_active = CASE WHEN :status = ''active'' THEN TRUE WHEN :status = ''inactive'' THEN FALSE ELSE i.is_active END) AND (COALESCE(:search, '''') = '''' OR i.item_code ILIKE ''%'' || :search || ''%'' OR i.product_name ILIKE ''%'' || :search || ''%'' OR i.manufacturing_name ILIKE ''%'' || :search || ''%'' OR i.collection_name ILIKE ''%'' || :search || ''%'')',
  'Count FG items with search + status filter',
  'query', TRUE
)
ON CONFLICT (key_code) DO UPDATE SET
  key_value   = EXCLUDED.key_value,
  description = EXCLUDED.description;

-- ── 3. Add stats query ─────────────────────────────────────────
INSERT INTO project_config (key_code, key_value, description, config_type, is_active)
VALUES (
  'fg_item_stats',
  'SELECT COUNT(CASE WHEN is_active = TRUE THEN 1 END)::int AS active, COUNT(CASE WHEN is_active = FALSE THEN 1 END)::int AS inactive FROM item_master',
  'FG item active / inactive totals',
  'query', TRUE
)
ON CONFLICT (key_code) DO UPDATE SET
  key_value   = EXCLUDED.key_value,
  description = EXCLUDED.description;
