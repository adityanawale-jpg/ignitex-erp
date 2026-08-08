-- ============================================================
-- 44_backfill_item_master_sku_type.sql
-- All rows in item_master are Finished Goods.
-- The original SKU_TYPE lookup only had STD/CUSTOM/PROMO (sales
-- categories), so existing rows do not have sku_type = 'FG'.
-- This migration sets every item_master row to sku_type = 'FG'
-- so they appear in the FG BOM grid.
-- Run after 43_fg_bom_tables.sql
-- ============================================================

BEGIN;

UPDATE item_master
SET    sku_type   = 'FG',
       updated_at = CURRENT_TIMESTAMP
WHERE  sku_type IS DISTINCT FROM 'FG';

COMMIT;
