-- ============================================================
-- 74_sku_type_lookup_refactor.sql
-- Remove generic SKU_TYPE lookup and replace with two
-- purpose-specific lookup types:
--   FG_SKU_TYPE  — used by FG Master variant form
--   FIN_SKU_TYPE — used by Findings/SFG variant form
-- Run after 73_fg_bom_unified_grid.sql
-- ============================================================

BEGIN;

-- ── 1. Remove all old SKU_TYPE entries ───────────────────────────
DELETE FROM master_lookup WHERE lookup_type = 'SKU_TYPE';

-- ── 2. FG_SKU_TYPE — for Finished Goods variants ─────────────────
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('FG_SKU_TYPE', 'FG', 'Finished Goods', 1, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

-- ── 3. FIN_SKU_TYPE — for Findings / SFG variants ────────────────
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('FIN_SKU_TYPE', 'FIN', 'Findings', 1, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

COMMIT;
