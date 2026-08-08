-- ============================================================
-- 57_fg_bom_detail_sfg_weights.sql
-- Add gross_weight, net_weight, stone_cts, stone_gms to bom_fg_detail
-- for Finding BOM (SFG_BOM) lines — auto-populated from referenced BOM
-- ============================================================

BEGIN;

ALTER TABLE bom_fg_detail
  ADD COLUMN IF NOT EXISTS gross_weight NUMERIC(12,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_weight   NUMERIC(12,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stone_cts    NUMERIC(12,6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stone_gms    NUMERIC(12,6) DEFAULT 0;

-- Update the detail insert query to include 4 new columns ($14–$17)
-- Parameter order: bom_id, bom_type, seq_no, item_id, item_code, item_name,
--   item_quantity, uom1_code, item_weight, uom2_code, purity_code, pure_weight,
--   weight_gms, gross_weight, net_weight, stone_cts, stone_gms, remarks, created_by
UPDATE project_config SET key_value =
  'INSERT INTO bom_fg_detail
    (bom_id, bom_type, seq_no, item_id, item_code, item_name,
     item_quantity, uom1_code, item_weight, uom2_code,
     purity_code, pure_weight, weight_gms,
     gross_weight, net_weight, stone_cts, stone_gms,
     remarks, created_by)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)'
WHERE key_code = 'fg_bom_detail_insert';

COMMIT;
