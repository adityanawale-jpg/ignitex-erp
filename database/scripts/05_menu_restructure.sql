-- ============================================================
-- 05_menu_restructure.sql
-- Full menu reset based on business module structure
-- Run AFTER 03_admin_masters_migration.sql
-- ============================================================

BEGIN;

-- Clear all existing menu data (CASCADE drops role_menu_mapping rows too)
TRUNCATE menu_master CASCADE;

-- ============================================================
-- LEVEL 1 — Parent Modules
-- ============================================================
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level) VALUES
(1,  NULL, 'DASHBOARD',       'Dashboard',             '/dashboard', 'HomeIcon',        1,  1),
(2,  NULL, 'MASTER_MGMT',     'Master Management',     NULL,         'CircleStackIcon', 2,  1),
(3,  NULL, 'PURCHASE_MGMT',   'Purchase Management',   NULL,         'TruckIcon',       3,  1),
(4,  NULL, 'INVENTORY_MGMT',  'Inventory Management',  NULL,         'CubeIcon',        4,  1),
(5,  NULL, 'PRODUCTION_MGMT', 'Production Management', NULL,         'FactoryIcon',     5,  1),
(6,  NULL, 'QUALITY_CTRL',    'Quality Control (QC)',  NULL,         'ShieldCheckIcon', 6,  1),
(7,  NULL, 'ORDER_MGMT',      'Order Management',      NULL,         'ShoppingBagIcon', 7,  1),
(8,  NULL, 'INTEGRATION',     'Integration',           NULL,         'LinkIcon',        8,  1),
(9,  NULL, 'REPORTS_DASH',    'Reports & Dashboards',  NULL,         'ChartBarIcon',    9,  1),
(10, NULL, 'SYSTEM_ADMIN',    'System admin',          NULL,         'Cog6ToothIcon',   10, 1),
(11, NULL, 'OTHERS',          'Others',                NULL,         'FolderIcon',      11, 1);

-- ============================================================
-- LEVEL 2 — Master Management (parent_id = 2)
-- ============================================================
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level) VALUES
(21, 2, 'MM_LOOKUP',      'Lookup Master',               '/master-mgmt/lookup',           'ListBulletIcon',    1,  2),
(22, 2, 'MM_FG_ITEMS',    'Finished goods Items',        '/master-mgmt/finished-goods',   'GemIcon',           2,  2),
(24, 2, 'MM_COMP_ITEMS',  'Components Items',            '/master-mgmt/components',       'CubeIcon',          3,  2),
(26, 2, 'MM_STONE_ITEMS', 'Stone Items',                 '/master-mgmt/stone-items',      'SparklesIcon',      4,  2),
(27, 2, 'MM_FG_BOM',      'Bill of Materials(FG BOM)',   '/master-mgmt/fg-bom',           'ClipboardListIcon', 5,  2),
(37, 2, 'MM_SFG_BOM',     'Bill of Materials(SFG BOM)',  '/master-mgmt/sfg-bom',          'ClipboardListIcon', 6,  2),
(28, 2, 'MM_SUPPLIER',    'Supplier Master',             '/master-mgmt/supplier',         'UserGroupIcon',     7,  2),
(29, 2, 'MM_SUPP_RATE',   'Supplier Rate Contract',      '/master-mgmt/supplier-rate',    'TagIcon',           8,  2),
(30, 2, 'MM_CUSTOMER',    'Customer Master',             '/master-mgmt/customer',         'UserGroupIcon',     9,  2),
(31, 2, 'MM_CUST_PRICE',  'Customer Price Master',       '/master-mgmt/customer-price',   'TagIcon',           10, 2),
(32, 2, 'MM_PROD_DEPT',   'Production Departments',      '/master-mgmt/production-depts', 'FolderIcon',        11, 2),
(33, 2, 'MM_CAPACITY',    'Capacity Master',             '/master-mgmt/capacity',         'ChartBarIcon',      12, 2),
(34, 2, 'MM_OPERATIONS',  'Operations',                  '/master-mgmt/operations',       'Cog6ToothIcon',     13, 2),
(35, 2, 'MM_WORK_DEF',    'Work Definition',             '/master-mgmt/work-definition',  'ListBulletIcon',    14, 2),
(36, 2, 'MM_MIN_MAX',     'Min Max Planning',            '/master-mgmt/min-max-planning', 'ChartBarIcon',      15, 2);

