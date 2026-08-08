-- ============================================================
-- 106_customer_price_master.sql
-- Customer Price Master: Metal + Stone tables + project_config queries + lookup seeds
-- Menu MM_CUST_PRICE (id=31) already exists — no menu insert needed.
-- Run after 105_inventory_structure_master.sql
-- ============================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════
-- 1. CUSTOMER PRICE MASTER — METAL TABLE
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS customer_price_master_metal (
    id                     SERIAL PRIMARY KEY,
    customer_id            INT NOT NULL REFERENCES customer_master(id),
    sales_group_code       VARCHAR(50)  NOT NULL,             -- GROUP_SALES lookup
    itemtype               VARCHAR(50)  NOT NULL,             -- FG_ITEM_TYPE lookup: FINDING/STONE/METAL/COMPONENT
    sku_code                VARCHAR(300) NOT NULL,             -- code returned by /fg-bom/lov/:type, or 'ALL'
    karatage               VARCHAR(50),                       -- PURITY_KARAT lookup
    rate_basis              VARCHAR(20)  NOT NULL DEFAULT 'PER_GM',  -- 'PER_GM' | 'PER_PC'
    rate_type                VARCHAR(20)  NOT NULL DEFAULT 'AMOUNT',  -- 'AMOUNT' | 'PERCENTAGE'
    rate_value              NUMERIC(10,2) NOT NULL DEFAULT 0,
    uom                     VARCHAR(10)  NOT NULL DEFAULT 'GMS',     -- 'GMS' | 'CTS'
    rhodium_perc            NUMERIC(5,2) NOT NULL DEFAULT 0,
    tricolor_rhodium_perc   NUMERIC(5,2) NOT NULL DEFAULT 0,
    lobster_perc            NUMERIC(5,2) NOT NULL DEFAULT 0,
    silky_rope_perc         NUMERIC(5,2) NOT NULL DEFAULT 0,
    hallmark_amt            NUMERIC(10,2) NOT NULL DEFAULT 0,
    remarks                 VARCHAR(500),
    is_active               BOOLEAN   DEFAULT TRUE,
    deactivation_reason     VARCHAR(500),
    deactivated_at          TIMESTAMP,
    created_by              INT,
    updated_by              INT,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cust_price_metal_cust_item_sku_karat UNIQUE (customer_id, itemtype, sku_code, karatage)
);

CREATE INDEX IF NOT EXISTS idx_cust_price_metal_customer ON customer_price_master_metal(customer_id);
CREATE INDEX IF NOT EXISTS idx_cust_price_metal_itemtype ON customer_price_master_metal(itemtype);
CREATE INDEX IF NOT EXISTS idx_cust_price_metal_sku      ON customer_price_master_metal(sku_code);
CREATE INDEX IF NOT EXISTS idx_cust_price_metal_active   ON customer_price_master_metal(is_active);

-- ══════════════════════════════════════════════════════════════
-- 2. CUSTOMER PRICE MASTER — STONE TABLE
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS customer_price_master_stone (
    id                   SERIAL PRIMARY KEY,
    customer_id          INT NOT NULL REFERENCES customer_master(id),
    stone_name           VARCHAR(50)  NOT NULL,             -- STONE_TYPE lookup
    stone_code           VARCHAR(300) NOT NULL DEFAULT 'ALL', -- stone_item_master.stn_code, or 'ALL'
    rate_basis           VARCHAR(20)  NOT NULL DEFAULT 'PER_GM',  -- 'PER_GM' | 'PER_PC'
    rate_type             VARCHAR(20)  NOT NULL DEFAULT 'AMOUNT',  -- 'AMOUNT' | 'PERCENTAGE'
    rate_value           NUMERIC(10,2) NOT NULL DEFAULT 0,
    uom                  VARCHAR(10)  NOT NULL DEFAULT 'CTS',     -- 'GMS' | 'CTS'
    remarks              VARCHAR(500),
    is_active            BOOLEAN   DEFAULT TRUE,
    deactivation_reason  VARCHAR(500),
    deactivated_at       TIMESTAMP,
    created_by           INT,
    updated_by           INT,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cust_price_stone_cust_name_code UNIQUE (customer_id, stone_name, stone_code)
);

CREATE INDEX IF NOT EXISTS idx_cust_price_stone_customer ON customer_price_master_stone(customer_id);
CREATE INDEX IF NOT EXISTS idx_cust_price_stone_name     ON customer_price_master_stone(stone_name);
CREATE INDEX IF NOT EXISTS idx_cust_price_stone_active   ON customer_price_master_stone(is_active);

-- ══════════════════════════════════════════════════════════════
-- 3. project_config QUERY SEEDS — METAL
-- ══════════════════════════════════════════════════════════════
INSERT INTO project_config (key_code, config_type, description, key_value) VALUES

