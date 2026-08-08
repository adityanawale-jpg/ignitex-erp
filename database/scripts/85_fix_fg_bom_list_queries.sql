-- ============================================================
-- 85_fix_fg_bom_list_queries.sql
-- fg_bom_list_select, fg_bom_list_count and fg_bom_stats all
-- JOIN with AND im.sku_type = 'FG'.  New FG items created via
-- the form store sku_type = NULL (no form field), so the JOIN
-- fails and they never appear in the BOM grid.
-- Since fg_item_master is exclusively for FG items (dedicated
-- table since migration 66), the sku_type guard is unnecessary.
-- Remove it from all three queries.
-- Run after 84_fix_fg_bom_stats_query.sql
-- ============================================================

BEGIN;

-- ── 1. fg_bom_list_select ────────────────────────────────────
UPDATE project_config SET key_value = $q$SELECT
  iv.id           AS variant_id,
  iv.sku_code,
  iv.karat_color,
  iv.weight_band,
  iv.size,
  im.collection_name,
  im.design_code,
  im.design_no,
  im.product_name,
  bf.id           AS bom_id,
  COALESCE(bf.bom_status, 'NO_BOM') AS bom_status,
  bf.bom_version,
  bf.gross_weight,
  bf.net_weight,
  bf.min_weight,
  bf.max_weight,
  bf.stone_cts,
  bf.stone_gms,
  bf.updated_at   AS bom_updated_at
FROM fg_item_variant iv
JOIN fg_item_master im ON iv.item_id = im.id
LEFT JOIN LATERAL (
  SELECT id, bom_status, bom_version, gross_weight, net_weight,
         min_weight, max_weight, stone_cts, stone_gms, updated_at
  FROM   bom_fg
  WHERE  variant_id = iv.id AND is_active = TRUE
  ORDER  BY created_at DESC LIMIT 1
) bf ON TRUE$q$
WHERE key_code = 'fg_bom_list_select';

-- ── 2. fg_bom_list_count ─────────────────────────────────────
UPDATE project_config SET key_value = $q$SELECT COUNT(*) AS total
FROM fg_item_variant iv
JOIN fg_item_master im ON iv.item_id = im.id
LEFT JOIN LATERAL (
  SELECT id, bom_status
  FROM   bom_fg
  WHERE  variant_id = iv.id AND is_active = TRUE
  ORDER  BY created_at DESC LIMIT 1
) bf ON TRUE$q$
WHERE key_code = 'fg_bom_list_count';

-- ── 3. fg_bom_stats ──────────────────────────────────────────
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
WHERE iv.is_active = TRUE$q$
WHERE key_code = 'fg_bom_stats';

COMMIT;