-- ============================================================
-- LEVEL 2 — Purchase Management (parent_id = 3)
-- ============================================================
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level) VALUES
(41, 3, 'PM_REQUISITIONS', 'Purchase requisitions', '/purchase-mgmt/requisitions',      'ClipboardListIcon', 1, 2),
(42, 3, 'PM_ORDERS',       'Purchase orders',       '/purchase-mgmt/orders',             'TruckIcon',         2, 2),
(43, 3, 'PM_BLANKET',      'Blanket Agreements',    '/purchase-mgmt/blanket-agreements', 'FolderIcon',        3, 2);

-- ============================================================
-- LEVEL 2 — Inventory Management (parent_id = 4)
-- ============================================================
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level) VALUES
(51, 4, 'IM_ON_HAND', 'On Hand Stock',  '/inventory-mgmt/on-hand',  'CubeIcon',        1, 2),
(52, 4, 'IM_COSTING', 'Costing Module', '/inventory-mgmt/costing',  'CircleStackIcon', 2, 2);

-- ============================================================
-- LEVEL 2 — Production Management (parent_id = 5)
-- ============================================================
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level) VALUES
(61, 5, 'PROD_SCHED',   'Scheduling',         '/production/scheduling',    'CalendarIcon',  1, 2),
(62, 5, 'PROD_RESCHED', 'Re-scheduling',      '/production/re-scheduling', 'RefreshCwIcon', 2, 2),
(63, 5, 'PROD_PROCESS', 'Production process', '/production/process',       'FactoryIcon',   3, 2);

-- ============================================================
-- LEVEL 2 — Quality Control (parent_id = 6)
-- ============================================================
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level) VALUES
(71, 6, 'QC_INCOMING',     'Incoming',     '/quality/incoming',     'ShieldCheckIcon', 1, 2),
(72, 6, 'QC_IN_PROCESS',   'In-Process',   '/quality/in-process',   'ShieldCheckIcon', 2, 2),
(73, 6, 'QC_PRE_DISPATCH', 'Pre-Dispatch', '/quality/pre-dispatch', 'TruckIcon',       3, 2);

-- ============================================================
-- LEVEL 2 — Order Management (parent_id = 7)
-- ============================================================
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level) VALUES
(81, 7, 'ORD_SALES',      'Sales Order',      '/order-mgmt/sales-order', 'ShoppingBagIcon', 1, 2),
(82, 7, 'ORD_FULFILMENT', 'Order fulfilment', '/order-mgmt/fulfilment',  'ShoppingBagIcon', 2, 2);

-- ============================================================
-- LEVEL 2 — Integration (parent_id = 8)
-- ============================================================
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level) VALUES
(91, 8, 'INT_AP',       'AP Integration',  '/integration/ap',       'LinkIcon',      1, 2),
(92, 8, 'INT_AR',       'AR Integration',  '/integration/ar',       'LinkIcon',      2, 2),
(93, 8, 'INT_CUSTOMER', 'Customer Master', '/integration/customer', 'UserGroupIcon', 3, 2),
(94, 8, 'INT_VENDOR',   'Vendor Master',   '/integration/vendor',   'UserGroupIcon', 4, 2),
(95, 8, 'INT_PORTAL',   'Customer Portal', '/integration/portal',   'GlobeIcon',     5, 2);

-- ============================================================
-- LEVEL 2 — Reports & Dashboards (parent_id = 9)
-- ============================================================
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level) VALUES
(101, 9, 'RPT_SALES',      'Sales',       '/reports-dash/sales',      'ChartBarIcon', 1, 2),
(102, 9, 'RPT_PURCHASE',   'Purchase',    '/reports-dash/purchase',   'ChartBarIcon', 2, 2),
(103, 9, 'RPT_PRODUCTION', 'Production',  '/reports-dash/production', 'ChartBarIcon', 3, 2),
(104, 9, 'RPT_INVENTORY',  'Inventory',   '/reports-dash/inventory',  'ChartBarIcon', 4, 2);

-- ============================================================
-- LEVEL 2 — System admin (parent_id = 10)
-- ============================================================
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level) VALUES
(111, 10, 'SA_USER_MASTER', 'User Master',            '/settings/users',      'UsersIcon',       1, 2),
(112, 10, 'SA_ROLES_RESP',  'Roles & Responsibility', '/settings/roles',      'ShieldCheckIcon', 2, 2),
(113, 10, 'SA_USER_ROLE',   'User-Role Assignment',   '/settings/user-roles', 'UsersIcon',       3, 2);

