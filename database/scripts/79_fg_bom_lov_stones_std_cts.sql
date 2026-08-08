-- ============================================================
-- 79_fg_bom_lov_stones_std_cts.sql
-- Add std_cts to fg_bom_lov_stones so the BOM line editor
-- can auto-populate Stone Cts from the stone master on selection.
-- Run after 78_fg_bom_lov_findings.sql
-- ============================================================

BEGIN;

UPDATE project_config SET
  key_value =
'SELECT id,
       stn_code AS code,
       TRIM(CONCAT_WS('' '', stn_type, stn_shape,
         COALESCE(stn_quality,''''), COALESCE(stn_size,''''))) AS name,
       stn_type, stn_shape, stn_quality, stn_color, stn_size, std_cts
FROM   stone_item_master
WHERE  is_active = TRUE AND stn_code ILIKE $1
ORDER  BY stn_code LIMIT 60',
  description = 'LOV: stone item search — includes std_cts for BOM auto-fill'
WHERE key_code = 'fg_bom_lov_stones';

COMMIT;
