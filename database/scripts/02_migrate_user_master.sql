-- ============================================================
-- IGNITEX.AI ERP - User Master Migration Script
-- Version: 2.0.0
-- Run this against an EXISTING database to apply the new
-- user_master structure. Safe to run once.
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Add DEPARTMENT data into master_lookup
-- ============================================================
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order) VALUES
('DEPARTMENT', 'IT',       'Information Technology', 1),
('DEPARTMENT', 'SALES',    'Sales',                  2),
('DEPARTMENT', 'PURCHASE', 'Purchase',               3),
('DEPARTMENT', 'ACCOUNTS', 'Accounts',               4),
('DEPARTMENT', 'ADMIN',    'Administration',         5),
('DEPARTMENT', 'HR',       'Human Resources',        6),
('DEPARTMENT', 'DESIGN',   'Design & Production',    7),
('DEPARTMENT', 'STORE',    'Store Operations',       8)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

-- ============================================================
-- STEP 2: Drop indexes that reference columns being renamed
-- ============================================================
DROP INDEX IF EXISTS idx_user_master_username;
DROP INDEX IF EXISTS idx_user_master_token;

-- ============================================================
-- STEP 3: Drop UNIQUE constraints on columns being renamed
-- ============================================================
ALTER TABLE user_master DROP CONSTRAINT IF EXISTS user_master_user_name_key;
ALTER TABLE user_master DROP CONSTRAINT IF EXISTS user_master_email_key;

-- ============================================================
-- STEP 4: Drop FK constraints in child tables that reference
--         user_master(id) — required before renaming the PK column
-- ============================================================
ALTER TABLE login_history       DROP CONSTRAINT IF EXISTS login_history_user_id_fkey;
ALTER TABLE notification_master DROP CONSTRAINT IF EXISTS notification_master_user_id_fkey;
ALTER TABLE sales_order         DROP CONSTRAINT IF EXISTS sales_order_created_by_fkey;
ALTER TABLE purchase_order      DROP CONSTRAINT IF EXISTS purchase_order_created_by_fkey;

-- Drop the role FK since role_id will be removed
ALTER TABLE user_master DROP CONSTRAINT IF EXISTS user_master_role_id_fkey;

-- ============================================================
-- STEP 5: Rename columns (inplace of)
-- ============================================================
ALTER TABLE user_master RENAME COLUMN id           TO user_id;
ALTER TABLE user_master RENAME COLUMN user_name    TO employee_id;
ALTER TABLE user_master RENAME COLUMN email        TO emp_email;
ALTER TABLE user_master RENAME COLUMN phone        TO mobile_number;
ALTER TABLE user_master RENAME COLUMN is_active    TO user_status;
ALTER TABLE user_master RENAME COLUMN token        TO jwt_token;
ALTER TABLE user_master RENAME COLUMN token_expiry TO jwt_token_update;
ALTER TABLE user_master RENAME COLUMN last_login   TO last_login_at;

-- full_name → first_name + last_name (split on first space)
ALTER TABLE user_master RENAME COLUMN full_name TO first_name;
ALTER TABLE user_master ADD COLUMN IF NOT EXISTS last_name VARCHAR(50);

UPDATE user_master
SET
    last_name  = NULLIF(TRIM(SUBSTRING(first_name FROM POSITION(' ' IN first_name) + 1)), ''),
    first_name = SPLIT_PART(first_name, ' ', 1);

-- ============================================================
-- STEP 6: Alter column types / sizes
-- ============================================================
ALTER TABLE user_master ALTER COLUMN employee_id      TYPE VARCHAR(20);
ALTER TABLE user_master ALTER COLUMN first_name       TYPE VARCHAR(50);
ALTER TABLE user_master ALTER COLUMN emp_email        TYPE VARCHAR(255);
ALTER TABLE user_master ALTER COLUMN jwt_token_update TYPE TIMESTAMPTZ USING jwt_token_update::TIMESTAMPTZ;
ALTER TABLE user_master ALTER COLUMN last_login_at    TYPE TIMESTAMPTZ USING last_login_at::TIMESTAMPTZ;
ALTER TABLE user_master ALTER COLUMN created_at       TYPE TIMESTAMPTZ USING created_at::TIMESTAMPTZ;
ALTER TABLE user_master ALTER COLUMN updated_at       TYPE TIMESTAMPTZ USING updated_at::TIMESTAMPTZ;

-- ============================================================
-- STEP 7: Drop role_id column (not required)
-- ============================================================
ALTER TABLE user_master DROP COLUMN IF EXISTS role_id;

