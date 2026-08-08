-- ============================================================
-- IGNITEX.AI ERP - Database Initialization Script
-- Version: 2.0.0
-- ============================================================

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ROLE MASTER
-- ============================================================
CREATE TABLE IF NOT EXISTS role_master (
    id SERIAL PRIMARY KEY,
    role_code VARCHAR(50) UNIQUE NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- USER MASTER
-- ============================================================
CREATE TABLE IF NOT EXISTS user_master (
    user_id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50),
    emp_email VARCHAR(255) UNIQUE,
    mobile_number VARCHAR(20),
    profile_image VARCHAR(500),
    department_id VARCHAR(50),
    designation VARCHAR(100),
    manager_id INT REFERENCES user_master(user_id),
    user_status BOOLEAN DEFAULT TRUE,
    jwt_token TEXT,
    jwt_token_update TIMESTAMPTZ,
    start_date DATE,
    expiry_date DATE,
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    language VARCHAR(10) DEFAULT 'en',
    last_login_at TIMESTAMPTZ,
    login_ip VARCHAR(50),
    created_by INT REFERENCES user_master(user_id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES user_master(user_id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- MENU MASTER
-- ============================================================
CREATE TABLE IF NOT EXISTS menu_master (
    id SERIAL PRIMARY KEY,
    parent_id INT REFERENCES menu_master(id),
    menu_code VARCHAR(100) UNIQUE NOT NULL,
    menu_name VARCHAR(200) NOT NULL,
    menu_url VARCHAR(500),
    menu_icon VARCHAR(100),
    menu_order INT DEFAULT 0,
    menu_level INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ROLE MENU MAPPING
-- ============================================================
CREATE TABLE IF NOT EXISTS role_menu_mapping (
    id SERIAL PRIMARY KEY,
    role_id INT REFERENCES role_master(id),
    menu_id INT REFERENCES menu_master(id),
    can_view BOOLEAN DEFAULT TRUE,
    can_create BOOLEAN DEFAULT FALSE,
    can_update BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(role_id, menu_id)
);

-- ============================================================
-- PROJECT CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS project_config (
    id SERIAL PRIMARY KEY,
    key_code VARCHAR(100) UNIQUE NOT NULL,
    key_value TEXT NOT NULL,
    description TEXT,
    config_type VARCHAR(50) DEFAULT 'query',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- MASTER LOOKUP
-- ============================================================
CREATE TABLE IF NOT EXISTS master_lookup (
    id SERIAL PRIMARY KEY,
    lookup_type VARCHAR(100) NOT NULL,
    lookup_code VARCHAR(100) NOT NULL,
    lookup_name VARCHAR(200) NOT NULL,
    lookup_value VARCHAR(500),
    display_order INT DEFAULT 0,
    parent_code VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lookup_type, lookup_code)
);

-- ============================================================
-- LOGIN HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS login_history (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES user_master(user_id),
    employee_id VARCHAR(20),
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    logout_time TIMESTAMP,
    ip_address VARCHAR(50),
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'success',
    remarks VARCHAR(500)
);

-- ============================================================
-- NOTIFICATION MASTER
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_master (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES user_master(user_id),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- JEWELLERY SPECIFIC TABLES
-- ============================================================

-- Party Master (Customer/Supplier)
CREATE TABLE IF NOT EXISTS party_master (
    id SERIAL PRIMARY KEY,
    party_code VARCHAR(50) UNIQUE NOT NULL,
    party_name VARCHAR(200) NOT NULL,
    party_type VARCHAR(20) NOT NULL, -- CUSTOMER, SUPPLIER, BOTH
    phone VARCHAR(20),
    email VARCHAR(200),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    gstin VARCHAR(20),
    pan VARCHAR(20),
    credit_limit DECIMAL(15,2) DEFAULT 0,
    opening_balance DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Metal Master
CREATE TABLE IF NOT EXISTS metal_master (
    id SERIAL PRIMARY KEY,
    metal_code VARCHAR(50) UNIQUE NOT NULL,
    metal_name VARCHAR(100) NOT NULL,
    purity_code VARCHAR(20),
    purity_percentage DECIMAL(5,2),
    current_rate DECIMAL(15,4),
    unit VARCHAR(20) DEFAULT 'gram',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Category Master
CREATE TABLE IF NOT EXISTS category_master (
    id SERIAL PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(200) NOT NULL,
    parent_id INT REFERENCES category_master(id),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Master
CREATE TABLE IF NOT EXISTS product_master (
    id SERIAL PRIMARY KEY,
    product_code VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    category_id INT REFERENCES category_master(id),
    metal_id INT REFERENCES metal_master(id),
    gross_weight DECIMAL(10,4),
    net_weight DECIMAL(10,4),
    stone_weight DECIMAL(10,4),
    making_charge DECIMAL(10,2),
    wastage_percentage DECIMAL(5,2),
    hsn_code VARCHAR(20),
    description TEXT,
    image_url VARCHAR(500),
    barcode VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Order
CREATE TABLE IF NOT EXISTS sales_order (
    id SERIAL PRIMARY KEY,
    order_no VARCHAR(50) UNIQUE NOT NULL,
    order_date DATE NOT NULL,
    party_id INT REFERENCES party_master(id),
    total_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    net_amount DECIMAL(15,2) DEFAULT 0,
    advance_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PENDING',
    remarks TEXT,
    created_by INT REFERENCES user_master(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Order Items
CREATE TABLE IF NOT EXISTS sales_order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES sales_order(id),
    product_id INT REFERENCES product_master(id),
    quantity INT DEFAULT 1,
    gross_weight DECIMAL(10,4),
    net_weight DECIMAL(10,4),
    rate DECIMAL(15,4),
    making_charge DECIMAL(10,2),
    amount DECIMAL(15,2),
    remarks TEXT
);

-- Purchase Order
CREATE TABLE IF NOT EXISTS purchase_order (
    id SERIAL PRIMARY KEY,
    order_no VARCHAR(50) UNIQUE NOT NULL,
    order_date DATE NOT NULL,
    party_id INT REFERENCES party_master(id),
    total_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    net_amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PENDING',
    remarks TEXT,
    created_by INT REFERENCES user_master(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Ledger
CREATE TABLE IF NOT EXISTS stock_ledger (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES product_master(id),
    transaction_type VARCHAR(20) NOT NULL,
    transaction_no VARCHAR(50),
    transaction_date DATE NOT NULL,
    in_quantity INT DEFAULT 0,
    out_quantity INT DEFAULT 0,
    in_weight DECIMAL(10,4) DEFAULT 0,
    out_weight DECIMAL(10,4) DEFAULT 0,
    balance_quantity INT DEFAULT 0,
    balance_weight DECIMAL(10,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Insert Roles
INSERT INTO role_master (role_code, role_name, description) VALUES
('ADMIN', 'Administrator', 'Full system access'),
('MANAGER', 'Manager', 'Managerial access'),
('SALES', 'Sales Executive', 'Sales module access'),
('PURCHASE', 'Purchase Executive', 'Purchase module access'),
('ACCOUNTS', 'Accountant', 'Accounts module access')
ON CONFLICT (role_code) DO NOTHING;

-- Insert Admin Users (password: Admin@123)
INSERT INTO user_master (employee_id, password_hash, first_name, last_name, emp_email, user_status) VALUES
('EMP001', '$2b$10$nNh48ihKHGGlYpPeHuyn8uWykZ3x5BPjkjXGpTtqFjzzEgmigkhn6', 'System', 'Administrator', 'admin@ignitex.ai', TRUE),
('EMP002', '$2b$10$nNh48ihKHGGlYpPeHuyn8uWykZ3x5BPjkjXGpTtqFjzzEgmigkhn6', 'Store', 'Manager', 'manager@ignitex.ai', TRUE),
('EMP003', '$2b$10$nNh48ihKHGGlYpPeHuyn8uWykZ3x5BPjkjXGpTtqFjzzEgmigkhn6', 'Sales', 'Executive', 'sales@ignitex.ai', TRUE)
ON CONFLICT (employee_id) DO NOTHING;

-- Insert Menu Structure
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level) VALUES
(1, NULL, 'DASHBOARD', 'Dashboard', '/dashboard', 'HomeIcon', 1, 1),
(2, NULL, 'MASTERS', 'Masters', NULL, 'CircleStackIcon', 2, 1),
(3, NULL, 'INVENTORY', 'Inventory', NULL, 'CubeIcon', 3, 1),
(4, NULL, 'SALES', 'Sales', NULL, 'ShoppingBagIcon', 4, 1),
(5, NULL, 'PURCHASE', 'Purchase', NULL, 'TruckIcon', 5, 1),
(6, NULL, 'ACCOUNTS', 'Accounts', NULL, 'BanknotesIcon', 6, 1),
(7, NULL, 'REPORTS', 'Reports', NULL, 'ChartBarIcon', 7, 1),
(8, NULL, 'SETTINGS', 'Settings', NULL, 'Cog6ToothIcon', 8, 1),
-- Masters Sub Menu
(10, 2, 'PARTY_MASTER', 'Party Master', '/masters/party', 'UserGroupIcon', 1, 2),
(11, 2, 'PRODUCT_MASTER', 'Product Master', '/masters/product', 'TagIcon', 2, 2),
(12, 2, 'METAL_MASTER', 'Metal Master', '/masters/metal', 'BeakerIcon', 3, 2),
(13, 2, 'CATEGORY_MASTER', 'Category Master', '/masters/category', 'FolderIcon', 4, 2),
(14, 2, 'LOOKUP_MASTER', 'Lookup Master', '/masters/lookup', 'ListBulletIcon', 5, 2),
-- Inventory Sub Menu
(20, 3, 'STOCK_ENTRY', 'Stock Entry', '/inventory/stock-entry', 'PlusCircleIcon', 1, 2),
(21, 3, 'STOCK_LEDGER', 'Stock Ledger', '/inventory/stock-ledger', 'BookOpenIcon', 2, 2),
(22, 3, 'STOCK_REPORT', 'Stock Report', '/inventory/stock-report', 'DocumentChartBarIcon', 3, 2),
-- Sales Sub Menu
(30, 4, 'SALES_ORDER', 'Sales Order', '/sales/orders', 'ClipboardDocumentListIcon', 1, 2),
(31, 4, 'SALES_INVOICE', 'Sales Invoice', '/sales/invoice', 'DocumentTextIcon', 2, 2),
(32, 4, 'SALES_RETURN', 'Sales Return', '/sales/return', 'ArrowUturnLeftIcon', 3, 2),
-- Purchase Sub Menu
(40, 5, 'PURCHASE_ORDER', 'Purchase Order', '/purchase/orders', 'ClipboardDocumentListIcon', 1, 2),
(41, 5, 'PURCHASE_INVOICE', 'Purchase Invoice', '/purchase/invoice', 'DocumentTextIcon', 2, 2),
-- Accounts Sub Menu
(50, 6, 'PAYMENT_ENTRY', 'Payment Entry', '/accounts/payment', 'CreditCardIcon', 1, 2),
(51, 6, 'RECEIPT_ENTRY', 'Receipt Entry', '/accounts/receipt', 'BanknotesIcon', 2, 2),
(52, 6, 'LEDGER_REPORT', 'Ledger Report', '/accounts/ledger', 'BookOpenIcon', 3, 2),
-- Reports Sub Menu
(60, 7, 'SALES_REPORT', 'Sales Report', '/reports/sales', 'ChartBarIcon', 1, 2),
(61, 7, 'PURCHASE_REPORT', 'Purchase Report', '/reports/purchase', 'ChartPieIcon', 2, 2),
(62, 7, 'STOCK_ANALYSIS', 'Stock Analysis', '/reports/stock', 'PresentationChartLineIcon', 3, 2),
-- Settings Sub Menu
(70, 8, 'USER_MASTER',   'User Management',      '/settings/users',       'UsersIcon',             1, 2),
(71, 8, 'ROLE_MASTER',   'Role Management',      '/settings/roles',       'ShieldCheckIcon',       2, 2),
(72, 8, 'SYSTEM_CONFIG', 'System Config',        '/settings/config',      'WrenchScrewdriverIcon', 3, 2),
(73, 8, 'MAIL_CONFIG',   'Mail Configuration',   '/settings/mail-config', 'EnvelopeIcon',          4, 2)
ON CONFLICT (menu_code) DO NOTHING;

-- Role Menu Mapping for Admin (all access)
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT 1, id, TRUE, TRUE, TRUE, TRUE FROM menu_master
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- Role Menu Mapping for Manager
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT 2, id, TRUE, TRUE, TRUE, FALSE FROM menu_master WHERE menu_code NOT IN ('USER_MASTER', 'ROLE_MASTER', 'SYSTEM_CONFIG')
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- Insert Project Config (Dynamic Queries)
INSERT INTO project_config (key_code, key_value, description, config_type) VALUES
('login_get', 'SELECT u.user_id, u.employee_id, u.password_hash, u.first_name, u.last_name, u.emp_email, u.mobile_number, u.profile_image, u.user_status FROM user_master u WHERE u.employee_id = :userid AND u.user_status = TRUE', 'Login user fetch query', 'query'),
('user_list_get', 'SELECT u.user_id, u.employee_id, u.first_name, u.last_name, CONCAT(u.first_name, '' '', COALESCE(u.last_name, '''')) AS full_name, u.emp_email, u.mobile_number, u.user_status, u.department_id, u.designation, u.created_at FROM user_master u WHERE u.user_status = TRUE ORDER BY u.first_name, u.last_name', 'Get all active users', 'query'),
('menu_get', 'SELECT m.*, rm.can_view, rm.can_create, rm.can_update, rm.can_delete FROM menu_master m LEFT JOIN role_menu_mapping rm ON m.id = rm.menu_id AND rm.role_id = :role_id WHERE m.is_active = TRUE ORDER BY m.menu_level, m.menu_order', 'Get menus by role', 'query'),
('party_list_get', 'SELECT * FROM party_master WHERE is_active = TRUE ORDER BY party_name', 'Get all active parties', 'query'),
('party_by_id_get', 'SELECT * FROM party_master WHERE id = :id AND is_active = TRUE', 'Get party by ID', 'query'),
('product_list_get', 'SELECT p.*, c.category_name, m.metal_name FROM product_master p LEFT JOIN category_master c ON p.category_id = c.id LEFT JOIN metal_master m ON p.metal_id = m.id WHERE p.is_active = TRUE ORDER BY p.product_name', 'Get all active products', 'query'),
('metal_list_get', 'SELECT * FROM metal_master WHERE is_active = TRUE ORDER BY metal_name', 'Get all metals', 'query'),
('category_list_get', 'SELECT * FROM category_master WHERE is_active = TRUE ORDER BY category_name', 'Get all categories', 'query'),
('lookup_by_type_get', 'SELECT * FROM master_lookup WHERE lookup_type = :lookup_type AND is_active = TRUE ORDER BY display_order', 'Get lookups by type', 'query'),
('notifications_get', 'SELECT * FROM notification_master WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 10', 'Get user notifications', 'query'),
('dashboard_stats_get', 'SELECT (SELECT COUNT(*) FROM party_master WHERE is_active = TRUE) as total_parties, (SELECT COUNT(*) FROM product_master WHERE is_active = TRUE) as total_products, (SELECT COUNT(*) FROM sales_order WHERE DATE(created_at) = CURRENT_DATE) as todays_orders, (SELECT COALESCE(SUM(net_amount),0) FROM sales_order WHERE DATE(created_at) = CURRENT_DATE) as todays_sales', 'Dashboard statistics', 'query'),
('sales_order_list_get', 'SELECT s.*, p.party_name FROM sales_order s LEFT JOIN party_master p ON s.party_id = p.id ORDER BY s.created_at DESC LIMIT 50', 'Get recent sales orders', 'query'),
('login_history_get',  'SELECT lh.*, CONCAT(u.first_name, '' '', COALESCE(u.last_name, '''')) AS full_name FROM login_history lh LEFT JOIN user_master u ON lh.user_id = u.user_id ORDER BY lh.login_time DESC LIMIT 50', 'Get login history', 'query'),
('mail_config_get',    'SELECT key_code, key_value, description FROM project_config WHERE key_code LIKE ''mail_%'' AND is_active = TRUE ORDER BY key_code', 'Get all mail configuration settings', 'query'),
('mail_config_update', 'UPDATE project_config SET key_value = :key_value, updated_at = NOW() WHERE key_code = :key_code', 'Update a single mail configuration key', 'query')
ON CONFLICT (key_code) DO NOTHING;

-- Mail Configuration defaults
INSERT INTO project_config (key_code, key_value, description, config_type) VALUES
('mail_driver',     'smtp',                 'Mail transport driver (smtp / sendmail / log)', 'mail'),
('mail_host',       'smtp.gmail.com',       'SMTP server hostname',                          'mail'),
('mail_port',       '587',                  'SMTP server port',                              'mail'),
('mail_encryption', 'tls',                  'Encryption protocol (none / tls / ssl)',        'mail'),
('mail_auth',       'true',                 'Require SMTP authentication (true / false)',    'mail'),
('mail_username',   '',                     'SMTP authentication username / email',           'mail'),
('mail_password',   '',                     'SMTP authentication password',                  'mail'),
('mail_from_email', 'noreply@ignitex.ai', 'Default From email address',                   'mail'),
('mail_from_name',  'IgniteX.ai ERP',       'Default From display name',                    'mail'),
('mail_reply_to',   '',                     'Reply-To email address (leave blank for From)', 'mail'),
('mail_timeout',    '30',                   'SMTP connection timeout in seconds',            'mail'),
('mail_is_active',  'true',                 'Enable / disable outgoing email (true / false)','mail')
ON CONFLICT (key_code) DO NOTHING;

-- Insert Master Lookup Data
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order) VALUES
('DEPARTMENT', 'IT',       'Information Technology', 1),
('DEPARTMENT', 'SALES',    'Sales',                  2),
('DEPARTMENT', 'PURCHASE', 'Purchase',               3),
('DEPARTMENT', 'ACCOUNTS', 'Accounts',               4),
('DEPARTMENT', 'ADMIN',    'Administration',         5),
('DEPARTMENT', 'HR',       'Human Resources',        6),
('DEPARTMENT', 'DESIGN',   'Design & Production',    7),
('DEPARTMENT', 'STORE',    'Store Operations',       8),
('PARTY_TYPE', 'CUSTOMER', 'Customer', 1),
('PARTY_TYPE', 'SUPPLIER', 'Supplier', 2),
('PARTY_TYPE', 'BOTH', 'Both (Customer & Supplier)', 3),
('METAL_TYPE', 'GOLD', 'Gold', 1),
('METAL_TYPE', 'SILVER', 'Silver', 2),
('METAL_TYPE', 'PLATINUM', 'Platinum', 3),
('METAL_TYPE', 'DIAMOND', 'Diamond', 4),
('PURITY', '24K', '24 Karat (999)', 1),
('PURITY', '22K', '22 Karat (916)', 2),
('PURITY', '18K', '18 Karat (750)', 3),
('PURITY', '14K', '14 Karat (585)', 4),
('ORDER_STATUS', 'PENDING', 'Pending', 1),
('ORDER_STATUS', 'CONFIRMED', 'Confirmed', 2),
('ORDER_STATUS', 'PROCESSING', 'Processing', 3),
('ORDER_STATUS', 'DELIVERED', 'Delivered', 4),
('ORDER_STATUS', 'CANCELLED', 'Cancelled', 5),
('GENDER', 'MALE', 'Male', 1),
('GENDER', 'FEMALE', 'Female', 2),
('GENDER', 'UNISEX', 'Unisex', 3),
('OCCASION', 'WEDDING', 'Wedding', 1),
('OCCASION', 'ENGAGEMENT', 'Engagement', 2),
('OCCASION', 'ANNIVERSARY', 'Anniversary', 3),
('OCCASION', 'CASUAL', 'Casual Wear', 4),
('OCCASION', 'FESTIVAL', 'Festival', 5)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

-- Insert Metal Master Data
INSERT INTO metal_master (metal_code, metal_name, purity_code, purity_percentage, current_rate, unit) VALUES
('GOLD_24K', 'Gold 24K (999)', '24K', 99.9, 6250.00, 'gram'),
('GOLD_22K', 'Gold 22K (916)', '22K', 91.6, 5725.00, 'gram'),
('GOLD_18K', 'Gold 18K (750)', '18K', 75.0, 4688.00, 'gram'),
('SILVER_999', 'Silver 999', '999', 99.9, 75.50, 'gram'),
('PLATINUM_950', 'Platinum 950', '950', 95.0, 3200.00, 'gram')
ON CONFLICT (metal_code) DO NOTHING;

-- Insert Category Data
INSERT INTO category_master (category_code, category_name, description) VALUES
('NECKLACE', 'Necklaces', 'All types of necklaces'),
('RING', 'Rings', 'All types of rings'),
('EARRING', 'Earrings', 'All types of earrings'),
('BRACELET', 'Bracelets', 'All types of bracelets'),
('BANGLE', 'Bangles', 'All types of bangles'),
('PENDANT', 'Pendants', 'All types of pendants'),
('CHAIN', 'Chains', 'All types of chains'),
('ANKLET', 'Anklets', 'All types of anklets')
ON CONFLICT (category_code) DO NOTHING;

-- Insert Sample Notifications
INSERT INTO notification_master (user_id, title, message, notification_type) VALUES
(1, 'Welcome to IgniteX.ai ERP', 'System initialized successfully. Configure your settings to get started.', 'info'),
(1, 'Low Stock Alert', '5 products are running low on stock. Please review inventory.', 'warning'),
(1, 'New Order Received', 'Sales order SO-2026-001 received from Ramesh Jewellers', 'success')
ON CONFLICT DO NOTHING;

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_master_employeeid ON user_master(employee_id);
CREATE INDEX IF NOT EXISTS idx_user_master_token ON user_master(jwt_token);
CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_time ON login_history(login_time);
CREATE INDEX IF NOT EXISTS idx_menu_master_parent ON menu_master(parent_id);
CREATE INDEX IF NOT EXISTS idx_role_menu_role ON role_menu_mapping(role_id);
CREATE INDEX IF NOT EXISTS idx_project_config_key ON project_config(key_code);
CREATE INDEX IF NOT EXISTS idx_master_lookup_type ON master_lookup(lookup_type);
CREATE INDEX IF NOT EXISTS idx_party_master_code ON party_master(party_code);
CREATE INDEX IF NOT EXISTS idx_product_master_code ON product_master(product_code);
CREATE INDEX IF NOT EXISTS idx_sales_order_date ON sales_order(order_date);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_product ON stock_ledger(product_id);

COMMENT ON TABLE user_master IS 'System users / employees with authentication details';
COMMENT ON TABLE menu_master IS 'Application menu hierarchy';
COMMENT ON TABLE project_config IS 'Dynamic query and configuration storage';
COMMENT ON TABLE master_lookup IS 'Common lookup/dropdown data';
