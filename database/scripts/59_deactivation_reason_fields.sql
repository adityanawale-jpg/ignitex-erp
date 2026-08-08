-- ============================================================
-- 59_deactivation_reason_fields.sql
-- Add deactivation_reason + deactivated_at to all master tables
-- Update toggle queries in project_config to store reason/date
-- ============================================================

BEGIN;

-- ── 1. Add columns to all master tables ──────────────────────

ALTER TABLE dept_master
  ADD COLUMN IF NOT EXISTS deactivation_reason VARCHAR(500),
  ADD COLUMN IF NOT EXISTS deactivated_at      TIMESTAMP;

ALTER TABLE machine_master
  ADD COLUMN IF NOT EXISTS deactivation_reason VARCHAR(500),
  ADD COLUMN IF NOT EXISTS deactivated_at      TIMESTAMP;

ALTER TABLE operation_master
  ADD COLUMN IF NOT EXISTS deactivation_reason VARCHAR(500),
  ADD COLUMN IF NOT EXISTS deactivated_at      TIMESTAMP;

ALTER TABLE alloy_master
  ADD COLUMN IF NOT EXISTS deactivation_reason VARCHAR(500),
  ADD COLUMN IF NOT EXISTS deactivated_at      TIMESTAMP;

ALTER TABLE stone_item_master
  ADD COLUMN IF NOT EXISTS deactivation_reason VARCHAR(500),
  ADD COLUMN IF NOT EXISTS deactivated_at      TIMESTAMP;

ALTER TABLE component_item_master
  ADD COLUMN IF NOT EXISTS deactivation_reason VARCHAR(500),
  ADD COLUMN IF NOT EXISTS deactivated_at      TIMESTAMP;

ALTER TABLE master_lookup
  ADD COLUMN IF NOT EXISTS deactivation_reason VARCHAR(500),
  ADD COLUMN IF NOT EXISTS deactivated_at      TIMESTAMP;

ALTER TABLE supplier_master
  ADD COLUMN IF NOT EXISTS deactivation_reason VARCHAR(500),
  ADD COLUMN IF NOT EXISTS deactivated_at      TIMESTAMP;

ALTER TABLE customer_master
  ADD COLUMN IF NOT EXISTS deactivation_reason VARCHAR(500),
  ADD COLUMN IF NOT EXISTS deactivated_at      TIMESTAMP;

ALTER TABLE item_master
  ADD COLUMN IF NOT EXISTS deactivation_reason VARCHAR(500),
  ADD COLUMN IF NOT EXISTS deactivated_at      TIMESTAMP;

-- ── 2. Update toggle queries in project_config ────────────────
-- When deactivating (is_active = TRUE → FALSE): store reason + timestamp
-- When activating  (is_active = FALSE → TRUE): clear reason + timestamp

UPDATE project_config SET key_value =
'UPDATE dept_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, dept_code'
WHERE key_code = 'dept_toggle';

UPDATE project_config SET key_value =
'UPDATE machine_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, machine_code'
WHERE key_code = 'machine_toggle';

UPDATE project_config SET key_value =
'UPDATE operation_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, operation_code'
WHERE key_code = 'operation_toggle';

UPDATE project_config SET key_value =
'UPDATE alloy_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, alloy_code'
WHERE key_code = 'alloy_toggle';

UPDATE project_config SET key_value =
'UPDATE stone_item_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, stn_code'
WHERE key_code = 'stone_item_toggle';

UPDATE project_config SET key_value =
'UPDATE component_item_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, comp_code'
WHERE key_code = 'comp_item_toggle';

UPDATE project_config SET key_value =
'UPDATE master_lookup
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, lookup_type, lookup_code'
WHERE key_code = 'lookup_toggle';

UPDATE project_config SET key_value =
'UPDATE supplier_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, vendor_code, vendor_company_name'
WHERE key_code = 'supplier_toggle';

UPDATE project_config SET key_value =
'UPDATE customer_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, customer_code, customer_company_name'
WHERE key_code = 'customer_toggle';

UPDATE project_config SET key_value =
'UPDATE item_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN :reason ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN CURRENT_TIMESTAMP ELSE NULL END,
    updated_at          = CURRENT_TIMESTAMP
WHERE id = :id
RETURNING id, item_code, is_active'
WHERE key_code = 'fg_item_toggle';

-- Also clear the cached query for all affected keys so the server re-reads them
-- (queryConfig.ts caches in memory; a server restart is needed, or re-deploy)

COMMIT;
