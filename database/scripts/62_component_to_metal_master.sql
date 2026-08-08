-- ============================================================
-- 62_component_to_metal_master.sql
-- Rename component_item_master → metal_master
-- Remove comp_type column
-- Rename columns: comp_code→metal_code, comp_metal_type→metal_type,
--   comp_karat_color→karat_color, comp_purity→purity, comp_name→metal_name
-- Update DB trigger and project_config queries
-- Run after 61_restore_audit_log.sql
-- ============================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════
-- 1. RENAME TABLE
-- ══════════════════════════════════════════════════════════════
ALTER TABLE component_item_master RENAME TO metal_master;

-- ══════════════════════════════════════════════════════════════
-- 2. RENAME COLUMNS
-- ══════════════════════════════════════════════════════════════
ALTER TABLE metal_master RENAME COLUMN comp_code        TO metal_code;
ALTER TABLE metal_master RENAME COLUMN comp_metal_type  TO metal_type;
ALTER TABLE metal_master RENAME COLUMN comp_karat_color TO karat_color;
ALTER TABLE metal_master RENAME COLUMN comp_purity      TO purity;
ALTER TABLE metal_master RENAME COLUMN comp_name        TO metal_name;

-- ══════════════════════════════════════════════════════════════
-- 3. DROP REMOVED COLUMN
-- ══════════════════════════════════════════════════════════════
ALTER TABLE metal_master DROP COLUMN IF EXISTS comp_type;

-- ══════════════════════════════════════════════════════════════
-- 4. REBUILD INDEXES
-- ══════════════════════════════════════════════════════════════
DROP INDEX IF EXISTS idx_comp_item_code;
DROP INDEX IF EXISTS idx_comp_item_type;
DROP INDEX IF EXISTS idx_comp_item_active;

CREATE INDEX IF NOT EXISTS idx_metal_master_code   ON metal_master(metal_code);
CREATE INDEX IF NOT EXISTS idx_metal_master_active ON metal_master(is_active);

-- ══════════════════════════════════════════════════════════════
-- 5. REPLACE TRIGGER
-- Format: METAL_TYPE-KARAT_COL-PURITY-METAL_NAME
-- Example: GO-22KT-WG-91.6%-GB
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_metal_gen_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.metal_code := UPPER(CONCAT_WS('-',
        NULLIF(TRIM(NEW.metal_type),  ''),
        NULLIF(TRIM(NEW.karat_color), ''),
        NULLIF(TRIM(NEW.purity),      ''),
        NULLIF(TRIM(NEW.metal_name),  '')
    ));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_component_item_code ON metal_master;

CREATE OR REPLACE TRIGGER trg_metal_code
BEFORE INSERT OR UPDATE ON metal_master
FOR EACH ROW EXECUTE FUNCTION fn_metal_gen_code();

-- ══════════════════════════════════════════════════════════════
-- 6. UPDATE project_config QUERIES
-- ══════════════════════════════════════════════════════════════

UPDATE project_config SET key_value =
'SELECT id, metal_code, metal_type, karat_color, purity, metal_name,
       is_active, created_at, updated_at
FROM   metal_master'
WHERE key_code = 'comp_item_list_select';

UPDATE project_config SET key_value =
'SELECT COUNT(*) AS total FROM metal_master'
WHERE key_code = 'comp_item_list_count';

UPDATE project_config SET key_value =
'SELECT
  SUM(CASE WHEN is_active = TRUE  THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive
FROM metal_master'
WHERE key_code = 'comp_item_stats';

UPDATE project_config SET key_value =
'INSERT INTO metal_master
  (metal_type, karat_color, purity, metal_name,
   is_active, created_by, created_at, updated_at)
VALUES ($1,$2,$3,$4,TRUE,$5,NOW(),NOW())
RETURNING id, metal_code'
WHERE key_code = 'comp_item_create';

UPDATE project_config SET key_value =
'UPDATE metal_master
SET metal_type  = $1,
    karat_color = $2,
    purity      = $3,
    metal_name  = $4,
    updated_by  = $5,
    updated_at  = NOW()
WHERE id = $6
RETURNING id, metal_code'
WHERE key_code = 'comp_item_update';

UPDATE project_config SET key_value =
'UPDATE metal_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, metal_code'
WHERE key_code = 'comp_item_toggle';

COMMIT;
