-- ══════════════════════════════════════════════════════════════
-- 131_purchase_order.sql
-- Purchase Management → Purchase Order
--
--   1. purchase_order_hdr  (one row per PO)
--   2. purchase_order_lines (one row per ordered item)
--   3. Auto po_number trigger (PO-000001, PO-000002, …)
--   4. Menu entry (PM_ORDERS) + role grants
--
-- Header/lines, unlike purchase_requisition: a PO is placed with ONE supplier
-- for MANY items, so the supplier, the addresses, the payment term and the
-- money totals belong once at the top rather than repeated on every row. That
-- is the same split sales_order_hdr / sales_order_lines uses, and this table
-- deliberately mirrors it — a PO is the buy-side twin of a sales order.
--
-- itemtype repeats the CHECK-constrained enum from purchase_requisition rather
-- than referencing a master_lookup type: each value names a specific master the
-- SKU picker reads (see purchaseOrder.controller.ts → getPOItemLOV), so a value
-- added by data entry alone would be a picker with nowhere to look.
--
-- Status is the DRAFT / SUBMITTED / CANCELLED lifecycle the Sales Order screen
-- uses, not the is_active flag the masters carry: the screen's footer offers
-- Save Draft and Submit, and a PO that has gone to a supplier must not be
-- editable afterwards.
--
-- Run after 130_purchase_requisition.sql
-- ══════════════════════════════════════════════════════════════

