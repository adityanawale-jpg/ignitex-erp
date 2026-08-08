-- ============================================================
-- 13_remove_others_menu.sql
-- Remove the "Others" parent menu and all remaining OTH_ child
-- items still under it (parent_id = 11, ids 121–140).
-- Items 141/142/143 were already moved to System Admin in 09/10.
-- ============================================================

BEGIN;

-- ── Remove role-menu mappings for all OTH_ children (parent_id=11) ──
DELETE FROM role_menu_mapping
WHERE menu_id IN (
  SELECT id FROM menu_master WHERE parent_id = 11
);

-- ── Remove all OTH_ children still under Others ──────────────────────
DELETE FROM menu_master WHERE parent_id = 11;

-- ── Remove role-menu mappings for the Others parent itself ────────────
DELETE FROM role_menu_mapping WHERE menu_id = 11;

-- ── Remove the Others parent menu ────────────────────────────────────
DELETE FROM menu_master WHERE id = 11;

COMMIT;
