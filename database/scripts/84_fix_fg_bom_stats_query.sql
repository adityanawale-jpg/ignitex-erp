-- ============================================================
-- 84_fix_fg_bom_stats_query.sql
-- Migration 82 incorrectly added iv.sku_type = 'FG' to the
-- fg_bom_stats query. FG variants have sub-type codes like
-- 'STANDARD', 'EXPORT', etc. — not the literal code 'FG'.
-- The item-level filter (im.sku_type = 'FG' via JOIN) is the
-- correct gate. This reverts the stats query to use only the
-- im.sku_type = 'FG' join condition.
-- Run after 83_fix_fg_item_toggle_returning.sql
-- ============================================================

BEGIN;

UPDATE project_config
SET key_value =
'SELECT
  COUNT(*) FILTER (WHERE bf.bom_status = ''DRAFT'' OR bf.id IS NULL) AS draft,
  COUNT(*) FILTER (WHERE bf.bom_status = ''PENDING_APPROVAL'')       AS pending_approval,
  COUNT(*) FILTER (WHERE bf.bom_status = ''ACTIVE'')                 AS active
FROM fg_item_variant iv
JOIN fg_item_master im ON iv.item_id = im.id AND im.sku_type = ''FG''
LEFT JOIN LATERAL (
  SELECT id, bom_status
  FROM   bom_fg
  WHERE  variant_id = iv.id AND is_active = TRUE
  ORDER  BY created_at DESC LIMIT 1
) bf ON TRUE
WHERE iv.is_active = TRUE'
WHERE key_code = 'fg_bom_stats';

COMMIT;
