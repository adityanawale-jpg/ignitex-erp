-- ============================================================
-- 61_restore_audit_log.sql
-- Restore audit_log table that was incorrectly dropped in script 60.
-- audit_log is actively used: written on every action (audit.ts)
-- and read by the /settings/audit-logs frontend page.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS audit_log (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES user_master(user_id) ON DELETE SET NULL,
    employee_id VARCHAR(50),
    full_name   VARCHAR(200),
    action      VARCHAR(50)  NOT NULL,
    module      VARCHAR(100) NOT NULL,
    record_id   VARCHAR(100),
    description TEXT,
    old_values  JSONB,
    new_values  JSONB,
    ip_address  VARCHAR(50),
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
