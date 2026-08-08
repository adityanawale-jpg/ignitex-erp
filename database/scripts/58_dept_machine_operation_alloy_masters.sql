-- ============================================================
-- 58_dept_machine_operation_alloy_masters.sql
-- Department, Machine, Operation, Alloy master tables
-- project_config queries + menu_master entries + permissions
-- ============================================================

BEGIN;

-- ── 1. Department Master ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS dept_master (
  id          SERIAL       PRIMARY KEY,
  dept_code   VARCHAR(50)  NOT NULL UNIQUE,
  dept_name   VARCHAR(200) NOT NULL,
  sub_dept    VARCHAR(200),
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by  INT,
  updated_by  INT,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dept_code   ON dept_master(dept_code);
CREATE INDEX IF NOT EXISTS idx_dept_active ON dept_master(is_active);

-- ── 2. Machine Master ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS machine_master (
  id           SERIAL       PRIMARY KEY,
  machine_code VARCHAR(50)  NOT NULL UNIQUE,
  machine_name VARCHAR(200) NOT NULL,
  dept_id      INT,
  description  VARCHAR(500),
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by   INT,
  updated_by   INT,
  created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_machine_code   ON machine_master(machine_code);
CREATE INDEX IF NOT EXISTS idx_machine_dept   ON machine_master(dept_id);
CREATE INDEX IF NOT EXISTS idx_machine_active ON machine_master(is_active);

-- ── 3. Operation Master ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS operation_master (
  id             SERIAL       PRIMARY KEY,
  operation_code VARCHAR(50)  NOT NULL UNIQUE,
  operation_name VARCHAR(200) NOT NULL,
  dept_id        INT,
  description    VARCHAR(500),
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by     INT,
  updated_by     INT,
  created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operation_code   ON operation_master(operation_code);
CREATE INDEX IF NOT EXISTS idx_operation_dept   ON operation_master(dept_id);
CREATE INDEX IF NOT EXISTS idx_operation_active ON operation_master(is_active);

-- ── 4. Alloy Master ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alloy_master (
  id          SERIAL       PRIMARY KEY,
  alloy_code  VARCHAR(50)  NOT NULL UNIQUE,
  alloy_name  VARCHAR(200) NOT NULL,
  karat       VARCHAR(20),
  purity_pct  NUMERIC(5,2) DEFAULT 0,
  description VARCHAR(500),
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by  INT,
  updated_by  INT,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alloy_code   ON alloy_master(alloy_code);
CREATE INDEX IF NOT EXISTS idx_alloy_active ON alloy_master(is_active);

-- ── project_config: Department Master ────────────────────────
INSERT INTO project_config (key_code, config_type, description, key_value) VALUES

('dept_list_select', 'query', 'Department master list SELECT (controller appends WHERE/ORDER/LIMIT)',
'SELECT id, dept_code, dept_name, sub_dept, is_active, created_at, updated_at
FROM dept_master'),

('dept_list_count', 'query', 'Department master list COUNT (controller appends WHERE)',
'SELECT COUNT(*) AS total FROM dept_master'),

('dept_stats', 'query', 'Department master active/inactive counts',
'SELECT
  SUM(CASE WHEN is_active = TRUE  THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive
FROM dept_master'),

('dept_create', 'query', 'Insert new department — code supplied by user',
'INSERT INTO dept_master (dept_code, dept_name, sub_dept, created_by, updated_by)
VALUES ($1,$2,$3,$4,$4)
RETURNING id, dept_code'),

('dept_update', 'query', 'Update department name / sub_dept (code is immutable)',
'UPDATE dept_master
SET dept_name=$1, sub_dept=$2, updated_by=$3, updated_at=NOW()
WHERE id=$4
RETURNING id, dept_code'),

('dept_toggle', 'query', 'Toggle department active/inactive status',
'UPDATE dept_master
SET is_active=NOT is_active, updated_at=NOW()
WHERE id=$1
RETURNING id, is_active, dept_code');

-- ── project_config: Machine Master ───────────────────────────
INSERT INTO project_config (key_code, config_type, description, key_value) VALUES

('machine_list_select', 'query', 'Machine master list SELECT with dept join (controller appends WHERE/ORDER/LIMIT)',
'SELECT m.id, m.machine_code, m.machine_name, m.dept_id,
       d.dept_name, d.dept_code AS dept_ref_code,
       m.description, m.is_active, m.created_at, m.updated_at
FROM machine_master m
LEFT JOIN dept_master d ON d.id = m.dept_id'),

('machine_list_count', 'query', 'Machine master list COUNT (controller appends WHERE)',
'SELECT COUNT(*) AS total FROM machine_master m LEFT JOIN dept_master d ON d.id=m.dept_id'),

('machine_stats', 'query', 'Machine master active/inactive counts',
'SELECT
  SUM(CASE WHEN is_active = TRUE  THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive
FROM machine_master'),

('machine_create', 'query', 'Insert new machine',
'INSERT INTO machine_master (machine_code, machine_name, dept_id, description, created_by, updated_by)
VALUES ($1,$2,$3,$4,$5,$5)
RETURNING id, machine_code'),

('machine_update', 'query', 'Update machine (code is immutable)',
'UPDATE machine_master
SET machine_name=$1, dept_id=$2, description=$3, updated_by=$4, updated_at=NOW()
WHERE id=$5
RETURNING id, machine_code'),

('machine_toggle', 'query', 'Toggle machine active/inactive status',
'UPDATE machine_master
SET is_active=NOT is_active, updated_at=NOW()
WHERE id=$1
RETURNING id, is_active, machine_code');

-- ── project_config: Operation Master ─────────────────────────
INSERT INTO project_config (key_code, config_type, description, key_value) VALUES

('operation_list_select', 'query', 'Operation master list SELECT with dept join (controller appends WHERE/ORDER/LIMIT)',
'SELECT o.id, o.operation_code, o.operation_name, o.dept_id,
       d.dept_name, d.dept_code AS dept_ref_code,
       o.description, o.is_active, o.created_at, o.updated_at
FROM operation_master o
LEFT JOIN dept_master d ON d.id = o.dept_id'),

('operation_list_count', 'query', 'Operation master list COUNT (controller appends WHERE)',
'SELECT COUNT(*) AS total FROM operation_master o LEFT JOIN dept_master d ON d.id=o.dept_id'),

('operation_stats', 'query', 'Operation master active/inactive counts',
'SELECT
  SUM(CASE WHEN is_active = TRUE  THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive
FROM operation_master'),

('operation_create', 'query', 'Insert new operation',
'INSERT INTO operation_master (operation_code, operation_name, dept_id, description, created_by, updated_by)
VALUES ($1,$2,$3,$4,$5,$5)
RETURNING id, operation_code'),

('operation_update', 'query', 'Update operation (code is immutable)',
'UPDATE operation_master
SET operation_name=$1, dept_id=$2, description=$3, updated_by=$4, updated_at=NOW()
WHERE id=$5
RETURNING id, operation_code'),

('operation_toggle', 'query', 'Toggle operation active/inactive status',
'UPDATE operation_master
SET is_active=NOT is_active, updated_at=NOW()
WHERE id=$1
RETURNING id, is_active, operation_code');

-- ── project_config: Alloy Master ──────────────────────────────
INSERT INTO project_config (key_code, config_type, description, key_value) VALUES

('alloy_list_select', 'query', 'Alloy master list SELECT (controller appends WHERE/ORDER/LIMIT)',
'SELECT id, alloy_code, alloy_name, karat, purity_pct, description, is_active, created_at, updated_at
FROM alloy_master'),

('alloy_list_count', 'query', 'Alloy master list COUNT (controller appends WHERE)',
'SELECT COUNT(*) AS total FROM alloy_master'),

('alloy_stats', 'query', 'Alloy master active/inactive counts',
'SELECT
  SUM(CASE WHEN is_active = TRUE  THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive
FROM alloy_master'),

('alloy_create', 'query', 'Insert new alloy',
'INSERT INTO alloy_master (alloy_code, alloy_name, karat, purity_pct, description, created_by, updated_by)
VALUES ($1,$2,$3,$4,$5,$6,$6)
RETURNING id, alloy_code'),

('alloy_update', 'query', 'Update alloy (code is immutable)',
'UPDATE alloy_master
SET alloy_name=$1, karat=$2, purity_pct=$3, description=$4, updated_by=$5, updated_at=NOW()
WHERE id=$6
RETURNING id, alloy_code'),

('alloy_toggle', 'query', 'Toggle alloy active/inactive status',
'UPDATE alloy_master
SET is_active=NOT is_active, updated_at=NOW()
WHERE id=$1
RETURNING id, is_active, alloy_code');

-- ── Menu entries (parent_id=2 = Masters, menu_level=2) ────────
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active)
VALUES
(38, 2, 'MM_DEPT_MASTER',      'Department Master', '/master-mgmt/departments', 'BuildingOffice2Icon', 16, 2, TRUE),
(39, 2, 'MM_MACHINE_MASTER',   'Machine Master',    '/master-mgmt/machines',    'CogIcon',            17, 2, TRUE),
(40, 2, 'MM_OPERATION_MASTER', 'Operation Master',  '/master-mgmt/operations',  'WrenchScrewdriverIcon', 18, 2, TRUE),
(41, 2, 'MM_ALLOY_MASTER',     'Alloy Master',      '/master-mgmt/alloys',      'BeakerIcon',         19, 2, TRUE)
ON CONFLICT (id) DO UPDATE
  SET menu_name=EXCLUDED.menu_name,
      menu_url=EXCLUDED.menu_url,
      menu_code=EXCLUDED.menu_code,
      menu_order=EXCLUDED.menu_order;

-- ── Role-menu permissions: mirror from FG BOM (id=27) ─────────
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT role_id, 38, can_view, can_create, can_update, can_delete
FROM role_menu_mapping WHERE menu_id = 27
ON CONFLICT (role_id, menu_id) DO UPDATE SET can_view=TRUE, can_create=TRUE, can_update=TRUE, can_delete=TRUE;

INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT role_id, 39, can_view, can_create, can_update, can_delete
FROM role_menu_mapping WHERE menu_id = 27
ON CONFLICT (role_id, menu_id) DO UPDATE SET can_view=TRUE, can_create=TRUE, can_update=TRUE, can_delete=TRUE;

INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT role_id, 40, can_view, can_create, can_update, can_delete
FROM role_menu_mapping WHERE menu_id = 27
ON CONFLICT (role_id, menu_id) DO UPDATE SET can_view=TRUE, can_create=TRUE, can_update=TRUE, can_delete=TRUE;

INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT role_id, 41, can_view, can_create, can_update, can_delete
FROM role_menu_mapping WHERE menu_id = 27
ON CONFLICT (role_id, menu_id) DO UPDATE SET can_view=TRUE, can_create=TRUE, can_update=TRUE, can_delete=TRUE;

COMMIT;
