-- ============================================================
-- IGNITEX.AI ERP — Full Migration Script (Drop & Recreate)
-- PostgreSQL user: mohitm
-- Run in pgAdmin Query Tool or: psql -U mohitm -d <your_db> -f FULL_MIGRATION.sql
--
-- WARNING: This DROPS all existing tables and data.
--          Run only when you want a complete fresh start.
-- ============================================================

-- ============================================================
-- STEP 1 — DROP ALL TABLES (CASCADE handles all FK deps)
-- ============================================================
DROP TABLE IF EXISTS audit_log           CASCADE;
DROP TABLE IF EXISTS system_error_log    CASCADE;
DROP TABLE IF EXISTS stock_ledger        CASCADE;
DROP TABLE IF EXISTS sales_order_items   CASCADE;
DROP TABLE IF EXISTS sales_order         CASCADE;
DROP TABLE IF EXISTS purchase_order      CASCADE;
DROP TABLE IF EXISTS product_master      CASCADE;
DROP TABLE IF EXISTS category_master     CASCADE;
DROP TABLE IF EXISTS metal_master        CASCADE;
DROP TABLE IF EXISTS party_master        CASCADE;
DROP TABLE IF EXISTS notification_master CASCADE;
DROP TABLE IF EXISTS login_history       CASCADE;
DROP TABLE IF EXISTS user_role           CASCADE;
DROP TABLE IF EXISTS role_menu_mapping   CASCADE;
DROP TABLE IF EXISTS menu_master         CASCADE;
DROP TABLE IF EXISTS project_config      CASCADE;
DROP TABLE IF EXISTS erp_settings        CASCADE;
DROP TABLE IF EXISTS user_master         CASCADE;
DROP TABLE IF EXISTS master_lookup       CASCADE;
DROP TABLE IF EXISTS role_master         CASCADE;

-- ============================================================
-- STEP 2 — EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- STEP 3 — CREATE TABLES
-- ============================================================

-- 1. Role Master
CREATE TABLE role_master (
    id          SERIAL PRIMARY KEY,
    role_code   VARCHAR(50)  UNIQUE NOT NULL,
    role_name   VARCHAR(100) NOT NULL,
    description TEXT,
    is_active   BOOLEAN   DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Master Lookup
CREATE TABLE master_lookup (
    id            SERIAL PRIMARY KEY,
    lookup_type   VARCHAR(100) NOT NULL,
    lookup_code   VARCHAR(100) NOT NULL,
    lookup_name   VARCHAR(200) NOT NULL,
    lookup_value  VARCHAR(500),
    display_order INT DEFAULT 0,
    parent_code   VARCHAR(100),
    is_active     BOOLEAN   DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lookup_type, lookup_code)
);

-- 3. User Master (all columns from all migrations in final state)
CREATE TABLE user_master (
    user_id            SERIAL PRIMARY KEY,
    employee_id        VARCHAR(20)  UNIQUE NOT NULL,
    password_hash      VARCHAR(255) NOT NULL,
    first_name         VARCHAR(50)  NOT NULL,
    last_name          VARCHAR(50),
    emp_email          VARCHAR(255) UNIQUE,
    mobile_number      VARCHAR(20),
    profile_image      VARCHAR(500),
    department_id      VARCHAR(50),
    designation        VARCHAR(100),
    manager_id         INT,
    user_status        BOOLEAN   DEFAULT TRUE,
    jwt_token          TEXT,
    jwt_token_update   TIMESTAMPTZ,
    start_date         DATE,
    expiry_date        DATE,
    timezone           VARCHAR(50) DEFAULT 'Asia/Kolkata',
    language           VARCHAR(10) DEFAULT 'en',
    last_login_at      TIMESTAMPTZ,
    login_ip           VARCHAR(50),
    created_by         INT,
    created_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by         INT,
    updated_at         TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    inactive_date      DATE,
    inactive_reason    VARCHAR(500),
    reset_otp_hash     VARCHAR(255),
    reset_otp_expiry   TIMESTAMP,
    reset_otp_attempts INT DEFAULT 0,
    reset_token        VARCHAR(255),
    reset_token_expiry TIMESTAMP,
    CONSTRAINT user_master_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES user_master(user_id),
    CONSTRAINT user_master_created_by_fkey FOREIGN KEY (created_by) REFERENCES user_master(user_id),
    CONSTRAINT user_master_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES user_master(user_id)
);

