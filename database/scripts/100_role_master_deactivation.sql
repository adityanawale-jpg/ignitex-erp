-- ============================================================
-- 100_role_master_deactivation.sql
-- Adds deactivation_reason + deactivated_at to role_master
-- Updates project_config queries:
--   role_master_update   — removes is_active from SET clause
--   role_master_list_get — adds new columns to SELECT
--   role_master_deactivate — new: deactivate with reason + date
--   role_master_activate   — new: activate, clears reason/date
-- ============================================================

BEGIN;

-- ── 1. Add columns to role_master ────────────────────────────
ALTER TABLE role_master
  ADD COLUMN IF NOT EXISTS deactivation_reason VARCHAR(500),
  ADD COLUMN IF NOT EXISTS deactivated_at      TIMESTAMP;

-- ── 2. Update list query to include new columns ───────────────
UPDATE project_config SET key_value =
'SELECT id, role_code, role_name, description, is_active,
       deactivation_reason, deactivated_at, created_at, updated_at
FROM role_master ORDER BY id'
WHERE key_code = 'role_master_list_get';

-- ── 3. Update edit query — remove is_active from SET ─────────
UPDATE project_config SET key_value =
'UPDATE role_master SET role_name=:role_name, description=:description,
       updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *'
WHERE key_code = 'role_master_update';

-- ── 4. Deactivate query (with reason + timestamp) ─────────────
INSERT INTO project_config (key_code, config_type, description, key_value)
VALUES (
  'role_master_deactivate',
  'query',
  'Deactivate role with reason and timestamp',
  'UPDATE role_master SET is_active=FALSE, deactivation_reason=:reason,
       deactivated_at=NOW(), updated_at=NOW() WHERE id=:id RETURNING id, is_active'
)
ON CONFLICT (key_code) DO UPDATE SET key_value = EXCLUDED.key_value;

-- ── 5. Activate query (clears deactivation fields) ───────────
INSERT INTO project_config (key_code, config_type, description, key_value)
VALUES (
  'role_master_activate',
  'query',
  'Activate role and clear deactivation info',
  'UPDATE role_master SET is_active=TRUE, deactivation_reason=NULL,
       deactivated_at=NULL, updated_at=NOW() WHERE id=:id RETURNING id, is_active'
)
ON CONFLICT (key_code) DO UPDATE SET key_value = EXCLUDED.key_value;

COMMIT;
