-- ============================================================
-- 06_role_restructure.sql
-- Replace old roles with new business roles
-- Run AFTER 05_menu_restructure.sql
-- ============================================================

BEGIN;

-- Clear existing role-menu mappings first (no cascade to user data)
DELETE FROM role_menu_mapping;

-- ============================================================
-- UPDATE EXISTING ROLES (order matters to avoid unique-code conflicts)
-- ============================================================

-- id=2 first: free up 'MANAGER' code before id=3 claims it
UPDATE role_master SET
  role_code   = 'PROCESS_ADMIN',
  role_name   = 'Process Admin',
  description = 'Process administration access',
  is_active   = TRUE,
  updated_at  = NOW()
WHERE id = 2;

-- id=1: ADMIN → SYS_ADMIN
UPDATE role_master SET
  role_code   = 'SYS_ADMIN',
  role_name   = 'System Administrator',
  description = 'Full system access',
  is_active   = TRUE,
  updated_at  = NOW()
WHERE id = 1;

-- id=3: SALES → MANAGER (MANAGER code now free)
UPDATE role_master SET
  role_code   = 'MANAGER',
  role_name   = 'Manager',
  description = 'Managerial access',
  is_active   = TRUE,
  updated_at  = NOW()
WHERE id = 3;

-- id=4: PURCHASE → SUPERVISOR
UPDATE role_master SET
  role_code   = 'SUPERVISOR',
  role_name   = 'Supervisor',
  description = 'Supervisory access',
  is_active   = TRUE,
  updated_at  = NOW()
WHERE id = 4;

-- id=5: ACCOUNTS → OPERATOR
UPDATE role_master SET
  role_code   = 'OPERATOR',
  role_name   = 'Operator',
  description = 'Operational access',
  is_active   = TRUE,
  updated_at  = NOW()
WHERE id = 5;

-- ============================================================
-- INSERT NEW ROLE — VIEWER
-- ============================================================
INSERT INTO role_master (role_code, role_name, description, is_active)
VALUES ('VIEWER', 'Viewer', 'Read-only access', TRUE)
ON CONFLICT (role_code) DO UPDATE
  SET role_name = 'Viewer', description = 'Read-only access', is_active = TRUE;

-- ============================================================
-- RE-GRANT MENU PERMISSIONS
-- ============================================================

-- System Administrator (id=1) — full access to everything
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT 1, id, TRUE, TRUE, TRUE, TRUE FROM menu_master
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- Process Admin (id=2) — full access except system admin settings
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT 2, id, TRUE, TRUE, TRUE, TRUE FROM menu_master
WHERE menu_code NOT IN (
  'SYSTEM_ADMIN','SA_USER_MASTER','SA_ROLES_RESP','SA_USER_ROLE',
  'OTH_SYS_CONF','OTH_MENU_MSTR','OTH_PERM_MSTR','OTH_MAIL_CONF'
)
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- Manager (id=3) — view/create/update, no delete, no system admin
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT 3, id, TRUE, TRUE, TRUE, FALSE FROM menu_master
WHERE menu_code NOT IN (
  'SYSTEM_ADMIN','SA_USER_MASTER','SA_ROLES_RESP','SA_USER_ROLE',
  'OTH_SYS_CONF','OTH_MENU_MSTR','OTH_PERM_MSTR','OTH_MAIL_CONF'
)
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- Supervisor (id=4) — view and create, no update/delete, no system admin
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT 4, id, TRUE, TRUE, FALSE, FALSE FROM menu_master
WHERE menu_code NOT IN (
  'SYSTEM_ADMIN','SA_USER_MASTER','SA_ROLES_RESP','SA_USER_ROLE',
  'OTH_SYS_CONF','OTH_MENU_MSTR','OTH_PERM_MSTR','OTH_MAIL_CONF'
)
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- Operator (id=5) — view and create only, limited to operational modules
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT 5, id, TRUE, TRUE, FALSE, FALSE FROM menu_master
WHERE menu_code IN (
  'DASHBOARD',
  'PURCHASE_MGMT','PM_REQUISITIONS','PM_ORDERS','PM_BLANKET',
  'INVENTORY_MGMT','IM_ON_HAND','IM_COSTING',
  'PRODUCTION_MGMT','PROD_SCHED','PROD_RESCHED','PROD_PROCESS',
  'QUALITY_CTRL','QC_INCOMING','QC_IN_PROCESS','QC_PRE_DISPATCH',
  'ORDER_MGMT','ORD_SALES','ORD_FULFILMENT',
  'OTHERS','OTH_LOOKUP','OTH_STOCK_IN','OTH_STOCK_LED',
  'OTH_SALES_ORD','OTH_PURCH_ORD'
)
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- Viewer — read-only across all non-admin menus
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT rm.id, m.id, TRUE, FALSE, FALSE, FALSE
FROM menu_master m
CROSS JOIN (SELECT id FROM role_master WHERE role_code = 'VIEWER') rm
WHERE m.menu_code NOT IN (
  'SYSTEM_ADMIN','SA_USER_MASTER','SA_ROLES_RESP','SA_USER_ROLE',
  'OTH_SYS_CONF','OTH_MENU_MSTR','OTH_PERM_MSTR','OTH_MAIL_CONF'
)
ON CONFLICT (role_id, menu_id) DO NOTHING;

COMMIT;