-- 4. User Role
CREATE TABLE user_role (
    id         SERIAL PRIMARY KEY,
    user_id    INT  NOT NULL REFERENCES user_master(user_id) ON DELETE CASCADE,
    role_id    INT  NOT NULL REFERENCES role_master(id),
    is_default BOOLEAN   DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

-- 5. Menu Master
CREATE TABLE menu_master (
    id         SERIAL PRIMARY KEY,
    parent_id  INT REFERENCES menu_master(id),
    menu_code  VARCHAR(100) UNIQUE NOT NULL,
    menu_name  VARCHAR(200) NOT NULL,
    menu_url   VARCHAR(500),
    menu_icon  VARCHAR(100),
    menu_order INT     DEFAULT 0,
    menu_level INT     DEFAULT 1,
    is_active  BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Role Menu Mapping
CREATE TABLE role_menu_mapping (
    id         SERIAL PRIMARY KEY,
    role_id    INT NOT NULL REFERENCES role_master(id),
    menu_id    INT NOT NULL REFERENCES menu_master(id),
    can_view   BOOLEAN NOT NULL DEFAULT TRUE,
    can_create BOOLEAN NOT NULL DEFAULT FALSE,
    can_update BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE,
    can_print  BOOLEAN NOT NULL DEFAULT FALSE,
    can_export BOOLEAN NOT NULL DEFAULT FALSE,
    is_active  BOOLEAN DEFAULT TRUE,
    UNIQUE(role_id, menu_id)
);

-- 7. Project Config
CREATE TABLE project_config (
    id          SERIAL PRIMARY KEY,
    key_code    VARCHAR(100) UNIQUE NOT NULL,
    key_value   TEXT NOT NULL,
    description TEXT,
    config_type VARCHAR(50) DEFAULT 'query',
    is_active   BOOLEAN   DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Login History
CREATE TABLE login_history (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES user_master(user_id),
    employee_id VARCHAR(20),
    login_time  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logout_time TIMESTAMP,
    ip_address  VARCHAR(50),
    user_agent  TEXT,
    status      VARCHAR(20) DEFAULT 'success',
    remarks     VARCHAR(500)
);

-- 9. Notification Master
CREATE TABLE notification_master (
    id                SERIAL PRIMARY KEY,
    user_id           INT REFERENCES user_master(user_id),
    title             VARCHAR(200) NOT NULL,
    message           TEXT NOT NULL,
    notification_type VARCHAR(50)  DEFAULT 'info',
    is_read           BOOLEAN      DEFAULT FALSE,
    action_url        VARCHAR(500),
    created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- 10. Jewellery domain tables
CREATE TABLE party_master (
    id              SERIAL PRIMARY KEY,
    party_code      VARCHAR(50)   UNIQUE NOT NULL,
    party_name      VARCHAR(200)  NOT NULL,
    party_type      VARCHAR(20)   NOT NULL,
    phone           VARCHAR(20),
    email           VARCHAR(200),
    address         TEXT,
    city            VARCHAR(100),
    state           VARCHAR(100),
    pincode         VARCHAR(20),
    gstin           VARCHAR(20),
    pan             VARCHAR(20),
    credit_limit    DECIMAL(15,2) DEFAULT 0,
    opening_balance DECIMAL(15,2) DEFAULT 0,
    is_active       BOOLEAN   DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE metal_master (
    id                SERIAL PRIMARY KEY,
    metal_code        VARCHAR(50)  UNIQUE NOT NULL,
    metal_name        VARCHAR(100) NOT NULL,
    purity_code       VARCHAR(20),
    purity_percentage DECIMAL(5,2),
    current_rate      DECIMAL(15,4),
    unit              VARCHAR(20) DEFAULT 'gram',
    is_active         BOOLEAN   DEFAULT TRUE,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE category_master (
    id            SERIAL PRIMARY KEY,
    category_code VARCHAR(50)  UNIQUE NOT NULL,
    category_name VARCHAR(200) NOT NULL,
    parent_id     INT REFERENCES category_master(id),
    description   TEXT,
    is_active     BOOLEAN   DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_master (
    id                 SERIAL PRIMARY KEY,
    product_code       VARCHAR(100) UNIQUE NOT NULL,
    product_name       VARCHAR(200) NOT NULL,
    category_id        INT REFERENCES category_master(id),
    metal_id           INT REFERENCES metal_master(id),
    gross_weight       DECIMAL(10,4),
    net_weight         DECIMAL(10,4),
    stone_weight       DECIMAL(10,4),
    making_charge      DECIMAL(10,2),
    wastage_percentage DECIMAL(5,2),
    hsn_code           VARCHAR(20),
    description        TEXT,
    image_url          VARCHAR(500),
    barcode            VARCHAR(100),
    is_active          BOOLEAN   DEFAULT TRUE,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sales_order (
    id              SERIAL PRIMARY KEY,
    order_no        VARCHAR(50)   UNIQUE NOT NULL,
    order_date      DATE          NOT NULL,
    party_id        INT REFERENCES party_master(id),
    total_amount    DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount      DECIMAL(15,2) DEFAULT 0,
    net_amount      DECIMAL(15,2) DEFAULT 0,
    advance_amount  DECIMAL(15,2) DEFAULT 0,
    status          VARCHAR(20)   DEFAULT 'PENDING',
    remarks         TEXT,
    created_by      INT REFERENCES user_master(user_id),
    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sales_order_items (
    id            SERIAL PRIMARY KEY,
    order_id      INT REFERENCES sales_order(id),
    product_id    INT REFERENCES product_master(id),
    quantity      INT           DEFAULT 1,
    gross_weight  DECIMAL(10,4),
    net_weight    DECIMAL(10,4),
    rate          DECIMAL(15,4),
    making_charge DECIMAL(10,2),
    amount        DECIMAL(15,2),
    remarks       TEXT
);

CREATE TABLE purchase_order (
    id           SERIAL PRIMARY KEY,
    order_no     VARCHAR(50)   UNIQUE NOT NULL,
    order_date   DATE          NOT NULL,
    party_id     INT REFERENCES party_master(id),
    total_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount   DECIMAL(15,2) DEFAULT 0,
    net_amount   DECIMAL(15,2) DEFAULT 0,
    status       VARCHAR(20)   DEFAULT 'PENDING',
    remarks      TEXT,
    created_by   INT REFERENCES user_master(user_id),
    created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_ledger (
    id               SERIAL PRIMARY KEY,
    product_id       INT REFERENCES product_master(id),
    transaction_type VARCHAR(20)   NOT NULL,
    transaction_no   VARCHAR(50),
    transaction_date DATE          NOT NULL,
    in_quantity      INT           DEFAULT 0,
    out_quantity     INT           DEFAULT 0,
    in_weight        DECIMAL(10,4) DEFAULT 0,
    out_weight       DECIMAL(10,4) DEFAULT 0,
    balance_quantity INT           DEFAULT 0,
    balance_weight   DECIMAL(10,4) DEFAULT 0,
    created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- 11. System / Audit logs
CREATE TABLE system_error_log (
    id             SERIAL PRIMARY KEY,
    severity       VARCHAR(20)  NOT NULL DEFAULT 'ERROR',
    error_type     VARCHAR(200),
    message        TEXT         NOT NULL,
    stack_trace    TEXT,
    request_path   VARCHAR(500),
    request_method VARCHAR(10),
    user_id        INT REFERENCES user_master(user_id) ON DELETE SET NULL,
    employee_id    VARCHAR(50),
    ip_address     VARCHAR(50),
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_log (
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

-- 12. ERP Settings
CREATE TABLE erp_settings (
    key        VARCHAR(100) PRIMARY KEY,
    value      TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- STEP 4 — INDEXES
-- ============================================================
CREATE INDEX idx_user_master_employeeid ON user_master(employee_id);
CREATE INDEX idx_user_master_jwt_token  ON user_master(jwt_token);
CREATE INDEX idx_user_role_user         ON user_role(user_id);
CREATE INDEX idx_login_history_user     ON login_history(user_id);
CREATE INDEX idx_login_history_time     ON login_history(login_time);
CREATE INDEX idx_menu_master_parent     ON menu_master(parent_id);
CREATE INDEX idx_role_menu_role         ON role_menu_mapping(role_id);
CREATE INDEX idx_project_config_key     ON project_config(key_code);
CREATE INDEX idx_master_lookup_type     ON master_lookup(lookup_type);
CREATE INDEX idx_party_master_code      ON party_master(party_code);
CREATE INDEX idx_product_master_code    ON product_master(product_code);
CREATE INDEX idx_sales_order_date       ON sales_order(order_date);
CREATE INDEX idx_stock_ledger_product   ON stock_ledger(product_id);
CREATE INDEX idx_error_log_created      ON system_error_log(created_at DESC);
CREATE INDEX idx_error_log_severity     ON system_error_log(severity);
CREATE INDEX idx_audit_log_created      ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_user         ON audit_log(user_id);
CREATE INDEX idx_audit_log_module       ON audit_log(module);
CREATE INDEX idx_audit_log_action       ON audit_log(action);

-- ============================================================
-- STEP 5 — SEED: ROLES
-- ============================================================
INSERT INTO role_master (id, role_code, role_name, description, is_active) VALUES
(1, 'SYS_ADMIN',     'System Administrator', 'Full system access',            TRUE),
(2, 'PROCESS_ADMIN', 'Process Admin',        'Process administration access', TRUE),
(3, 'MANAGER',       'Manager',              'Managerial access',             TRUE),
(4, 'SUPERVISOR',    'Supervisor',           'Supervisory access',            TRUE),
(5, 'OPERATOR',      'Operator',             'Operational access',            TRUE),
(6, 'VIEWER',        'Viewer',               'Read-only access',              TRUE);

SELECT setval('role_master_id_seq', 10);

-- ============================================================
-- STEP 6 — SEED: USERS  (password for all: Admin@123)
-- ============================================================
INSERT INTO user_master (employee_id, password_hash, first_name, last_name, emp_email, user_status) VALUES
('EMP001', '$2b$10$nNh48ihKHGGlYpPeHuyn8uWykZ3x5BPjkjXGpTtqFjzzEgmigkhn6', 'System',   'Administrator', 'admin@ignitex.ai',    TRUE),
('EMP002', '$2b$10$nNh48ihKHGGlYpPeHuyn8uWykZ3x5BPjkjXGpTtqFjzzEgmigkhn6', 'Store',    'Manager',       'manager@ignitex.ai',  TRUE),
('EMP003', '$2b$10$nNh48ihKHGGlYpPeHuyn8uWykZ3x5BPjkjXGpTtqFjzzEgmigkhn6', 'Sales',    'Executive',     'sales@ignitex.ai',    TRUE),
('EMP004', '$2b$10$nNh48ihKHGGlYpPeHuyn8uWykZ3x5BPjkjXGpTtqFjzzEgmigkhn6', 'Purchase', 'Executive',     'purchase@ignitex.ai', TRUE),
('EMP005', '$2b$10$nNh48ihKHGGlYpPeHuyn8uWykZ3x5BPjkjXGpTtqFjzzEgmigkhn6', 'Accounts', 'Executive',     'accounts@ignitex.ai', TRUE);

-- ============================================================
-- STEP 7 — SEED: MENUS (final state — Others menu removed)
-- ============================================================

-- Level 1 — Parent modules
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active) VALUES
(1,  NULL, 'DASHBOARD',       'Dashboard',             '/dashboard', 'HomeIcon',        1,  1, TRUE),
(2,  NULL, 'MASTER_MGMT',     'Master Management',     NULL,         'CircleStackIcon', 2,  1, TRUE),
(3,  NULL, 'PURCHASE_MGMT',   'Purchase Management',   NULL,         'TruckIcon',       3,  1, TRUE),
(4,  NULL, 'INVENTORY_MGMT',  'Inventory Management',  NULL,         'CubeIcon',        4,  1, TRUE),
(5,  NULL, 'PRODUCTION_MGMT', 'Production Management', NULL,         'FactoryIcon',     5,  1, TRUE),
(6,  NULL, 'QUALITY_CTRL',    'Quality Control (QC)',  NULL,         'ShieldCheckIcon', 6,  1, TRUE),
(7,  NULL, 'ORDER_MGMT',      'Order Management',      NULL,         'ShoppingBagIcon', 7,  1, TRUE),
(8,  NULL, 'INTEGRATION',     'Integration',           NULL,         'LinkIcon',        8,  1, TRUE),
(9,  NULL, 'REPORTS_DASH',    'Reports & Dashboards',  NULL,         'ChartBarIcon',    9,  1, TRUE),
(10, NULL, 'SYSTEM_ADMIN',    'System Admin',          NULL,         'Cog6ToothIcon',   10, 1, TRUE);

-- Master Management (parent_id=2)
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active) VALUES
(21, 2, 'MM_LOOKUP',      'Lookup Master',               '/master-mgmt/lookup',           'ListBulletIcon',    1,  2, TRUE),
(22, 2, 'MM_FG_ITEMS',    'Finished Goods Items',        '/master-mgmt/finished-goods',   'GemIcon',           2,  2, TRUE),
(24, 2, 'MM_COMP_ITEMS',  'Components Items',            '/master-mgmt/components',       'CubeIcon',          3,  2, TRUE),
(26, 2, 'MM_STONE_ITEMS', 'Stone Items',                 '/master-mgmt/stone-items',      'SparklesIcon',      4,  2, TRUE),
(27, 2, 'MM_FG_BOM',      'Bill of Materials(FG BOM)',   '/master-mgmt/fg-bom',           'ClipboardListIcon', 5,  2, TRUE),
(37, 2, 'MM_SFG_BOM',     'Bill of Materials(SFG BOM)',  '/master-mgmt/sfg-bom',          'ClipboardListIcon', 6,  2, TRUE),
(28, 2, 'MM_SUPPLIER',    'Supplier Master',             '/master-mgmt/supplier',         'UserGroupIcon',     7,  2, TRUE),
(29, 2, 'MM_SUPP_RATE',   'Supplier Rate Contract',      '/master-mgmt/supplier-rate',    'TagIcon',           8,  2, TRUE),
(30, 2, 'MM_CUSTOMER',    'Customer Master',             '/master-mgmt/customer',         'UserGroupIcon',     9,  2, TRUE),
(31, 2, 'MM_CUST_PRICE',  'Customer Price Master',       '/master-mgmt/customer-price',   'TagIcon',           10, 2, TRUE),
(32, 2, 'MM_PROD_DEPT',   'Production Departments',      '/master-mgmt/production-depts', 'FolderIcon',        11, 2, TRUE),
(33, 2, 'MM_CAPACITY',    'Capacity Master',             '/master-mgmt/capacity',         'ChartBarIcon',      12, 2, TRUE),
(34, 2, 'MM_OPERATIONS',  'Operations',                  '/master-mgmt/operations',       'Cog6ToothIcon',     13, 2, TRUE),
(35, 2, 'MM_WORK_DEF',    'Work Definition',             '/master-mgmt/work-definition',  'ListBulletIcon',    14, 2, TRUE),
(36, 2, 'MM_MIN_MAX',     'Min Max Planning',            '/master-mgmt/min-max-planning', 'ChartBarIcon',      15, 2, TRUE);

-- Purchase Management (parent_id=3)
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active) VALUES
(41, 3, 'PM_REQUISITIONS', 'Purchase Requisitions', '/purchase-mgmt/requisitions',       'ClipboardListIcon', 1, 2, TRUE),
(42, 3, 'PM_ORDERS',       'Purchase Orders',       '/purchase-mgmt/orders',             'TruckIcon',         2, 2, TRUE),
(43, 3, 'PM_BLANKET',      'Blanket Agreements',    '/purchase-mgmt/blanket-agreements', 'FolderIcon',        3, 2, TRUE);

-- Inventory Management (parent_id=4)
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active) VALUES
(51, 4, 'IM_ON_HAND', 'On Hand Stock',  '/inventory-mgmt/on-hand', 'CubeIcon',        1, 2, TRUE),
(52, 4, 'IM_COSTING', 'Costing Module', '/inventory-mgmt/costing', 'CircleStackIcon', 2, 2, TRUE);

-- Production Management (parent_id=5)
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active) VALUES
(61, 5, 'PROD_SCHED',   'Scheduling',         '/production/scheduling',    'CalendarIcon',  1, 2, TRUE),
(62, 5, 'PROD_RESCHED', 'Re-scheduling',      '/production/re-scheduling', 'RefreshCwIcon', 2, 2, TRUE),
(63, 5, 'PROD_PROCESS', 'Production Process', '/production/process',       'FactoryIcon',   3, 2, TRUE);

-- Quality Control (parent_id=6)
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active) VALUES
(71, 6, 'QC_INCOMING',     'Incoming',     '/quality/incoming',     'ShieldCheckIcon', 1, 2, TRUE),
(72, 6, 'QC_IN_PROCESS',   'In-Process',   '/quality/in-process',   'ShieldCheckIcon', 2, 2, TRUE),
(73, 6, 'QC_PRE_DISPATCH', 'Pre-Dispatch', '/quality/pre-dispatch', 'TruckIcon',       3, 2, TRUE);

-- Order Management (parent_id=7)
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active) VALUES
(81, 7, 'ORD_SALES',      'Sales Order',      '/order-mgmt/sales-order', 'ShoppingBagIcon', 1, 2, TRUE),
(82, 7, 'ORD_FULFILMENT', 'Order Fulfilment', '/order-mgmt/fulfilment',  'ShoppingBagIcon', 2, 2, TRUE);

-- Integration (parent_id=8)
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active) VALUES
(91, 8, 'INT_AP',       'AP Integration',  '/integration/ap',       'LinkIcon',      1, 2, TRUE),
(92, 8, 'INT_AR',       'AR Integration',  '/integration/ar',       'LinkIcon',      2, 2, TRUE),
(93, 8, 'INT_CUSTOMER', 'Customer Master', '/integration/customer', 'UserGroupIcon', 3, 2, TRUE),
(94, 8, 'INT_VENDOR',   'Vendor Master',   '/integration/vendor',   'UserGroupIcon', 4, 2, TRUE),
(95, 8, 'INT_PORTAL',   'Customer Portal', '/integration/portal',   'GlobeIcon',     5, 2, TRUE);

-- Reports & Dashboards (parent_id=9)
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active) VALUES
(101, 9, 'RPT_SALES',      'Sales',       '/reports-dash/sales',      'ChartBarIcon', 1, 2, TRUE),
(102, 9, 'RPT_PURCHASE',   'Purchase',    '/reports-dash/purchase',   'ChartBarIcon', 2, 2, TRUE),
(103, 9, 'RPT_PRODUCTION', 'Production',  '/reports-dash/production', 'ChartBarIcon', 3, 2, TRUE),
(104, 9, 'RPT_INVENTORY',  'Inventory',   '/reports-dash/inventory',  'ChartBarIcon', 4, 2, TRUE);

-- System Admin (parent_id=10) — OTH_ items inserted here with final names
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active) VALUES
(118, 10, 'SA_ERP_CONFIG',   'ERP Configuration',          '/settings/erp-config',  'Settings2',       0,  2, TRUE),
(117, 10, 'SA_USER_PROFILE', 'User Profile',               '/profile',              'UserCircle',      1,  2, TRUE),
(111, 10, 'SA_USER_MASTER',  'User Master',                '/settings/users',       'UsersIcon',       2,  2, TRUE),
(112, 10, 'SA_ROLES_RESP',   'Roles & Responsibility',     '/settings/roles',       'ShieldCheckIcon', 3,  2, TRUE),
(113, 10, 'SA_USER_ROLE',    'User-Role Assignment',       '/settings/user-roles',  'UsersIcon',       4,  2, TRUE),
(141, 10, 'OTH_MENU_MSTR',  'Menu Configuration',         '/settings/menus',       'ListBulletIcon',  5,  2, TRUE),
(142, 10, 'OTH_PERM_MSTR',  'User Permission Management', '/settings/permissions', 'ShieldCheckIcon', 6,  2, TRUE),
(143, 10, 'OTH_MAIL_CONF',  'Mail Configuration',         '/settings/mail-config', 'EnvelopeIcon',    7,  2, TRUE),
(114, 10, 'SA_LOGIN_LOGS',   'User Login Logs',            '/settings/login-logs',  'ClipboardList',   8,  2, TRUE),
(115, 10, 'SA_ERROR_LOGS',   'Error Logs',                 '/settings/error-logs',  'AlertTriangle',   9,  2, TRUE),
(116, 10, 'SA_AUDIT_LOGS',   'Audit Logs',                 '/settings/audit-logs',  'ClipboardCheck',  10, 2, TRUE);

SELECT setval('menu_master_id_seq', 200);

-- ============================================================
-- STEP 8 — SEED: ROLE MENU PERMISSIONS
-- ============================================================

-- SYS_ADMIN — full access
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export)
SELECT 1, id, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE FROM menu_master;

-- PROCESS_ADMIN — full except system admin
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export)
SELECT 2, id, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE FROM menu_master
WHERE menu_code NOT IN ('SYSTEM_ADMIN','SA_USER_MASTER','SA_ROLES_RESP','SA_USER_ROLE',
                        'SA_ERP_CONFIG','OTH_MENU_MSTR','OTH_PERM_MSTR','OTH_MAIL_CONF');

-- MANAGER — view/create/update + print/export, no delete, no admin
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export)
SELECT 3, id, TRUE, TRUE, TRUE, FALSE, TRUE, TRUE FROM menu_master
WHERE menu_code NOT IN ('SYSTEM_ADMIN','SA_USER_MASTER','SA_ROLES_RESP','SA_USER_ROLE',
                        'SA_ERP_CONFIG','OTH_MENU_MSTR','OTH_PERM_MSTR','OTH_MAIL_CONF');

-- SUPERVISOR — view + create, no admin
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export)
SELECT 4, id, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE FROM menu_master
WHERE menu_code NOT IN ('SYSTEM_ADMIN','SA_USER_MASTER','SA_ROLES_RESP','SA_USER_ROLE',
                        'SA_ERP_CONFIG','OTH_MENU_MSTR','OTH_PERM_MSTR','OTH_MAIL_CONF');

