-- ============================================================
-- 17_deactivate_orphan_menus.sql
-- Deactivate all menus whose parent_id points to a menu that
-- no longer exists (orphans left after Others menu was deleted
-- by script 13). These are the OTH_PARTY, OTH_PRODUCT, etc.
-- menus (ids 121-140) that should not appear in the system.
-- Safe to re-run.
-- ============================================================

BEGIN;

-- Deactivate orphan menus (parent_id set but parent doesn't exist)
UPDATE menu_master
SET is_active = FALSE
WHERE parent_id IS NOT NULL
  AND parent_id NOT IN (SELECT id FROM menu_master);

-- Also clean up their role_menu_mapping entries
DELETE FROM role_menu_mapping
WHERE menu_id IN (
  SELECT id FROM menu_master
  WHERE is_active = FALSE
    AND parent_id IS NOT NULL
    AND parent_id NOT IN (SELECT id FROM menu_master)
);

COMMIT;

-- Show which menus were deactivated
SELECT id, menu_code, menu_name, parent_id, is_active
FROM menu_master
WHERE is_active = FALSE
ORDER BY id;
