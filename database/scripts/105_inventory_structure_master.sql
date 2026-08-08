-- ============================================================
-- 105_inventory_structure_master.sql
-- Inventory Structure Master: table + project_config queries + menu + lookup seeds
-- New master under Master Management — no existing menu entry.
-- Run after 104_supplier_rate_contract_master.sql
-- ============================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════
-- 1. INVENTORY STRUCTURE TABLE
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS inventory_structure (
    id                   SERIAL PRIMARY KEY,
    inv_bu_code          VARCHAR(50)  NOT NULL,           -- INV_BU lookup
    inv_org_code         VARCHAR(50)  NOT NULL,           -- INV_ORG lookup
    sub_inv_code         VARCHAR(100) NOT NULL,
    sub_inv_name         VARCHAR(200) NOT NULL,
    store_type           VARCHAR(50),                     -- INV_STORE_TYPE lookup
    is_tracks_gold       BOOLEAN   DEFAULT FALSE,
    is_tracks_wt         BOOLEAN   DEFAULT FALSE,
    is_active            BOOLEAN   DEFAULT TRUE,
    deactivation_reason  VARCHAR(500),
    deactivated_at       TIMESTAMP,
    created_by           INT,
    updated_by           INT,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_inv_struct_bu_org_subinv UNIQUE (inv_bu_code, inv_org_code, sub_inv_code)
);

CREATE INDEX IF NOT EXISTS idx_inv_struct_bu     ON inventory_structure(inv_bu_code);
CREATE INDEX IF NOT EXISTS idx_inv_struct_org    ON inventory_structure(inv_org_code);
CREATE INDEX IF NOT EXISTS idx_inv_struct_active ON inventory_structure(is_active);

-- ══════════════════════════════════════════════════════════════
-- 2. project_config QUERY SEEDS
-- ══════════════════════════════════════════════════════════════
INSERT INTO project_config (key_code, config_type, description, key_value) VALUES

('inv_struct_list_select', 'query', 'Inventory structure list — SELECT + FROM (controller appends WHERE/ORDER/LIMIT)',
'SELECT ist.id, ist.inv_bu_code, bu.lookup_name AS bu_name,
       ist.inv_org_code, org.lookup_name AS org_name,
       ist.sub_inv_code, ist.sub_inv_name,
       ist.store_type, st.lookup_name AS store_type_name,
       ist.is_tracks_gold, ist.is_tracks_wt,
       ist.is_active, ist.created_at, ist.updated_at
FROM   inventory_structure ist
LEFT   JOIN master_lookup bu  ON bu.lookup_type  = ''INV_BU''         AND bu.lookup_code  = ist.inv_bu_code
LEFT   JOIN master_lookup org ON org.lookup_type = ''INV_ORG''        AND org.lookup_code = ist.inv_org_code
LEFT   JOIN master_lookup st  ON st.lookup_type  = ''INV_STORE_TYPE'' AND st.lookup_code  = ist.store_type'),

('inv_struct_list_count', 'query', 'Inventory structure list — COUNT + FROM (controller appends WHERE)',
'SELECT COUNT(*) AS total
FROM   inventory_structure ist
LEFT   JOIN master_lookup bu  ON bu.lookup_type  = ''INV_BU''         AND bu.lookup_code  = ist.inv_bu_code
LEFT   JOIN master_lookup org ON org.lookup_type = ''INV_ORG''        AND org.lookup_code = ist.inv_org_code
LEFT   JOIN master_lookup st  ON st.lookup_type  = ''INV_STORE_TYPE'' AND st.lookup_code  = ist.store_type'),

('inv_struct_stats', 'query', 'Inventory structure active/inactive counts',
'SELECT
  SUM(CASE WHEN is_active = TRUE  THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive
FROM inventory_structure'),

('inv_struct_create', 'query', 'Insert new inventory structure row',
'INSERT INTO inventory_structure
  (inv_bu_code, inv_org_code, sub_inv_code, sub_inv_name, store_type,
   is_tracks_gold, is_tracks_wt, is_active, created_by, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,$8,NOW(),NOW())
RETURNING id, sub_inv_code'),

('inv_struct_update', 'query', 'Update inventory structure row',
'UPDATE inventory_structure
SET inv_bu_code = $1, inv_org_code = $2, sub_inv_code = $3, sub_inv_name = $4, store_type = $5,
    is_tracks_gold = $6, is_tracks_wt = $7,
    updated_by = $8, updated_at = NOW()
WHERE id = $9
RETURNING id, sub_inv_code'),

('inv_struct_toggle', 'query', 'Toggle inventory structure active/inactive status',
'UPDATE inventory_structure
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, sub_inv_code')

ON CONFLICT (key_code) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 3. LOOKUP SEEDS  (INV_BU / INV_ORG / INV_STORE_TYPE)
-- ══════════════════════════════════════════════════════════════
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('INV_BU', 'RCL',    'Royal Chain Limited',                       1, TRUE),  
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('INV_ORG',  'RCL-GF', 'Ground Floor - Main Production',            1, TRUE),
  ('INV_ORG',  'RCL-FF', 'First Floor - KIT Marshal/Dispatch',        2, TRUE),
  ('INV_ORG',  'RCL-SF', 'Second Floor - Depot',                      3, TRUE),
  ('INV_ORG',  'RCL-ZB', 'First Floor - Zaveri Bazar - Sales Office', 4, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('INV_STORE_TYPE', 'PRODUCTION',     'Production',      1, TRUE),
  ('INV_STORE_TYPE', 'FINDINGS',       'Findings',        2, TRUE),
  ('INV_STORE_TYPE', 'COMPONENTS',     'Components',      3, TRUE),
  ('INV_STORE_TYPE', 'CONSUMABLE',     'Consumable',      4, TRUE),
  ('INV_STORE_TYPE', 'JOB_WORK',       'Job Work',        5, TRUE),
  ('INV_STORE_TYPE', 'STAGING',        'Staging',         6, TRUE),
  ('INV_STORE_TYPE', 'ADMIN',          'Admin',           7, TRUE),
  ('INV_STORE_TYPE', 'SALES_STAGING',  'Sales Staging',   8, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 4. MENU ENTRY (append after last Master Management item)
-- ══════════════════════════════════════════════════════════════
INSERT INTO menu_master (parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active)
SELECT 2, 'MM_INV_STRUCTURE', 'Inventory Structure', '/master-mgmt/inventory-structure', 'FolderIcon',
       (SELECT COALESCE(MAX(menu_order), 0) + 1 FROM menu_master WHERE parent_id = 2),
       2, TRUE
ON CONFLICT (menu_code) DO NOTHING;

-- Mirror permissions from Stone Items so existing roles get sane defaults
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT src.role_id, mm.id, src.can_view, src.can_create, src.can_update, src.can_delete
FROM   role_menu_mapping src
JOIN   menu_master mm ON mm.menu_code = 'MM_INV_STRUCTURE'
WHERE  src.menu_id = (SELECT id FROM menu_master WHERE menu_code = 'MM_STONE_ITEMS')
ON CONFLICT (role_id, menu_id) DO NOTHING;

COMMIT;