-- OPERATOR — limited operational modules only
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export)
SELECT 5, id, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE FROM menu_master
WHERE menu_code IN (
    'DASHBOARD',
    'PURCHASE_MGMT','PM_REQUISITIONS','PM_ORDERS','PM_BLANKET',
    'INVENTORY_MGMT','IM_ON_HAND','IM_COSTING',
    'PRODUCTION_MGMT','PROD_SCHED','PROD_RESCHED','PROD_PROCESS',
    'QUALITY_CTRL','QC_INCOMING','QC_IN_PROCESS','QC_PRE_DISPATCH',
    'ORDER_MGMT','ORD_SALES','ORD_FULFILMENT'
);

-- VIEWER — read-only, all non-admin menus
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export)
SELECT 6, id, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE FROM menu_master
WHERE menu_code NOT IN ('SYSTEM_ADMIN','SA_USER_MASTER','SA_ROLES_RESP','SA_USER_ROLE',
                        'SA_ERP_CONFIG','OTH_MENU_MSTR','OTH_PERM_MSTR','OTH_MAIL_CONF');

-- ============================================================
-- STEP 9 — SEED: USER ROLE ASSIGNMENTS
-- ============================================================
INSERT INTO user_role (user_id, role_id, is_default)
SELECT user_id, 1, TRUE FROM user_master WHERE employee_id = 'EMP001';

