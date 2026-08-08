-- ============================================================
-- 07_user_role_seed.sql
-- Seed default role assignments for built-in users.
-- Run AFTER 06_role_restructure.sql.
-- Safe to re-run (ON CONFLICT DO UPDATE).
-- ============================================================

BEGIN;

-- Role IDs after 06_role_restructure.sql:
--   1 = SYS_ADMIN (System Administrator)
--   2 = PROCESS_ADMIN
--   3 = MANAGER
--   4 = SUPERVISOR
--   5 = OPERATOR
--   6 = VIEWER

-- EMP001 → System Administrator (full access)
INSERT INTO user_role (user_id, role_id, is_default)
SELECT u.user_id, 1, TRUE
FROM user_master u
WHERE u.employee_id = 'EMP001'
ON CONFLICT (user_id, role_id) DO UPDATE SET is_default = TRUE;

-- EMP002 → Manager
INSERT INTO user_role (user_id, role_id, is_default)
SELECT u.user_id, 3, TRUE
FROM user_master u
WHERE u.employee_id = 'EMP002'
ON CONFLICT (user_id, role_id) DO UPDATE SET is_default = TRUE;

-- EMP003 → Operator
INSERT INTO user_role (user_id, role_id, is_default)
SELECT u.user_id, 5, TRUE
FROM user_master u
WHERE u.employee_id = 'EMP003'
ON CONFLICT (user_id, role_id) DO UPDATE SET is_default = TRUE;

COMMIT;
