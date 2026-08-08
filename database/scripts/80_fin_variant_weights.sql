-- ============================================================
-- 80_fin_variant_weights.sql
-- Add gross_weight and net_weight to fin_item_variant so that
-- FG BOM lines (Item Type = FINDING) can auto-fill weights
-- from the Finding Master instead of from bom_fg.
-- Run after 79_fg_bom_lov_stones_std_cts.sql
-- ============================================================

BEGIN;

ALTER TABLE fin_item_variant
  ADD COLUMN IF NOT EXISTS gross_weight NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS net_weight   NUMERIC(12,4);

COMMIT;
