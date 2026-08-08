-- ============================================================
-- FIXES_MIGRATION.sql
-- Consolidated migration for all role/menu/permission fixes.
-- Run this on the live database in one shot.
-- Safe to re-run — all statements use ON CONFLICT or WHERE checks.
-- ============================================================


-- ============================================================
-- STEP 1 — Deactivate orphan menus
-- Menus whose parent_id points to a deleted menu (e.g. the old
-- "Others" parent id=11 removed by script 13). These show as
-- unwanted rows in User Permission Management.
-- ============================================================

BEGIN;

UPDATE menu_master
SET is_active = FALSE
WHERE parent_id IS NOT NULL
  AND parent_id NOT IN (SELECT id FROM menu_master);

-- Remove their role_menu_mapping entries
DELETE FROM role_menu_mapping
WHERE menu_id IN (
  SELECT id FROM menu_master
  WHERE is_active = FALSE
    AND parent_id IS NOT NULL
    AND parent_id NOT IN (SELECT id FROM menu_master)
);

COMMIT;


-- ============================================================
-- STEP 2 — Fix permission_menus_by_role_get query
-- Ensures User Permission Management shows ONLY active menus
-- whose parent is also active — matches Menu Master active list.
-- ============================================================

UPDATE project_config
SET key_value =
  'SELECT
     m.id          AS menu_id,
     m.menu_code,
     m.menu_name,
     m.parent_id,
     m.menu_level,
     m.menu_order,
     pm.menu_name  AS parent_name,
     COALESCE(rm.can_view,   FALSE) AS can_view,
     COALESCE(rm.can_create, FALSE) AS can_create,
     COALESCE(rm.can_update, FALSE) AS can_update,
     COALESCE(rm.can_delete, FALSE) AS can_delete,
     COALESCE(rm.can_print,  FALSE) AS can_print,
     COALESCE(rm.can_export, FALSE) AS can_export
   FROM menu_master m
   LEFT JOIN role_menu_mapping rm
     ON m.id = rm.menu_id AND rm.role_id = :role_id
   LEFT JOIN menu_master pm
     ON pm.id = m.parent_id AND pm.is_active = TRUE
   WHERE m.is_active = TRUE
     AND (m.parent_id IS NULL OR m.parent_id IN (
       SELECT id FROM menu_master WHERE is_active = TRUE
     ))
   ORDER BY m.menu_level, m.menu_order'
WHERE key_code = 'permission_menus_by_role_get';


-- ============================================================
-- STEP 3 — Give SYS_ADMIN full access to every active menu
-- Fills gaps caused by menus added after the initial seed
-- (scripts 09–12 added menus without role_menu_mapping rows).
-- Uses DO UPDATE so existing rows are also corrected to TRUE.
-- ============================================================

BEGIN;

INSERT INTO role_menu_mapping
  (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export, is_active)
SELECT r.id, m.id, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
FROM menu_master m
CROSS JOIN role_master r
WHERE r.role_code = 'SYS_ADMIN'
  AND m.is_active = TRUE
ON CONFLICT (role_id, menu_id) DO UPDATE SET
  can_view   = TRUE,
  can_create = TRUE,
  can_update = TRUE,
  can_delete = TRUE,
  can_print  = TRUE,
  can_export = TRUE,
  is_active  = TRUE;

COMMIT;


-- ============================================================
-- STEP 4 — Fill role_menu_mapping gaps for all other roles
-- Any active menu not yet mapped to a role gets a default-deny
-- entry so it shows (unchecked) in Permission Management.
-- ============================================================

BEGIN;

INSERT INTO role_menu_mapping
  (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export, is_active)
SELECT r.id, m.id, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE
FROM menu_master m
CROSS JOIN role_master r
WHERE r.role_code != 'SYS_ADMIN'
  AND r.is_active = TRUE
  AND m.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM role_menu_mapping rm
    WHERE rm.role_id = r.id AND rm.menu_id = m.id
  )
ON CONFLICT (role_id, menu_id) DO NOTHING;

COMMIT;


-- ============================================================
-- STEP 5 — Assign all roles to EMP001, SYS_ADMIN as default
-- ============================================================

BEGIN;

INSERT INTO user_role (user_id, role_id, is_default)
SELECT u.user_id, r.id,
       CASE WHEN r.role_code = 'SYS_ADMIN' THEN TRUE ELSE FALSE END
FROM user_master u
CROSS JOIN role_master r
WHERE u.employee_id = 'EMP001'
  AND r.is_active = TRUE
ON CONFLICT (user_id, role_id) DO UPDATE
  SET is_default = EXCLUDED.is_default;

COMMIT;


-- ============================================================
-- STEP 6 — Rate limit config (increase from 100 → 500)
-- ============================================================

-- Note: This is already handled in api/.env (RATE_LIMIT_MAX=500).
-- No DB change needed for this step.


-- ============================================================
-- VERIFICATION — Review results
-- ============================================================

-- Active menus (should match Menu Master active list)
SELECT COUNT(*) AS active_menu_count FROM menu_master WHERE is_active = TRUE;

-- Inactive / orphan menus
SELECT id, menu_code, menu_name, parent_id
FROM menu_master
WHERE is_active = FALSE
ORDER BY id;

-- EMP001 role assignments
SELECT r.role_code, r.role_name, ur.is_default
FROM user_role ur
JOIN role_master r ON r.id = ur.role_id
JOIN user_master u ON u.user_id = ur.user_id
WHERE u.employee_id = 'EMP001'
ORDER BY r.role_code;

-- SYS_ADMIN permission count (should equal active menu count)
SELECT COUNT(*) AS sys_admin_menu_count
FROM role_menu_mapping rm
JOIN role_master r ON r.id = rm.role_id
WHERE r.role_code = 'SYS_ADMIN'
  AND rm.can_view = TRUE;

-- Permission query preview
SELECT key_code, LEFT(key_value, 100) AS query_preview
FROM project_config
WHERE key_code = 'permission_menus_by_role_get';