-- ============================================================
-- STEP 8: Add new columns
--         department_id stores lookup_code from master_lookup
--         where lookup_type = 'DEPARTMENT' — no FK needed
-- ============================================================
ALTER TABLE user_master ADD COLUMN IF NOT EXISTS department_id VARCHAR(50);
ALTER TABLE user_master ADD COLUMN IF NOT EXISTS designation   VARCHAR(100);
ALTER TABLE user_master ADD COLUMN IF NOT EXISTS manager_id    INT;
ALTER TABLE user_master ADD COLUMN IF NOT EXISTS start_date    DATE;
ALTER TABLE user_master ADD COLUMN IF NOT EXISTS expiry_date   DATE;
ALTER TABLE user_master ADD COLUMN IF NOT EXISTS timezone      VARCHAR(50) DEFAULT 'Asia/Kolkata';
ALTER TABLE user_master ADD COLUMN IF NOT EXISTS language      VARCHAR(10) DEFAULT 'en';
ALTER TABLE user_master ADD COLUMN IF NOT EXISTS created_by    INT;
ALTER TABLE user_master ADD COLUMN IF NOT EXISTS updated_by    INT;

-- ============================================================
-- STEP 9: Update seed employee IDs for built-in users
-- ============================================================
UPDATE user_master SET employee_id = 'EMP001' WHERE employee_id = 'admin';
UPDATE user_master SET employee_id = 'EMP002' WHERE employee_id = 'manager';
UPDATE user_master SET employee_id = 'EMP003' WHERE employee_id = 'sales01';

-- ============================================================
-- STEP 10: Add UNIQUE constraints on renamed columns
-- ============================================================
ALTER TABLE user_master
    ADD CONSTRAINT user_master_employee_id_key UNIQUE (employee_id);

ALTER TABLE user_master
    ADD CONSTRAINT user_master_emp_email_key UNIQUE (emp_email);

-- ============================================================
-- STEP 11: Add FK constraints on self-referencing columns
-- ============================================================
ALTER TABLE user_master
    ADD CONSTRAINT user_master_manager_id_fkey
        FOREIGN KEY (manager_id) REFERENCES user_master(user_id);

ALTER TABLE user_master
    ADD CONSTRAINT user_master_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES user_master(user_id);

ALTER TABLE user_master
    ADD CONSTRAINT user_master_updated_by_fkey
        FOREIGN KEY (updated_by) REFERENCES user_master(user_id);

-- ============================================================
-- STEP 12: Re-add FK constraints in child tables pointing to
--          user_master(user_id)
-- ============================================================
ALTER TABLE login_history
    ADD CONSTRAINT login_history_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES user_master(user_id);

ALTER TABLE notification_master
    ADD CONSTRAINT notification_master_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES user_master(user_id);

ALTER TABLE sales_order
    ADD CONSTRAINT sales_order_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES user_master(user_id);

ALTER TABLE purchase_order
    ADD CONSTRAINT purchase_order_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES user_master(user_id);

-- ============================================================
-- STEP 13: Update login_history — rename user_name → employee_id
-- ============================================================
ALTER TABLE login_history RENAME COLUMN user_name  TO employee_id;
ALTER TABLE login_history ALTER  COLUMN employee_id TYPE VARCHAR(20);

-- ============================================================
-- STEP 14A: Create user_role table (new)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_role (
    id         SERIAL PRIMARY KEY,
    user_id    INT  REFERENCES user_master(user_id) ON DELETE CASCADE,
    role_id    INT  REFERENCES role_master(id),
    is_default BOOLEAN   DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_role_user ON user_role(user_id);

-- ============================================================
-- STEP 14: Update project_config dynamic queries
-- ============================================================
UPDATE project_config SET
    key_value  = 'SELECT u.user_id, u.employee_id, u.password_hash, u.first_name, u.last_name, u.emp_email, u.mobile_number, u.profile_image, u.user_status FROM user_master u WHERE u.employee_id = :userid AND u.user_status = TRUE',
    updated_at = NOW()
WHERE key_code = 'login_get';

UPDATE project_config SET
    key_value  = 'SELECT u.user_id, u.employee_id, u.first_name, u.last_name, CONCAT(u.first_name, '' '', COALESCE(u.last_name, '''')) AS full_name, u.emp_email, u.mobile_number, u.user_status, u.department_id, u.designation, u.created_at FROM user_master u WHERE u.user_status = TRUE ORDER BY u.first_name, u.last_name',
    updated_at = NOW()
WHERE key_code = 'user_list_get';

UPDATE project_config SET
    key_value  = 'SELECT lh.*, CONCAT(u.first_name, '' '', COALESCE(u.last_name, '''')) AS full_name FROM login_history lh LEFT JOIN user_master u ON lh.user_id = u.user_id ORDER BY lh.login_time DESC LIMIT 50',
    updated_at = NOW()
WHERE key_code = 'login_history_get';

-- ============================================================
-- STEP 15: Recreate indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_master_employeeid ON user_master(employee_id);
CREATE INDEX IF NOT EXISTS idx_user_master_jwt_token  ON user_master(jwt_token);

-- ============================================================
-- STEP 16: Update table comment
-- ============================================================
COMMENT ON TABLE user_master IS 'System users / employees with authentication details';

COMMIT;
