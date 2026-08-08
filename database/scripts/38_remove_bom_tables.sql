-- ============================================================
-- 38_remove_bom_tables.sql
-- Remove item_metal_bom and item_stone_bom tables and their
-- related project_config query entries.
-- Run after 37_remove_customer_bank_detail.sql
-- ============================================================

BEGIN;

-- Drop BOM tables (CASCADE handles FK constraints)
DROP TABLE IF EXISTS item_stone_bom CASCADE;
DROP TABLE IF EXISTS item_metal_bom CASCADE;

-- Remove dynamic API query entries
DELETE FROM project_config
WHERE key_code IN (
  'fg_metal_bom_get',
  'fg_metal_bom_delete_all',
  'fg_metal_bom_create',
  'fg_stone_bom_get',
  'fg_stone_bom_delete_all',
  'fg_stone_bom_create'
);

COMMIT;