INSERT INTO user_role (user_id, role_id, is_default)
SELECT user_id, 3, TRUE FROM user_master WHERE employee_id = 'EMP002';

INSERT INTO user_role (user_id, role_id, is_default)
SELECT user_id, 5, TRUE FROM user_master WHERE employee_id = 'EMP003';

INSERT INTO user_role (user_id, role_id, is_default)
SELECT user_id, 3, TRUE FROM user_master WHERE employee_id = 'EMP004';

INSERT INTO user_role (user_id, role_id, is_default)
SELECT user_id, 4, TRUE FROM user_master WHERE employee_id = 'EMP005';

-- ============================================================
-- STEP 10 — SEED: PROJECT CONFIG
-- ============================================================
INSERT INTO project_config (key_code, key_value, description, config_type) VALUES

('login_get',
 'SELECT u.user_id, u.employee_id, u.password_hash, u.first_name, u.last_name, u.emp_email, u.mobile_number, u.profile_image, u.user_status FROM user_master u WHERE u.employee_id = :userid AND u.user_status = TRUE',
 'Login user fetch query', 'query'),

('user_list_get',
 'SELECT u.user_id, u.employee_id, u.first_name, u.last_name, CONCAT(u.first_name, '' '', COALESCE(u.last_name, '''')) AS full_name, u.emp_email, u.mobile_number, u.user_status, u.department_id, u.designation, u.created_at FROM user_master u WHERE u.user_status = TRUE ORDER BY u.first_name, u.last_name',
 'Get all active users', 'query'),

('menu_get',
 'SELECT m.*, rm.can_view, rm.can_create, rm.can_update, rm.can_delete, rm.can_print, rm.can_export FROM menu_master m LEFT JOIN role_menu_mapping rm ON m.id = rm.menu_id AND rm.role_id = :role_id WHERE m.is_active = TRUE ORDER BY m.menu_level, m.menu_order',
 'Get menus by role', 'query'),

('party_list_get',   'SELECT * FROM party_master WHERE is_active = TRUE ORDER BY party_name', 'Get all active parties', 'query'),
('party_by_id_get',  'SELECT * FROM party_master WHERE id = :id AND is_active = TRUE',        'Get party by ID',        'query'),

('product_list_get',
 'SELECT p.*, c.category_name, m.metal_name FROM product_master p LEFT JOIN category_master c ON p.category_id = c.id LEFT JOIN metal_master m ON p.metal_id = m.id WHERE p.is_active = TRUE ORDER BY p.product_name',
 'Get all active products', 'query'),

('metal_list_get',    'SELECT * FROM metal_master    WHERE is_active = TRUE ORDER BY metal_name',    'Get all metals',     'query'),
('category_list_get', 'SELECT * FROM category_master WHERE is_active = TRUE ORDER BY category_name', 'Get all categories', 'query'),
('lookup_by_type_get','SELECT * FROM master_lookup   WHERE lookup_type = :lookup_type AND is_active = TRUE ORDER BY display_order', 'Get lookups by type', 'query'),

('notifications_get',
 'SELECT * FROM notification_master WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 10',
 'Get user notifications', 'query'),

('dashboard_stats_get',
 'SELECT (SELECT COUNT(*) FROM party_master WHERE is_active = TRUE) as total_parties, (SELECT COUNT(*) FROM product_master WHERE is_active = TRUE) as total_products, (SELECT COUNT(*) FROM sales_order WHERE DATE(created_at) = CURRENT_DATE) as todays_orders, (SELECT COALESCE(SUM(net_amount),0) FROM sales_order WHERE DATE(created_at) = CURRENT_DATE) as todays_sales',
 'Dashboard statistics', 'query'),

('sales_order_list_get',
 'SELECT s.*, p.party_name FROM sales_order s LEFT JOIN party_master p ON s.party_id = p.id ORDER BY s.created_at DESC LIMIT 50',
 'Get recent sales orders', 'query'),

('login_history_get',
 'SELECT lh.*, CONCAT(u.first_name, '' '', COALESCE(u.last_name, '''')) AS full_name FROM login_history lh LEFT JOIN user_master u ON lh.user_id = u.user_id ORDER BY lh.login_time DESC LIMIT 50',
 'Get login history', 'query'),

