-- ============================================================
-- 93_fg_bom_lov_findings_from_bom.sql
-- Change FG BOM Finding LOV source from Finding Master
-- (fin_item_variant) to Finding BOM (bom_fin, ACTIVE only).
--
-- On selection the FG BOM line now auto-fills:
--   gross_weight, net_weight, stone_cts  from the active Finding BOM
-- UOM 1 remains GM.
-- ============================================================

BEGIN;

INSERT INTO project_config (key_code, config_type, description, key_value)
VALUES (
  'fg_bom_lov_findings',
  'query',
  'LOV: Finding BOM (ACTIVE) search by SKU code or product name',
  'SELECT iv.id,
       iv.sku_code AS code,
       CONCAT_WS('' — '', iv.sku_code,
         COALESCE(im.product_name, im.collection_name)) AS name,
       bf.gross_weight,
       bf.net_weight,
       bf.stone_cts
FROM   bom_fin bf
JOIN   fin_item_variant iv ON iv.id = bf.variant_id
JOIN   fin_item_master  im ON im.id = iv.item_id
WHERE  bf.bom_status  = ''ACTIVE''
  AND  bf.is_active   = TRUE
  AND  iv.is_active   = TRUE
  AND  im.is_active   = TRUE
  AND (iv.sku_code                        ILIKE $1
    OR COALESCE(im.product_name,    '''') ILIKE $1
    OR COALESCE(im.collection_name, '''') ILIKE $1)
ORDER  BY iv.sku_code LIMIT 60'
)
ON CONFLICT (key_code) DO UPDATE SET
  key_value   = EXCLUDED.key_value,
  description = EXCLUDED.description,
  updated_at  = CURRENT_TIMESTAMP;

COMMIT;
