-- ============================================================
-- 14_clean_user_data.sql
-- Remove all users, role assignments, and related data
-- EXCEPT records belonging to EMP001 through EMP005.
--
-- Tables affected:
--   user_master        → delete non-EMP001-005 rows
--   user_role          → cascades automatically (ON DELETE CASCADE)
--   login_history      → delete for removed users
--   notification_master→ delete for removed users
--   sales_order        → null out created_by for removed users
--   purchase_order     → null out created_by for removed users
--   user_master        → null self-refs (manager_id, created_by, updated_by)
-- ============================================================

BEGIN;

-- ── Step 1: Null out self-referencing FKs in user_master ─────
-- Any row (kept or deleted) whose manager_id / created_by / updated_by
-- points to a user that will be deleted must be cleared first.

UPDATE user_master
SET manager_id = NULL
WHERE manager_id IN (
  SELECT user_id FROM user_master
  WHERE employee_id NOT IN ('EMP001','EMP002','EMP003','EMP004','EMP005')
);

UPDATE user_master
SET created_by = NULL
WHERE created_by IN (
  SELECT user_id FROM user_master
  WHERE employee_id NOT IN ('EMP001','EMP002','EMP003','EMP004','EMP005')
);

UPDATE user_master
SET updated_by = NULL
WHERE updated_by IN (
  SELECT user_id FROM user_master
  WHERE employee_id NOT IN ('EMP001','EMP002','EMP003','EMP004','EMP005')
);

-- ── Step 2: Null out created_by in transactional tables ──────
UPDATE sales_order
SET created_by = NULL
WHERE created_by IN (
  SELECT user_id FROM user_master
  WHERE employee_id NOT IN ('EMP001','EMP002','EMP003','EMP004','EMP005')
);

UPDATE purchase_order
SET created_by = NULL
WHERE created_by IN (
  SELECT user_id FROM user_master
  WHERE employee_id NOT IN ('EMP001','EMP002','EMP003','EMP004','EMP005')
);

-- ── Step 3: Delete login history for removed users ────────────
DELETE FROM login_history
WHERE user_id IN (
  SELECT user_id FROM user_master
  WHERE employee_id NOT IN ('EMP001','EMP002','EMP003','EMP004','EMP005')
);

-- ── Step 4: Delete notifications for removed users ────────────
DELETE FROM notification_master
WHERE user_id IN (
  SELECT user_id FROM user_master
  WHERE employee_id NOT IN ('EMP001','EMP002','EMP003','EMP004','EMP005')
);

-- ── Step 5: Delete user_role entries for removed users ────────
-- (Also cascades from user_master delete, but explicit is safer)
DELETE FROM user_role
WHERE user_id IN (
  SELECT user_id FROM user_master
  WHERE employee_id NOT IN ('EMP001','EMP002','EMP003','EMP004','EMP005')
);

-- ── Step 6: Delete the users themselves ──────────────────────
DELETE FROM user_master
WHERE employee_id NOT IN ('EMP001','EMP002','EMP003','EMP004','EMP005');

-- ── Step 7: Verify what remains ───────────────────────────────
SELECT employee_id, first_name, last_name, emp_email, user_status
FROM user_master
ORDER BY employee_id;

COMMIT;