('mail_config_get',
 'SELECT key_code, key_value, description FROM project_config WHERE key_code LIKE ''mail_%'' AND is_active = TRUE ORDER BY key_code',
 'Get all mail configuration settings', 'query'),

('mail_config_update',
 'UPDATE project_config SET key_value = :key_value, updated_at = NOW() WHERE key_code = :key_code',
 'Update a single mail configuration key', 'query'),

('menu_master_list_get',
 'SELECT m.id, m.parent_id, m.menu_code, m.menu_name, m.menu_url, m.menu_icon, m.menu_order, m.menu_level, m.is_active, m.created_at, pm.menu_name as parent_name FROM menu_master m LEFT JOIN menu_master pm ON pm.id = m.parent_id ORDER BY m.menu_level, m.menu_order, m.id',
 'Get all menus with parent name', 'query'),

('menu_master_create',
 'INSERT INTO menu_master (parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active) VALUES (:parent_id, :menu_code, :menu_name, :menu_url, :menu_icon, :menu_order, :menu_level, :is_active) RETURNING *',
 'Create new menu item', 'query'),

('menu_master_update',
 'UPDATE menu_master SET parent_id=:parent_id, menu_name=:menu_name, menu_url=:menu_url, menu_icon=:menu_icon, menu_order=:menu_order, menu_level=:menu_level, is_active=:is_active WHERE id=:id RETURNING *',
 'Update menu item', 'query'),

