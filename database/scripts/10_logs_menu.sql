-- ============================================================
-- 10_logs_menu.sql
-- 1. Move Mail Config from Others → System Admin
-- 2. Create system_error_log and audit_log tables
-- 3. Add Login Logs, Error Logs, Audit Logs menu items
-- ============================================================

BEGIN;

-- ── Move Mail Config to System Admin (order=6) ───────────────
UPDATE menu_master
SET parent_id  = 10,
    menu_order = 6,
    menu_name  = 'Mail Configuration'
WHERE menu_code = 'OTH_MAIL_CONF';

-- ── System Error Log table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_error_log (
  id             SERIAL PRIMARY KEY,
  severity       VARCHAR(20)  NOT NULL DEFAULT 'ERROR',
  error_type     VARCHAR(200),
  message        TEXT         NOT NULL,
  stack_trace    TEXT,
  request_path   VARCHAR(500),
  request_method VARCHAR(10),
  user_id        INT          REFERENCES user_master(user_id) ON DELETE SET NULL,
  employee_id    VARCHAR(50),
  ip_address     VARCHAR(50),
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_error_log_created ON system_error_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_severity ON system_error_log(severity);

-- ── Audit Log table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          SERIAL PRIMARY KEY,
  user_id     INT          REFERENCES user_master(user_id) ON DELETE SET NULL,
  employee_id VARCHAR(50),
  full_name   VARCHAR(200),
  action      VARCHAR(50)  NOT NULL,
  module      VARCHAR(100) NOT NULL,
  record_id   VARCHAR(100),
  description TEXT,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  VARCHAR(50),
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created    ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user       ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_module     ON audit_log(module);
CREATE INDEX IF NOT EXISTS idx_audit_log_action     ON audit_log(action);

-- ── New System Admin menu items ───────────────────────────────
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active)
VALUES
  (114, 10, 'SA_LOGIN_LOGS', 'User Login Logs',  '/settings/login-logs',  'ClipboardList',  7, 2, TRUE),
  (115, 10, 'SA_ERROR_LOGS', 'Error Logs',        '/settings/error-logs',  'AlertTriangle',  8, 2, TRUE),
  (116, 10, 'SA_AUDIT_LOGS', 'Audit Logs',        '/settings/audit-logs',  'ClipboardCheck', 9, 2, TRUE)
ON CONFLICT (id) DO UPDATE
  SET parent_id  = EXCLUDED.parent_id,
      menu_code  = EXCLUDED.menu_code,
      menu_name  = EXCLUDED.menu_name,
      menu_url   = EXCLUDED.menu_url,
      menu_order = EXCLUDED.menu_order,
      menu_level = EXCLUDED.menu_level,
      is_active  = EXCLUDED.is_active;

COMMIT;
