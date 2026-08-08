-- ============================================================
-- 86_fg_bom_active_items_only.sql
-- FG BOM grid should only show variants whose parent FG item
-- is also active. Add im.is_active = TRUE to fg_bom_stats so
-- the tab counts match the list rows.
-- (The list/count queries get this via buildWhere in the
--  controller, so only stats needs a DB-level fix.)
-- Run after 85_fix_fg_bom_list_queries.sql
-- ============================================================

BEGIN;

UPDATE project_config SET key_value = $q$SELECT
  COUNT(*) FILTER (WHERE bf.bom_status = 'DRAFT' OR bf.id IS NULL) AS draft,
  COUNT(*) FILTER (WHERE bf.bom_status = 'PENDING_APPROVAL')       AS pending_approval,
  COUNT(*) FILTER (WHERE bf.bom_status = 'ACTIVE')                 AS active
FROM fg_item_variant iv
JOIN fg_item_master im ON iv.item_id = im.id
LEFT JOIN LATERAL (
  SELECT id, bom_status
  FROM   bom_fg
  WHERE  variant_id = iv.id AND is_active = TRUE
  ORDER  BY created_at DESC LIMIT 1
) bf ON TRUE
WHERE iv.is_active = TRUE
  AND im.is_active = TRUE$q$
WHERE key_code = 'fg_bom_stats';

COMMIT;