('menu_master_delete',
 'UPDATE menu_master SET is_active=FALSE WHERE id=:id RETURNING id',
 'Soft delete menu item', 'query'),

('role_master_list_get',
 'SELECT id, role_code, role_name, description, is_active, created_at, updated_at FROM role_master ORDER BY id',
 'Get all roles', 'query'),

('role_master_create',
 'INSERT INTO role_master (role_code, role_name, description, is_active) VALUES (:role_code, :role_name, :description, :is_active) RETURNING *',
 'Create new role', 'query'),

('role_master_update',
 'UPDATE role_master SET role_name=:role_name, description=:description, is_active=:is_active, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *',
 'Update role', 'query'),

('role_master_delete',
 'UPDATE role_master SET is_active=FALSE, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING id',
 'Soft delete role', 'query'),

('permission_menus_by_role_get',
 'SELECT m.id as menu_id, m.menu_code, m.menu_name, m.parent_id, m.menu_level, m.menu_order, pm.menu_name as parent_name, COALESCE(rm.can_view, FALSE) as can_view, COALESCE(rm.can_create, FALSE) as can_create, COALESCE(rm.can_update, FALSE) as can_update, COALESCE(rm.can_delete, FALSE) as can_delete, COALESCE(rm.can_print, FALSE) as can_print, COALESCE(rm.can_export, FALSE) as can_export FROM menu_master m LEFT JOIN role_menu_mapping rm ON m.id = rm.menu_id AND rm.role_id = :role_id LEFT JOIN menu_master pm ON pm.id = m.parent_id WHERE m.is_active = TRUE ORDER BY m.menu_level, m.menu_order',
 'Get all menus with permission flags for a specific role', 'query'),