-- ============================================================
-- LEVEL 2 — Others (parent_id = 11) — all existing working pages
-- ============================================================
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level) VALUES
(121, 11, 'OTH_PARTY',       'Party Master',      '/masters/party',          'UserGroupIcon',   1,  2),
(122, 11, 'OTH_PRODUCT',     'Product Master',    '/masters/product',         'TagIcon',         2,  2),
(123, 11, 'OTH_METAL',       'Metal Master',      '/masters/metal',           'BeakerIcon',      3,  2),
(124, 11, 'OTH_CATEGORY',    'Category Master',   '/masters/category',        'FolderIcon',      4,  2),
(125, 11, 'OTH_LOOKUP',      'Lookup Master',     '/masters/lookup',           'ListBulletIcon',  5,  2),
(126, 11, 'OTH_STOCK_IN',    'Stock Entry',       '/inventory/stock-entry',   'CubeIcon',        6,  2),
(127, 11, 'OTH_STOCK_LED',   'Stock Ledger',      '/inventory/stock-ledger',  'CircleStackIcon', 7,  2),
(128, 11, 'OTH_STOCK_RPT',   'Stock Report',      '/inventory/stock-report',  'ChartBarIcon',    8,  2),
(129, 11, 'OTH_SALES_ORD',   'Sales Order',       '/sales/orders',            'ShoppingBagIcon', 9,  2),
(130, 11, 'OTH_SALES_INV',   'Sales Invoice',     '/sales/invoice',           'TagIcon',         10, 2),
(131, 11, 'OTH_SALES_RET',   'Sales Return',      '/sales/return',            'TagIcon',         11, 2),
(132, 11, 'OTH_PURCH_ORD',   'Purchase Order',    '/purchase/orders',         'TruckIcon',       12, 2),
(133, 11, 'OTH_PURCH_INV',   'Purchase Invoice',  '/purchase/invoice',        'TagIcon',         13, 2),
(134, 11, 'OTH_PAYMENT',     'Payment Entry',     '/accounts/payment',        'BanknotesIcon',   14, 2),
(135, 11, 'OTH_RECEIPT',     'Receipt Entry',     '/accounts/receipt',        'BanknotesIcon',   15, 2),
(136, 11, 'OTH_LEDGER',      'Ledger Report',     '/accounts/ledger',         'CircleStackIcon', 16, 2),
(137, 11, 'OTH_RPT_SALES',   'Sales Report',      '/reports/sales',           'ChartBarIcon',    17, 2),
(138, 11, 'OTH_RPT_PURCH',   'Purchase Report',   '/reports/purchase',        'ChartBarIcon',    18, 2),
(139, 11, 'OTH_STOCK_ANAL',  'Stock Analysis',    '/reports/stock',           'ChartBarIcon',    19, 2),
(140, 11, 'OTH_SYS_CONF',    'System Config',     '/settings/config',         'Cog6ToothIcon',   20, 2),
(141, 11, 'OTH_MENU_MSTR',   'Menu Master',       '/settings/menus',          'ListBulletIcon',  21, 2),
(142, 11, 'OTH_PERM_MSTR',   'Permission Master', '/settings/permissions',    'ShieldCheckIcon', 22, 2),
(143, 11, 'OTH_MAIL_CONF',   'Mail Config',       '/settings/mail-config',    'EnvelopeIcon',    23, 2);

-- Advance sequence past our explicit IDs
SELECT setval('menu_master_id_seq', 200);

-- ============================================================
-- ROLE PERMISSIONS
-- ============================================================

-- Admin (role_id = 1) — full access to everything
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT 1, id, TRUE, TRUE, TRUE, TRUE FROM menu_master
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- Manager (role_id = 2) — full CRUD except system admin items
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT 2, id, TRUE, TRUE, TRUE, FALSE FROM menu_master
WHERE menu_code NOT IN (
  'SYSTEM_ADMIN', 'SA_USER_MASTER', 'SA_ROLES_RESP', 'SA_USER_ROLE',
  'OTH_SYS_CONF', 'OTH_MENU_MSTR', 'OTH_PERM_MSTR', 'OTH_MAIL_CONF'
)
ON CONFLICT (role_id, menu_id) DO NOTHING;

COMMIT;
