-- ============================================================
-- 88_fg_variant_list_bom_status.sql
-- Extend fg_variant_list_get to include the latest BOM status
-- and BOM id for each variant so the FG Master variant grid
-- can display BOM Status without a separate API call.
-- Run after 87_catalogue_reference_field.sql
-- ============================================================

BEGIN;

UPDATE project_config SET key_value = $q$
SELECT iv.*,
  bf.id           AS bom_id,
  COALESCE(bf.bom_status, 'NO_BOM') AS bom_status
FROM fg_item_variant iv
LEFT JOIN LATERAL (
  SELECT id, bom_status
  FROM   bom_fg
  WHERE  variant_id = iv.id AND is_active = TRUE
  ORDER  BY created_at DESC LIMIT 1
) bf ON TRUE
WHERE iv.item_id = :item_id AND iv.is_active = TRUE
ORDER BY iv.sku_code
$q$
WHERE key_code = 'fg_variant_list_get';

COMMIT;
