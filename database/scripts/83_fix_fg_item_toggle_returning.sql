-- ============================================================
-- 83_fix_fg_item_toggle_returning.sql
-- Migration 59 re-introduced `item_code` in the RETURNING
-- clause of fg_item_toggle, but that column was dropped in
-- migration 30. Fix by returning `design_code` instead.
-- Run after 82_fg_bom_sku_type_filter.sql
-- ============================================================

BEGIN;

UPDATE project_config SET key_value =
'UPDATE fg_item_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN :reason ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN CURRENT_TIMESTAMP ELSE NULL END,
    updated_at          = CURRENT_TIMESTAMP
WHERE id = :id
RETURNING id, design_code, is_active'
WHERE key_code = 'fg_item_toggle';

COMMIT;
