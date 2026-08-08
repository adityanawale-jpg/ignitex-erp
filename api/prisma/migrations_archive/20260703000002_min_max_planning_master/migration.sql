-- Migration 102: Min/Max Planning Master: table + project_config queries
-- Menu MM_MIN_MAX (id=36) already exists — no menu insert needed.

CREATE TABLE IF NOT EXISTS min_max_planning_master (
    id                   SERIAL PRIMARY KEY,
    itemtype             VARCHAR(50)  NOT NULL,           -- FG_ITEM_TYPE lookup: FINDING/STONE/METAL/COMPONENT
    sku_code             VARCHAR(300) NOT NULL,            -- code returned by /fg-bom/lov/:type
    min_quantity         NUMERIC(12,4) DEFAULT 0,
    max_quantity         NUMERIC(12,4) DEFAULT 0,
    moq_quantity         NUMERIC(12,4) DEFAULT 0,
    min_weight           NUMERIC(12,4) DEFAULT 0,
    max_weight           NUMERIC(12,4) DEFAULT 0,
    moq_weight           NUMERIC(12,4) DEFAULT 0,
    order_base           VARCHAR(20)  NOT NULL DEFAULT 'QUANTITY',  -- 'QUANTITY' | 'WEIGHT'
    remarks              VARCHAR(500),
    is_active            BOOLEAN   DEFAULT TRUE,
    deactivation_reason  VARCHAR(500),
    deactivated_at       TIMESTAMP,
    created_by           INT,
    updated_by           INT,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_min_max_itemtype_sku UNIQUE (itemtype, sku_code)
);

CREATE INDEX IF NOT EXISTS idx_min_max_itemtype ON min_max_planning_master(itemtype);
CREATE INDEX IF NOT EXISTS idx_min_max_sku      ON min_max_planning_master(sku_code);
CREATE INDEX IF NOT EXISTS idx_min_max_active   ON min_max_planning_master(is_active);

INSERT INTO project_config (key_code, config_type, description, key_value) VALUES

('min_max_list_select', 'query', 'Min/Max planning list — SELECT + FROM (controller appends WHERE/ORDER/LIMIT)',
'SELECT id, itemtype, sku_code,
       min_quantity, max_quantity, moq_quantity,
       min_weight, max_weight, moq_weight,
       order_base, remarks, is_active, created_at, updated_at
FROM   min_max_planning_master'),

('min_max_list_count', 'query', 'Min/Max planning list — COUNT + FROM (controller appends WHERE)',
'SELECT COUNT(*) AS total FROM min_max_planning_master'),

('min_max_stats', 'query', 'Min/Max planning active/inactive counts',
'SELECT
  SUM(CASE WHEN is_active = TRUE  THEN 1 ELSE 0 END) AS active,
  SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactive
FROM min_max_planning_master'),

('min_max_create', 'query', 'Insert new min/max planning row',
'INSERT INTO min_max_planning_master
  (itemtype, sku_code, min_quantity, max_quantity, moq_quantity,
   min_weight, max_weight, moq_weight, order_base, remarks,
   is_active, created_by, created_at, updated_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE,$11,NOW(),NOW())
RETURNING id, sku_code'),

('min_max_update', 'query', 'Update min/max planning row',
'UPDATE min_max_planning_master
SET itemtype = $1, sku_code = $2,
    min_quantity = $3, max_quantity = $4, moq_quantity = $5,
    min_weight = $6, max_weight = $7, moq_weight = $8,
    order_base = $9, remarks = $10,
    updated_by = $11, updated_at = NOW()
WHERE id = $12
RETURNING id, sku_code'),

('min_max_toggle', 'query', 'Toggle min/max planning active/inactive status',
'UPDATE min_max_planning_master
SET is_active           = NOT is_active,
    deactivation_reason = CASE WHEN is_active THEN $2 ELSE NULL END,
    deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
    updated_at          = NOW()
WHERE id = $1
RETURNING id, is_active, sku_code')

ON CONFLICT (key_code) DO NOTHING;