('permission_upsert',
 'INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export, is_active) VALUES (:role_id, :menu_id, :can_view, :can_create, :can_update, :can_delete, :can_print, :can_export, TRUE) ON CONFLICT (role_id, menu_id) DO UPDATE SET can_view=EXCLUDED.can_view, can_create=EXCLUDED.can_create, can_update=EXCLUDED.can_update, can_delete=EXCLUDED.can_delete, can_print=EXCLUDED.can_print, can_export=EXCLUDED.can_export, is_active=TRUE RETURNING *',
 'Upsert a single role-menu permission row', 'query'),

('permission_remove',
 'DELETE FROM role_menu_mapping WHERE role_id=:role_id AND menu_id=:menu_id RETURNING id',
 'Remove a role-menu permission mapping', 'query');

-- Mail settings
INSERT INTO project_config (key_code, key_value, description, config_type) VALUES
('mail_driver',     'smtp',                 'Mail transport driver',                         'mail'),
('mail_host',       'smtp.gmail.com',       'SMTP server hostname',                          'mail'),
('mail_port',       '587',                  'SMTP server port',                              'mail'),
('mail_encryption', 'tls',                  'Encryption protocol (none / tls / ssl)',        'mail'),
('mail_auth',       'true',                 'Require SMTP authentication (true / false)',    'mail'),
('mail_username',   '',                     'SMTP authentication username / email',          'mail'),
('mail_password',   '',                     'SMTP authentication password',                  'mail'),
('mail_from_email', 'noreply@ignitex.ai', 'Default From email address',                   'mail'),
('mail_from_name',  'IgniteX.ai ERP',       'Default From display name',                    'mail'),
('mail_reply_to',   '',                     'Reply-To email address',                        'mail'),
('mail_timeout',    '30',                   'SMTP connection timeout in seconds',            'mail'),
('mail_is_active',  'true',                 'Enable / disable outgoing email',               'mail');