('cust_price_metal_list_select', 'query', 'Customer price master (metal) list — SELECT + FROM (controller appends WHERE/ORDER/LIMIT)',
'SELECT cpm.id, cpm.customer_id, cm.customer_code, cm.customer_company_name,
       cpm.sales_group_code, cpm.itemtype, cpm.sku_code, cpm.karatage,
       cpm.rate_basis, cpm.rate_type, cpm.rate_value, cpm.uom,
       cpm.rhodium_perc, cpm.tricolor_rhodium_perc, cpm.lobster_perc, cpm.silky_rope_perc, cpm.hallmark_amt,
       cpm.remarks, cpm.is_active, cpm.created_at, cpm.updated_at
FROM   customer_price_master_metal cpm
JOIN   customer_master cm ON cm.id = cpm.customer_id'),

('cust_price_metal_list_count', 'query', 'Customer price master (metal) list — COUNT + FROM (controller appends WHERE)',
'SELECT COUNT(*) AS total
FROM   customer_price_master_metal cpm
JOIN   customer_master cm ON cm.id = cpm.customer_id'),

('cust_price_metal_stats', 'query', 'Customer price master (metal) active/inactive counts',
'SELECT
  SUM(CASE WHEN is_active = TRUE  THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive
FROM customer_price_master_metal'),

('cust_price_metal_create', 'query', 'Insert new customer price master (metal) row',
'INSERT INTO customer_price_master_metal
  (customer_id, sales_group_code, itemtype, sku_code, karatage,
   rate_basis, rate_type, rate_value, uom,
   rhodium_perc, tricolor_rhodium_perc, lobster_perc, silky_rope_perc, hallmark_amt,
   remarks, is_active, created_by, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,TRUE,$16,NOW(),NOW())
RETURNING id, sku_code'),

('cust_price_metal_update', 'query', 'Update customer price master (metal) row',
'UPDATE customer_price_master_metal
SET customer_id = $1, sales_group_code = $2, itemtype = $3, sku_code = $4, karatage = $5,
    rate_basis = $6, rate_type = $7, rate_value = $8, uom = $9,
    rhodium_perc = $10, tricolor_rhodium_perc = $11, lobster_perc = $12, silky_rope_perc = $13, hallmark_amt = $14,
    remarks = $15,
    updated_by = $16, updated_at = NOW()
WHERE id = $17
RETURNING id, sku_code'),

('cust_price_metal_toggle', 'query', 'Toggle customer price master (metal) active/inactive status',
'UPDATE customer_price_master_metal
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, sku_code')

ON CONFLICT (key_code) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 4. project_config QUERY SEEDS — STONE
-- ══════════════════════════════════════════════════════════════
INSERT INTO project_config (key_code, config_type, description, key_value) VALUES

('cust_price_stone_list_select', 'query', 'Customer price master (stone) list — SELECT + FROM (controller appends WHERE/ORDER/LIMIT)',
'SELECT cps.id, cps.customer_id, cm.customer_code, cm.customer_company_name,
       cps.stone_name, cps.stone_code, cps.rate_basis, cps.rate_type, cps.rate_value, cps.uom,
       cps.remarks, cps.is_active, cps.created_at, cps.updated_at
FROM   customer_price_master_stone cps
JOIN   customer_master cm ON cm.id = cps.customer_id'),

('cust_price_stone_list_count', 'query', 'Customer price master (stone) list — COUNT + FROM (controller appends WHERE)',
'SELECT COUNT(*) AS total
FROM   customer_price_master_stone cps
JOIN   customer_master cm ON cm.id = cps.customer_id'),

('cust_price_stone_stats', 'query', 'Customer price master (stone) active/inactive counts',
'SELECT
  SUM(CASE WHEN is_active = TRUE  THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive
FROM customer_price_master_stone'),

('cust_price_stone_create', 'query', 'Insert new customer price master (stone) row',
'INSERT INTO customer_price_master_stone
  (customer_id, stone_name, stone_code, rate_basis, rate_type, rate_value, uom, remarks,
   is_active, created_by, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,$9,NOW(),NOW())
RETURNING id, stone_code'),

('cust_price_stone_update', 'query', 'Update customer price master (stone) row',
'UPDATE customer_price_master_stone
SET customer_id = $1, stone_name = $2, stone_code = $3,
    rate_basis = $4, rate_type = $5, rate_value = $6, uom = $7, remarks = $8,
    updated_by = $9, updated_at = NOW()
WHERE id = $10
RETURNING id, stone_code'),

('cust_price_stone_toggle', 'query', 'Toggle customer price master (stone) active/inactive status',
'UPDATE customer_price_master_stone
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, stone_code')

ON CONFLICT (key_code) DO NOTHING;


COMMIT;
