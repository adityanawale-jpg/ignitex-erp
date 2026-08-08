-- ============================================================
-- 78_fg_bom_lov_findings.sql
-- Add fg_bom_lov_findings project_config query so the FG BOM
-- line editor fetches items from Finding Master (fin_item_variant
-- joined with fin_item_master) filtered to sku_type = 'FIN'.
-- Previously FINDING lines used fg_bom_lov_variants which pointed
-- at fg_item_variant (FG Master) — incorrect source.
-- Run after 77_stone_item_std_cts.sql
-- ============================================================

BEGIN;

INSERT INTO project_config (key_code, config_type, description, key_value)
VALUES (
  'fg_bom_lov_findings',
  'query',
  'LOV: Finding Master variant search (sku_type=FIN) by sku_code or product name',
  'SELECT iv.id,
       iv.sku_code AS code,
       CONCAT_WS('' — '', iv.sku_code,
         COALESCE(im.product_name, im.collection_name, im.manufacturing_name)) AS name,
       iv.karat_color, iv.weight_band, im.collection_name
FROM   fin_item_variant iv
JOIN   fin_item_master  im ON iv.item_id = im.id
WHERE  iv.is_active = TRUE
  AND  im.is_active = TRUE
  AND  iv.sku_type  = ''FIN''
  AND (iv.sku_code             ILIKE $1
    OR COALESCE(im.product_name,       '''') ILIKE $1
    OR COALESCE(im.manufacturing_name, '''') ILIKE $1)
ORDER  BY iv.sku_code LIMIT 60'
)
ON CONFLICT (key_code) DO UPDATE SET
  key_value   = EXCLUDED.key_value,
  description = EXCLUDED.description,
  updated_at  = CURRENT_TIMESTAMP;

COMMIT;