-- ============================================================
-- STEP 11 — SEED: MASTER LOOKUP
-- ============================================================
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order) VALUES
('DEPARTMENT', 'IT',           'Information Technology',    1),
('DEPARTMENT', 'SALES',        'Sales',                     2),
('DEPARTMENT', 'PURCHASE',     'Purchase',                  3),
('DEPARTMENT', 'ACCOUNTS',     'Accounts',                  4),
('DEPARTMENT', 'ADMIN',        'Administration',             5),
('DEPARTMENT', 'HR',           'Human Resources',            6),
('DEPARTMENT', 'DESIGN',       'Design & Production',        7),
('DEPARTMENT', 'STORE',        'Store Operations',           8),
('PARTY_TYPE', 'CUSTOMER',     'Customer',                   1),
('PARTY_TYPE', 'SUPPLIER',     'Supplier',                   2),
('PARTY_TYPE', 'BOTH',         'Both (Customer & Supplier)', 3),
('METAL_TYPE', 'GOLD',         'Gold',                       1),
('METAL_TYPE', 'SILVER',       'Silver',                     2),
('METAL_TYPE', 'PLATINUM',     'Platinum',                   3),
('METAL_TYPE', 'DIAMOND',      'Diamond',                    4),
('PURITY',     '24K',          '24 Karat (999)',              1),
('PURITY',     '22K',          '22 Karat (916)',              2),
('PURITY',     '18K',          '18 Karat (750)',              3),
('PURITY',     '14K',          '14 Karat (585)',              4),
('ORDER_STATUS','PENDING',     'Pending',                    1),
('ORDER_STATUS','CONFIRMED',   'Confirmed',                  2),
('ORDER_STATUS','PROCESSING',  'Processing',                 3),
('ORDER_STATUS','DELIVERED',   'Delivered',                  4),
('ORDER_STATUS','CANCELLED',   'Cancelled',                  5),
('GENDER',     'MALE',         'Male',                       1),
('GENDER',     'FEMALE',       'Female',                     2),
('GENDER',     'UNISEX',       'Unisex',                     3),
('OCCASION',   'WEDDING',      'Wedding',                    1),
('OCCASION',   'ENGAGEMENT',   'Engagement',                 2),
('OCCASION',   'ANNIVERSARY',  'Anniversary',                3),
('OCCASION',   'CASUAL',       'Casual Wear',                4),
('OCCASION',   'FESTIVAL',     'Festival',                   5);

-- ============================================================
-- STEP 12 — SEED: METAL & CATEGORY MASTERS
-- ============================================================
INSERT INTO metal_master (metal_code, metal_name, purity_code, purity_percentage, current_rate, unit) VALUES
('GOLD_24K',     'Gold 24K (999)',  '24K', 99.9, 6250.00, 'gram'),
('GOLD_22K',     'Gold 22K (916)',  '22K', 91.6, 5725.00, 'gram'),
('GOLD_18K',     'Gold 18K (750)',  '18K', 75.0, 4688.00, 'gram'),
('SILVER_999',   'Silver 999',      '999', 99.9,   75.50, 'gram'),
('PLATINUM_950', 'Platinum 950',    '950', 95.0, 3200.00, 'gram');

INSERT INTO category_master (category_code, category_name, description) VALUES
('NECKLACE', 'Necklaces', 'All types of necklaces'),
('RING',     'Rings',     'All types of rings'),
('EARRING',  'Earrings',  'All types of earrings'),
('BRACELET', 'Bracelets', 'All types of bracelets'),
('BANGLE',   'Bangles',   'All types of bangles'),
('PENDANT',  'Pendants',  'All types of pendants'),
('CHAIN',    'Chains',    'All types of chains'),
('ANKLET',   'Anklets',   'All types of anklets');

-- ============================================================
-- STEP 13 — SEED: ERP SETTINGS
-- ============================================================
INSERT INTO erp_settings (key, value) VALUES
('erp_logo_url',   NULL),
('erp_name',       'IgniteX.ai'),
('erp_subtitle',   'ENTERPRISES ERP'),
('favicon_url',    NULL),
('footer_company', 'IgniteX.ai');

-- ============================================================
-- STEP 14 — SEED: WELCOME NOTIFICATION FOR EMP001
-- ============================================================
INSERT INTO notification_master (user_id, title, message, notification_type)
SELECT user_id, 'Welcome to IgniteX.ai ERP',
       'System initialized successfully. Configure your settings to get started.',
       'info'
FROM user_master WHERE employee_id = 'EMP001';

-- ============================================================
-- TABLE COMMENTS
-- ============================================================
COMMENT ON TABLE user_master      IS 'System users / employees with authentication details';
COMMENT ON TABLE menu_master      IS 'Application menu hierarchy';
COMMENT ON TABLE project_config   IS 'Dynamic query and configuration storage';
COMMENT ON TABLE master_lookup    IS 'Common lookup / dropdown data';
COMMENT ON TABLE system_error_log IS 'Application error log';
COMMENT ON TABLE audit_log        IS 'User action audit trail';
COMMENT ON TABLE erp_settings     IS 'ERP branding and UI configuration';

-- ============================================================
-- VERIFY — row counts for all key tables
-- ============================================================
SELECT tbl, cnt FROM (
    SELECT 'role_master'      AS tbl, COUNT(*) AS cnt FROM role_master      UNION ALL
    SELECT 'user_master',             COUNT(*)         FROM user_master      UNION ALL
    SELECT 'user_role',               COUNT(*)         FROM user_role        UNION ALL
    SELECT 'menu_master',             COUNT(*)         FROM menu_master      UNION ALL
    SELECT 'role_menu_mapping',       COUNT(*)         FROM role_menu_mapping UNION ALL
    SELECT 'project_config',          COUNT(*)         FROM project_config   UNION ALL
    SELECT 'master_lookup',           COUNT(*)         FROM master_lookup    UNION ALL
    SELECT 'metal_master',            COUNT(*)         FROM metal_master     UNION ALL
    SELECT 'category_master',         COUNT(*)         FROM category_master  UNION ALL
    SELECT 'erp_settings',            COUNT(*)         FROM erp_settings
) t ORDER BY tbl;
