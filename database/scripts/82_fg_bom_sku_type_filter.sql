-- ============================================================
-- 82_fg_bom_sku_type_filter.sql
-- FG BOM main grid: restrict to variants where sku_type = 'FG'
-- (FG Master Variant Management variants only).
-- The controller's buildWhere() already handles the list/count
-- queries; only the stored stats query needs updating here.
-- Run after 81_fin_variant_weight_queries.sql
-- ============================================================

BEGIN;

UPDATE project_config
SET key_value =
'SELECT
  COUNT(*) FILTER (WHERE bf.bom_status = ''DRAFT'' OR bf.id IS NULL) AS draft,
  COUNT(*) FILTER (WHERE bf.bom_status = ''PENDING_APPROVAL'')       AS pending_approval,
  COUNT(*) FILTER (WHERE bf.bom_status = ''ACTIVE'')                 AS active
FROM fg_item_variant iv
JOIN fg_item_master im ON iv.item_id = im.id
LEFT JOIN LATERAL (
  SELECT id, bom_status
  FROM   bom_fg
  WHERE  variant_id = iv.id AND is_active = TRUE
  ORDER  BY created_at DESC LIMIT 1
) bf ON TRUE
WHERE iv.is_active = TRUE
  AND iv.sku_type = ''FG'''
WHERE key_code = 'fg_bom_stats';

COMMIT;
