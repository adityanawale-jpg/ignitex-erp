-- ══════════════════════════════════════════════════════════════
-- 111_sales_order.sql
-- Order Management → Sales Order
--   1. sales_order_hdr / sales_order_lines tables
--   2. Auto order-no trigger (SO-000001, SO-000002, …)
--   3. Lookup seeds: SALES_ORDER_TYPE, CURRENCY
-- ══════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════
-- 1. TABLES
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sales_order_hdr (
    id              SERIAL PRIMARY KEY,
    order_no        VARCHAR(30)  UNIQUE,                        -- auto: SO-000001
    buss_unit_id    VARCHAR(50)  NOT NULL,                      -- INV_BU lookup code
    customer_id     INTEGER      NOT NULL REFERENCES customer_master(id),
    bill_to_address TEXT,
    ship_to_address TEXT,
    customer_po     VARCHAR(100),
    order_type      VARCHAR(50)  NOT NULL DEFAULT 'STANDARD',   -- SALES_ORDER_TYPE lookup
    order_date      DATE         NOT NULL DEFAULT CURRENT_DATE,
    currency_code   VARCHAR(10)  NOT NULL DEFAULT 'INR',        -- CURRENCY lookup
    price_matrix    VARCHAR(100),
    sales_credit    NUMERIC(12,2)          DEFAULT 0,
    order_status    VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',      -- DRAFT | SUBMITTED | CANCELLED
    total_qty       INTEGER                DEFAULT 0,
    total_amount    NUMERIC(14,2)          DEFAULT 0,
    cancel_reason   VARCHAR(500),
    cancelled_at    TIMESTAMP,
    created_by      INTEGER,
    updated_by      INTEGER,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_order_lines (
    id                  SERIAL PRIMARY KEY,
    order_id            INTEGER NOT NULL REFERENCES sales_order_hdr(id) ON DELETE CASCADE,
    line_no             INTEGER NOT NULL DEFAULT 1,
    customer_item       VARCHAR(100),
    item_name           VARCHAR(300),
    item_desc           VARCHAR(500),
    item_qty            INTEGER       NOT NULL DEFAULT 0,
    item_uom            VARCHAR(20),                            -- UOM lookup code
    item_price          NUMERIC(12,2) NOT NULL DEFAULT 0,
    item_amount         NUMERIC(14,2) NOT NULL DEFAULT 0,       -- qty × price (server computed)
    item_status         VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
    supply_warehouse    VARCHAR(100),
    supply_subinventory VARCHAR(100),
    pay_term            VARCHAR(50)            DEFAULT '30 Days',
    requested_date      DATE,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_so_hdr_customer ON sales_order_hdr(customer_id);
CREATE INDEX IF NOT EXISTS idx_so_hdr_status   ON sales_order_hdr(order_status);
CREATE INDEX IF NOT EXISTS idx_so_hdr_date     ON sales_order_hdr(order_date);
CREATE INDEX IF NOT EXISTS idx_so_lines_order  ON sales_order_lines(order_id);

-- ══════════════════════════════════════════════════════════════
-- 2. AUTO-GENERATE order_no TRIGGER  (same pattern as customer_code)
-- ══════════════════════════════════════════════════════════════

CREATE SEQUENCE IF NOT EXISTS sales_order_no_seq START 1;

CREATE OR REPLACE FUNCTION fn_sales_order_gen_no()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_no IS NULL OR TRIM(NEW.order_no) = '' THEN
        NEW.order_no := 'SO-' || LPAD(nextval('sales_order_no_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sales_order_no
BEFORE INSERT ON sales_order_hdr
FOR EACH ROW EXECUTE FUNCTION fn_sales_order_gen_no();

-- ══════════════════════════════════════════════════════════════
-- 3. LOOKUP SEEDS  (SALES_ORDER_TYPE / CURRENCY)
-- ══════════════════════════════════════════════════════════════

INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('SALES_ORDER_TYPE', 'STANDARD', 'Standard', 1, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('CURRENCY', 'INR', 'INR', 1, TRUE),
  ('CURRENCY', 'USD', 'USD', 2, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;