-- ── 1. Header ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_order_hdr (
    id                  SERIAL PRIMARY KEY,
    po_number           VARCHAR(30)  UNIQUE,                     -- auto: PO-000001
    -- Procurement BU. INV_BU lookup, the same list Sales Order and Inventory
    -- Structure draw their Business Unit from.
    buss_unit_id        VARCHAR(50)  NOT NULL,
    supplier_id         INTEGER      NOT NULL,

    -- ── Supplier defaults, copied at order time ──
    -- Filled from supplier_master when the supplier is picked, then stored
    -- rather than joined on read: a PO must still print the address and terms it
    -- was actually placed under after the master is edited.
    supplier_address    TEXT,
    comm_email          VARCHAR(255),
    pay_term            VARCHAR(50),                             -- PAYMENT_TERM lookup

    -- ── Delivery / invoicing ──
    ship_to_location    TEXT,
    bill_to_location    TEXT,
    currency_code       VARCHAR(10)  NOT NULL DEFAULT 'INR',

    po_date             DATE         NOT NULL DEFAULT CURRENT_DATE,
    expected_date       DATE,
    po_status           VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',

    -- ── Buyer ──
    -- The user who raised it, captured server-side from the token. Name is
    -- denormalised so a printed PO still names its buyer after the user row is
    -- renamed or deactivated.
    buyer_id            INTEGER,
    buyer_name          VARCHAR(150),

    -- Requisitions the lines were populated from, comma-joined. Derived from the
    -- lines on every save, never trusted from the client.
    req_number          VARCHAR(200),

    remarks             VARCHAR(1000),

    -- ── Money ──
    -- ordered_amount is the goods value (Ordered RS on the form), tax_amount the
    -- sum of the lines' tax, and total_value the two added. All three are
    -- recomputed from the lines on every save rather than accepted as sent.
    total_qty           INTEGER       DEFAULT 0,
    ordered_amount      NUMERIC(14,2) DEFAULT 0,
    tax_amount          NUMERIC(14,2) DEFAULT 0,
    total_value         NUMERIC(14,2) DEFAULT 0,

    cancel_reason       VARCHAR(500),
    cancelled_at        TIMESTAMP,

    created_by          INTEGER,
    updated_by          INTEGER,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_po_hdr_supplier FOREIGN KEY (supplier_id)
        REFERENCES supplier_master(id),
    CONSTRAINT chk_po_status CHECK (po_status IN ('DRAFT', 'SUBMITTED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_po_hdr_supplier ON purchase_order_hdr(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_hdr_status   ON purchase_order_hdr(po_status);
CREATE INDEX IF NOT EXISTS idx_po_hdr_date     ON purchase_order_hdr(po_date DESC);
CREATE INDEX IF NOT EXISTS idx_po_hdr_bu       ON purchase_order_hdr(buss_unit_id);

-- ── 2. Lines ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_order_lines (
    id               SERIAL PRIMARY KEY,
    po_id            INTEGER      NOT NULL,
    line_no          INTEGER      NOT NULL DEFAULT 1,

    -- ── Item ──
    itemtype         VARCHAR(20)  NOT NULL,                      -- FG | FINDING | METAL | STONE | COMPONENT
    -- Polymorphic across the five item masters, so no FK — the same reason
    -- purchase_requisition.item_id and bom_fg_detail.item_id carry none.
    item_id          INTEGER,
    sku_code         VARCHAR(300) NOT NULL,
    item_description VARCHAR(500),
    item_qty         INTEGER      NOT NULL DEFAULT 0,
    uom              VARCHAR(20),

    -- ── Weights (grams; stone carats ride on item_qty + UOM) ──
    gross_weight     NUMERIC(14,4) DEFAULT 0,
    net_weight       NUMERIC(14,4) DEFAULT 0,
    pure_weight      NUMERIC(14,4) DEFAULT 0,

    -- ── Money ──
    -- rate_per_unit carries four decimals because a metal rate is quoted per
    -- gram and rounding it to paise before multiplying by a weight loses real
    -- money on a large line.
    rate_per_unit    NUMERIC(14,4) NOT NULL DEFAULT 0,
    line_value       NUMERIC(14,2) NOT NULL DEFAULT 0,           -- qty × rate
    tax_pct          NUMERIC(6,3)  DEFAULT 0,
    tax_amount       NUMERIC(14,2) DEFAULT 0,
    line_total       NUMERIC(14,2) DEFAULT 0,                    -- value + tax

    vendor_item_no   VARCHAR(100),
    -- The requisition this line was populated from, when it came from one.
    req_number       VARCHAR(100),
    requested_date   DATE,
    line_status      VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    remarks          VARCHAR(500),

    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_po_line_hdr FOREIGN KEY (po_id)
        REFERENCES purchase_order_hdr(id) ON DELETE CASCADE,
    CONSTRAINT chk_po_line_itemtype CHECK (itemtype IN ('FG', 'FINDING', 'METAL', 'STONE', 'COMPONENT')),
    CONSTRAINT chk_po_line_qty      CHECK (item_qty > 0),
    CONSTRAINT chk_po_line_rate     CHECK (rate_per_unit >= 0),
    CONSTRAINT chk_po_line_tax      CHECK (COALESCE(tax_pct, 0) >= 0 AND COALESCE(tax_pct, 0) <= 100),
    CONSTRAINT chk_po_line_weights  CHECK (COALESCE(gross_weight, 0) >= 0
                                       AND COALESCE(net_weight,   0) >= 0
                                       AND COALESCE(pure_weight,  0) >= 0)
);

CREATE INDEX IF NOT EXISTS idx_po_lines_po  ON purchase_order_lines(po_id);
CREATE INDEX IF NOT EXISTS idx_po_lines_sku ON purchase_order_lines(sku_code);
CREATE INDEX IF NOT EXISTS idx_po_lines_req ON purchase_order_lines(req_number);

-- ── 3. Auto-generate po_number ────────────────────────────────
-- Same pattern as sales_order_hdr.order_no and purchase_requisition
-- .requisition_number: the number is the DB's to hand out, so two buyers
-- clicking Save Draft at once can't land on the same one. The screen shows a
-- preview only.
CREATE SEQUENCE IF NOT EXISTS purchase_order_no_seq START 1;

CREATE OR REPLACE FUNCTION fn_purchase_order_gen_no()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.po_number IS NULL OR TRIM(NEW.po_number) = '' THEN
        NEW.po_number := 'PO-' || LPAD(nextval('purchase_order_no_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_purchase_order_no
BEFORE INSERT ON purchase_order_hdr
FOR EACH ROW EXECUTE FUNCTION fn_purchase_order_gen_no();

-- ── 4. Menu entry ─────────────────────────────────────────────
-- Slot 2 under Purchase Management (parent 3), between the requisition it is
-- raised from (1) and the Blanket Agreement (3). The row is already seeded by
-- 05_menu_restructure.sql on most environments, so this is an upsert that
-- settles the name and URL rather than a fresh insert.
SELECT setval('menu_master_id_seq', (SELECT MAX(id) FROM menu_master));

INSERT INTO menu_master (parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active)
VALUES (3, 'PM_ORDERS', 'Purchase Order', '/purchase-mgmt/orders', 'TruckIcon', 2, 2, TRUE)
ON CONFLICT (menu_code) DO UPDATE
SET parent_id  = EXCLUDED.parent_id,
    menu_name  = EXCLUDED.menu_name,
    menu_url   = EXCLUDED.menu_url,
    menu_icon  = EXCLUDED.menu_icon,
    menu_order = EXCLUDED.menu_order,
    menu_level = EXCLUDED.menu_level,
    is_active  = TRUE;

-- Mirror the Purchase Requisition grants: the roles that raise a requisition are
-- the roles that turn it into a PO, so this needs no trip to the Permissions
-- screen. can_print matters here in a way it does not on the masters — the
-- footer's Print button is what sends the order to the supplier.
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export)
SELECT src.role_id, mm.id, src.can_view, src.can_create, src.can_update, src.can_delete, src.can_print, src.can_export
FROM   role_menu_mapping src
JOIN   menu_master mm ON mm.menu_code = 'PM_ORDERS'
WHERE  src.menu_id = (SELECT id FROM menu_master WHERE menu_code = 'PM_REQUISITIONS')
ON CONFLICT (role_id, menu_id) DO NOTHING;
