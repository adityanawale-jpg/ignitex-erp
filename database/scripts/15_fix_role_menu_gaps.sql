-- ============================================================
-- 15_fix_role_menu_gaps.sql
-- Fill gaps in role_menu_mapping caused by menus added in
-- scripts 09-12 without corresponding permission entries.
-- Safe to re-run (ON CONFLICT DO NOTHING).
-- ============================================================

BEGIN;

-- SYS_ADMIN gets full access to any menu not yet in role_menu_mapping
INSERT INTO role_menu_mapping
  (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export, is_active)
SELECT r.id, m.id, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
FROM menu_master m
CROSS JOIN role_master r
WHERE r.role_code = 'SYS_ADMIN'
  AND m.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM role_menu_mapping rm WHERE rm.role_id = r.id AND rm.menu_id = m.id
  )
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- All other roles: fill missing menus with no access (admin can grant via Permission page)
INSERT INTO role_menu_mapping
  (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export, is_active)
SELECT r.id, m.id, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE
FROM menu_master m
CROSS JOIN role_master r
WHERE r.role_code != 'SYS_ADMIN'
  AND m.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM role_menu_mapping rm WHERE rm.role_id = r.id AND rm.menu_id = m.id
  )
ON CONFLICT (role_id, menu_id) DO NOTHING;

COMMIT;
