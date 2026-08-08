-- ============================================================
-- 16_emp001_full_access.sql
-- Assign all roles to EMP001 and ensure SYS_ADMIN has full
-- access to every active menu (fills gaps from later migrations).
-- Safe to re-run (ON CONFLICT DO NOTHING / DO UPDATE).
-- ============================================================

BEGIN;

-- ── 1. Assign all roles to EMP001 (SYS_ADMIN stays default) ──
INSERT INTO user_role (user_id, role_id, is_default)
SELECT u.user_id, r.id,
       CASE WHEN r.role_code = 'SYS_ADMIN' THEN TRUE ELSE FALSE END
FROM user_master u
CROSS JOIN role_master r
WHERE u.employee_id = 'EMP001'
  AND r.is_active = TRUE
ON CONFLICT (user_id, role_id) DO UPDATE
  SET is_default = EXCLUDED.is_default;

-- ── 2. Give SYS_ADMIN full access to every active menu ───────
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

-- Verify
SELECT r.role_code, r.role_name, ur.is_default
FROM user_role ur
JOIN role_master r ON r.id = ur.role_id
JOIN user_master u ON u.user_id = ur.user_id
WHERE u.employee_id = 'EMP001'
ORDER BY r.role_code;
