-- ============================================================
-- 94_machine_master_rebuild.sql
-- Drop & rebuild machine_master with new schema:
--   machine_type, make_brand, capacity_speed, machine_remarks
--   auto-generated machine_code (MC0001 sequence)
-- Seed MACHINE_TYPE, MAKE_BRAND, CAPACITY_SPEED into master_lookup
-- Update project_config queries for new schema
-- ============================================================

BEGIN;

-- ── 1. Drop old machine_master & sequence ────────────────────
DROP TABLE IF EXISTS machine_master CASCADE;
DROP SEQUENCE IF EXISTS machine_code_seq;

-- ── 2. Create sequence for auto machine_code ─────────────────
CREATE SEQUENCE machine_code_seq START 1 INCREMENT 1;

-- ── 3. Create new machine_master ──────────────────────────────
CREATE TABLE machine_master (
  id                  SERIAL        PRIMARY KEY,
  machine_code        VARCHAR(50)   NOT NULL UNIQUE,
  machine_name        VARCHAR(200)  NOT NULL,
  machine_type        VARCHAR(100)  NOT NULL,
  dept_id             INT           NOT NULL,
  make_brand          VARCHAR(100)  NOT NULL,
  capacity_speed      VARCHAR(100)  NOT NULL,
  machine_remarks     VARCHAR(500),
  deactivation_reason VARCHAR(500),
  deactivated_at      TIMESTAMP,
  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
  created_by          INT,
  updated_by          INT,
  created_at          TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_machine_code   ON machine_master(machine_code);
CREATE INDEX idx_machine_type   ON machine_master(machine_type);
CREATE INDEX idx_machine_dept   ON machine_master(dept_id);
CREATE INDEX idx_machine_active ON machine_master(is_active);

-- ── 4. Seed MACHINE_TYPE lookup ───────────────────────────────
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active)
VALUES
  ('MACHINE_TYPE', 'MT_LASER',     'Laser Machine',      1,  TRUE),
  ('MACHINE_TYPE', 'MT_CNC',       'CNC Machine',        2,  TRUE),
  ('MACHINE_TYPE', 'MT_EF',        'EF Machine',         3,  TRUE),
  ('MACHINE_TYPE', 'MT_CASTING',   'Casting Machine',    4,  TRUE),
  ('MACHINE_TYPE', 'MT_INVEST',    'Investment Machine', 5,  TRUE),
  ('MACHINE_TYPE', 'MT_POLISH',    'Polishing',          6,  TRUE),
  ('MACHINE_TYPE', 'MT_PLATING',   'Plating Tank',       7,  TRUE),
  ('MACHINE_TYPE', 'MT_ENAMEL',    'Enamel Machine',     8,  TRUE),
  ('MACHINE_TYPE', 'MT_LASER_ENG', 'Laser Engraver',     9,  TRUE),
  ('MACHINE_TYPE', 'MT_STAMP',     'Stamping Press',     10, TRUE),
  ('MACHINE_TYPE', 'MT_ROLLING',   'Rolling Mill',       11, TRUE),
  ('MACHINE_TYPE', 'MT_WIRE',      'Wire Drawing',       12, TRUE),
  ('MACHINE_TYPE', 'MT_CHAIN',     'Chain Machine',      13, TRUE),
  ('MACHINE_TYPE', 'MT_WEIGH',     'Weighing Scale',     14, TRUE),
  ('MACHINE_TYPE', 'MT_LABEL',     'Label Printer',      15, TRUE),
  ('MACHINE_TYPE', 'MT_HUID',      'HUID Machine',       16, TRUE),
  ('MACHINE_TYPE', 'MT_ASSAY',     'Assay Machine',      17, TRUE),
  ('MACHINE_TYPE', 'MT_3D',        '3D Printer',         18, TRUE),
  ('MACHINE_TYPE', 'MT_CLEAN',     'Cleaning Machine',   19, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO UPDATE
  SET lookup_name=EXCLUDED.lookup_name, display_order=EXCLUDED.display_order, is_active=TRUE;

-- ── 5. Seed MAKE_BRAND lookup ─────────────────────────────────
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active)
VALUES
  ('MAKE_BRAND', 'MB_TANAKA',     'Tanaka / Italian',      1,  TRUE),
  ('MAKE_BRAND', 'MB_LOCAL_IMP',  'Local/Import',          2,  TRUE),
  ('MAKE_BRAND', 'MB_TAIWAN',     'Taiwan Import',         3,  TRUE),
  ('MAKE_BRAND', 'MB_CUSTOM',     'Custom/In-house',       4,  TRUE),
  ('MAKE_BRAND', 'MB_NEUTEC',     'Neutec/Indutherm',      5,  TRUE),
  ('MAKE_BRAND', 'MB_LOCAL',      'Local',                 6,  TRUE),
  ('MAKE_BRAND', 'MB_IMPORT',     'Import',                7,  TRUE),
  ('MAKE_BRAND', 'MB_TROTEC',     'Trotec / Epilog',       8,  TRUE),
  ('MAKE_BRAND', 'MB_SHIMADZU',   'Shimadzu / AND',        9,  TRUE),
  ('MAKE_BRAND', 'MB_ZEBRA',      'Zebra / Honeywell',     10, TRUE),
  ('MAKE_BRAND', 'MB_BIS',        'BIS Approved',          11, TRUE),
  ('MAKE_BRAND', 'MB_OLYMPUS',    'Olympus/Niton',         12, TRUE),
  ('MAKE_BRAND', 'MB_SOLIDSCAPE', 'Solidscape / 3DSystems',13, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO UPDATE
  SET lookup_name=EXCLUDED.lookup_name, display_order=EXCLUDED.display_order, is_active=TRUE;

-- ── 6. Seed CAPACITY_SPEED lookup ────────────────────────────
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active)
VALUES
  ('CAPACITY_SPEED', 'CS_60100',  '60-100 gm/hr',       1,  TRUE),
  ('CAPACITY_SPEED', 'CS_80120',  '80-120 gm/hr',       2,  TRUE),
  ('CAPACITY_SPEED', 'CS_VAR',    'Variable',            3,  TRUE),
  ('CAPACITY_SPEED', 'CS_50PB',   '50 pcs/batch',       4,  TRUE),
  ('CAPACITY_SPEED', 'CS_200G',   '200g gold/cycle',    5,  TRUE),
  ('CAPACITY_SPEED', 'CS_150G',   '150g/cycle',         6,  TRUE),
  ('CAPACITY_SPEED', 'CS_2KG',    '2kg invest/batch',   7,  TRUE),
  ('CAPACITY_SPEED', 'CS_100PH',  '100 pcs/hr',         8,  TRUE),
  ('CAPACITY_SPEED', 'CS_200PH',  '200 pcs/hr',         9,  TRUE),
  ('CAPACITY_SPEED', 'CS_200PB',  '200 pcs/batch',      10, TRUE),
  ('CAPACITY_SPEED', 'CS_150PB',  '150 pcs/batch',      11, TRUE),
  ('CAPACITY_SPEED', 'CS_0001G',  '0.001g precision',   12, TRUE),
  ('CAPACITY_SPEED', 'CS_001G',   '0.01g precision',    13, TRUE),
  ('CAPACITY_SPEED', 'CS_60S',    '< 60 sec/test',      14, TRUE),
  ('CAPACITY_SPEED', 'CS_LTANK',  'Large tank',         15, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO UPDATE
  SET lookup_name=EXCLUDED.lookup_name, display_order=EXCLUDED.display_order, is_active=TRUE;

-- ── 7. Update project_config machine queries ──────────────────

-- List SELECT (includes all new fields + dept join)
UPDATE project_config SET key_value =
'SELECT m.id, m.machine_code, m.machine_name, m.machine_type,
       m.dept_id, d.dept_name, d.dept_code AS dept_ref_code,
       m.make_brand, m.capacity_speed, m.machine_remarks,
       m.deactivation_reason, m.deactivated_at,
       m.is_active, m.created_at, m.updated_at
FROM machine_master m
LEFT JOIN dept_master d ON d.id = m.dept_id'
WHERE key_code = 'machine_list_select';

-- List COUNT
UPDATE project_config SET key_value =
'SELECT COUNT(*) AS total FROM machine_master m LEFT JOIN dept_master d ON d.id = m.dept_id'
WHERE key_code = 'machine_list_count';

-- Stats
UPDATE project_config SET key_value =
'SELECT
  SUM(CASE WHEN is_active = TRUE  THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive
FROM machine_master'
WHERE key_code = 'machine_stats';

-- Create (auto machine_code via sequence)
-- Params: $1 machine_name, $2 machine_type, $3 dept_id,
--         $4 make_brand, $5 capacity_speed, $6 machine_remarks, $7 user_id
UPDATE project_config SET key_value =
'INSERT INTO machine_master
  (machine_code, machine_name, machine_type, dept_id,
   make_brand, capacity_speed, machine_remarks, created_by, updated_by)
VALUES
  (''MC'' || LPAD(nextval(''machine_code_seq'')::text, 4, ''0''),
   $1, $2, $3, $4, $5, $6, $7, $7)
RETURNING id, machine_code'
WHERE key_code = 'machine_create';

-- Update (code is immutable)
-- Params: $1 machine_name, $2 machine_type, $3 dept_id,
--         $4 make_brand, $5 capacity_speed, $6 machine_remarks, $7 user_id, $8 id
UPDATE project_config SET key_value =
'UPDATE machine_master
SET machine_name=$1, machine_type=$2, dept_id=$3,
    make_brand=$4, capacity_speed=$5, machine_remarks=$6,
    updated_by=$7, updated_at=NOW()
WHERE id=$8
RETURNING id, machine_code'
WHERE key_code = 'machine_update';

-- Toggle (deactivation with reason/date, activation clears them)
-- Params: $1 id, $2 reason
UPDATE project_config SET key_value =
'UPDATE machine_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, machine_code'
WHERE key_code = 'machine_toggle';

COMMIT;
