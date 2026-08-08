-- ============================================================
-- 95_operation_master_rebuild.sql
-- Drop & rebuild operation_master with new schema:
--   auto-generated operation_code (OP0001 sequence)
--   dept_id, machine_id (mandatory FKs)
--   std_time, yield_percentage, process_by (new fields)
-- Seed PROCESS_BY lookup into master_lookup
-- Update project_config queries for new schema
-- ============================================================

BEGIN;

-- ── 1. Drop old operation_master & sequence ──────────────────
DROP TABLE IF EXISTS operation_master CASCADE;
DROP SEQUENCE IF EXISTS operation_code_seq;

-- ── 2. Create sequence for auto operation_code ───────────────
CREATE SEQUENCE operation_code_seq START 1 INCREMENT 1;

-- ── 3. Create new operation_master ───────────────────────────
CREATE TABLE operation_master (
  id                  SERIAL         PRIMARY KEY,
  operation_code      VARCHAR(50)    NOT NULL UNIQUE,
  operation_name      VARCHAR(200)   NOT NULL,
  dept_id             INT            NOT NULL,
  machine_id          INT            NOT NULL,
  std_time            NUMERIC(8,2)   NOT NULL,
  yield_percentage    NUMERIC(5,2),
  process_by          VARCHAR(100),
  deactivation_reason VARCHAR(500),
  deactivated_at      TIMESTAMP,
  is_active           BOOLEAN        NOT NULL DEFAULT TRUE,
  created_by          INT,
  updated_by          INT,
  created_at          TIMESTAMP      NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_op_code    ON operation_master(operation_code);
CREATE INDEX idx_op_dept    ON operation_master(dept_id);
CREATE INDEX idx_op_machine ON operation_master(machine_id);
CREATE INDEX idx_op_active  ON operation_master(is_active);

-- ── 4. Seed PROCESS_BY lookup ─────────────────────────────────
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active)
VALUES
  ('PROCESS_BY', 'PB_MACHINE',   'Machine',          1, TRUE),
  ('PROCESS_BY', 'PB_MANUAL',    'Manual (Karigar)',  2, TRUE),
  ('PROCESS_BY', 'PB_SEMI',      'Semi-Automatic',   3, TRUE),
  ('PROCESS_BY', 'PB_AUTO',      'Automated',        4, TRUE),
  ('PROCESS_BY', 'PB_OUTSOURCE', 'Outsource',        5, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO UPDATE
  SET lookup_name=EXCLUDED.lookup_name, display_order=EXCLUDED.display_order, is_active=TRUE;

-- ── 5. Update project_config operation queries ────────────────

-- List SELECT (joins dept + machine)
UPDATE project_config SET key_value =
'SELECT o.id, o.operation_code, o.operation_name,
       o.dept_id, d.dept_name, d.dept_code AS dept_ref_code,
       o.machine_id, m.machine_name, m.machine_code AS machine_ref_code, m.machine_type,
       o.std_time, o.yield_percentage, o.process_by,
       o.deactivation_reason, o.deactivated_at,
       o.is_active, o.created_at, o.updated_at
FROM operation_master o
LEFT JOIN dept_master d    ON d.id = o.dept_id
LEFT JOIN machine_master m ON m.id = o.machine_id'
WHERE key_code = 'operation_list_select';

-- List COUNT (same joins for WHERE clause compatibility)
UPDATE project_config SET key_value =
'SELECT COUNT(*) AS total
FROM operation_master o
LEFT JOIN dept_master d    ON d.id = o.dept_id
LEFT JOIN machine_master m ON m.id = o.machine_id'
WHERE key_code = 'operation_list_count';

-- Stats
UPDATE project_config SET key_value =
'SELECT
  SUM(CASE WHEN is_active = TRUE  THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive
FROM operation_master'
WHERE key_code = 'operation_stats';

-- Create (auto operation_code via sequence)
-- Params: $1 operation_name, $2 dept_id, $3 machine_id,
--         $4 std_time, $5 yield_percentage, $6 process_by, $7 user_id
UPDATE project_config SET key_value =
'INSERT INTO operation_master
  (operation_code, operation_name, dept_id, machine_id,
   std_time, yield_percentage, process_by, created_by, updated_by)
VALUES
  (''OP'' || LPAD(nextval(''operation_code_seq'')::text, 4, ''0''),
   $1, $2, $3, $4, $5, $6, $7, $7)
RETURNING id, operation_code'
WHERE key_code = 'operation_create';

-- Update (code is immutable)
-- Params: $1 operation_name, $2 dept_id, $3 machine_id,
--         $4 std_time, $5 yield_percentage, $6 process_by, $7 user_id, $8 id
UPDATE project_config SET key_value =
'UPDATE operation_master
SET operation_name=$1, dept_id=$2, machine_id=$3,
    std_time=$4, yield_percentage=$5, process_by=$6,
    updated_by=$7, updated_at=NOW()
WHERE id=$8
RETURNING id, operation_code'
WHERE key_code = 'operation_update';

-- Toggle (deactivation with reason/date, activation clears them)
-- Params: $1 id, $2 reason
UPDATE project_config SET key_value =
'UPDATE operation_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, operation_code'
WHERE key_code = 'operation_toggle';

COMMIT;
