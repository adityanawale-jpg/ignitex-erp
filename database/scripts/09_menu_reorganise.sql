-- ============================================================
-- 09_menu_reorganise.sql
-- Move Menu Master and Permission Master from "Others" (id=11)
-- to "System Admin" (id=10) and reorder them after User-Role Assignment.
-- Safe to re-run (UPDATE is idempotent).
-- ============================================================

BEGIN;

-- Move Menu Master → System Admin, order=4, rename display name
UPDATE menu_master
SET parent_id  = 10,
    menu_order = 4,
    menu_name  = 'Menu Configuration'
WHERE menu_code = 'OTH_MENU_MSTR';

-- Move Permission Master → System Admin, order=5, rename display name
UPDATE menu_master
SET parent_id  = 10,
    menu_order = 5,
    menu_name  = 'User Permission Management'
WHERE menu_code = 'OTH_PERM_MSTR';

COMMIT;
