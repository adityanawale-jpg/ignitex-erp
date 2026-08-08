-- Migration 104: Supplier Rate Contract Master: table + project_config queries
-- Menu MM_SUPP_RATE (id=29) already exists — no menu insert needed.

CREATE TABLE IF NOT EXISTS supplier_rate_contract (
    id                   SERIAL PRIMARY KEY,
    vendor_id            INT NOT NULL REFERENCES supplier_master(id),
    itemtype             VARCHAR(50)  NOT NULL,           -- FG_ITEM_TYPE lookup: FINDING/STONE/METAL/COMPONENT
    sku_code             VARCHAR(300) NOT NULL,           -- code returned by /fg-bom/lov/:type
    rate_basis           VARCHAR(20)  NOT NULL DEFAULT 'PER_GM',   -- 'PER_GM' | 'PER_PC'
    rate_type            VARCHAR(20)  NOT NULL DEFAULT 'AMOUNT',   -- 'AMOUNT' | 'PERCENTAGE'
    rate_value           NUMERIC(10,2) NOT NULL DEFAULT 0,
    uom                  VARCHAR(10)  NOT NULL DEFAULT 'GMS',      -- 'GMS' | 'CTS'
    remarks              VARCHAR(500),
    is_active            BOOLEAN   DEFAULT TRUE,
    deactivation_reason  VARCHAR(500),
    deactivated_at       TIMESTAMP,
    created_by           INT,
    updated_by           INT,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_supp_rate_vendor_item_sku UNIQUE (vendor_id, itemtype, sku_code)
);

CREATE INDEX IF NOT EXISTS idx_supp_rate_vendor   ON supplier_rate_contract(vendor_id);
CREATE INDEX IF NOT EXISTS idx_supp_rate_itemtype ON supplier_rate_contract(itemtype);
CREATE INDEX IF NOT EXISTS idx_supp_rate_sku      ON supplier_rate_contract(sku_code);
CREATE INDEX IF NOT EXISTS idx_supp_rate_active   ON supplier_rate_contract(is_active);

INSERT INTO project_config (key_code, config_type, description, key_value) VALUES

('supp_rate_list_select', 'query', 'Supplier rate contract list — SELECT + FROM (controller appends WHERE/ORDER/LIMIT)',
'SELECT src.id, src.vendor_id, sm.vendor_code, sm.vendor_company_name,
       src.itemtype, src.sku_code, src.rate_basis, src.rate_type, src.rate_value, src.uom,
       src.remarks, src.is_active, src.created_at, src.updated_at
FROM   supplier_rate_contract src
JOIN   supplier_master sm ON sm.id = src.vendor_id'),

('supp_rate_list_count', 'query', 'Supplier rate contract list — COUNT + FROM (controller appends WHERE)',
'SELECT COUNT(*) AS total
FROM   supplier_rate_contract src
JOIN   supplier_master sm ON sm.id = src.vendor_id'),

('supp_rate_stats', 'query', 'Supplier rate contract active/inactive counts',
'SELECT
  SUM(CASE WHEN is_active = TRUE  THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive
FROM supplier_rate_contract'),

('supp_rate_create', 'query', 'Insert new supplier rate contract row',
'INSERT INTO supplier_rate_contract
  (vendor_id, itemtype, sku_code, rate_basis, rate_type, rate_value, uom, remarks,
   is_active, created_by, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,$9,NOW(),NOW())
RETURNING id, sku_code'),

('supp_rate_update', 'query', 'Update supplier rate contract row',
'UPDATE supplier_rate_contract
SET vendor_id = $1, itemtype = $2, sku_code = $3,
    rate_basis = $4, rate_type = $5, rate_value = $6, uom = $7, remarks = $8,
    updated_by = $9, updated_at = NOW()
WHERE id = $10
RETURNING id, sku_code'),

('supp_rate_toggle', 'query', 'Toggle supplier rate contract active/inactive status',
'UPDATE supplier_rate_contract
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, sku_code')

ON CONFLICT (key_code) DO NOTHING;
