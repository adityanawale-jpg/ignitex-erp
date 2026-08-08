-- ══════════════════════════════════════════════════════════════
-- 130_purchase_requisition.sql
-- Purchase Management → Purchase Requisition
--
--   1. purchase_requisition table (one row per requisition)
--   2. Auto requisition_number trigger (PR-000001, PR-000002, …)
--   3. Lookup seed: PR_REQUEST_SOURCE
--   4. Menu entry + role grants
--
-- A requisition names ONE item, deliberately: the columns the business gave
-- for this screen (itemtype / sku_code / weights / vendor mapping) all describe
-- a single SKU, and the reference triplet (ref_request_number,
-- ref_request_source, ref_source_reference) is what ties several requisitions
-- raised off the same demand back together. A header/line split would put the
-- item columns one table further from the grid for no gain today.
--
-- itemtype is a CHECK-constrained enum rather than a master_lookup type on
-- purpose: each value maps to a specific master table the SKU picker reads
-- (see purchaseRequisition.controller.ts → getRequisitionItemLOV), so a value
-- added by data entry alone would be a picker with nowhere to look.
--
-- Status is a plain is_active flag with a deactivation reason — the same
-- vocabulary every master on this system uses. There is no submit/approve
-- lifecycle here.
--
-- Run after 129_sales_order_line_gold_rate.sql
-- ══════════════════════════════════════════════════════════════

-- ── 1. Table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_requisition (
    id                   SERIAL PRIMARY KEY,
    requisition_number   VARCHAR(30)  UNIQUE,                      -- auto: PR-000001
    requisition_date     DATE         NOT NULL DEFAULT CURRENT_DATE,

    -- ── Item ──
    itemtype             VARCHAR(20)  NOT NULL,                    -- FG | FINDING | METAL | STONE | COMPONENT
    -- Master row the SKU was picked from. Polymorphic across the five item
    -- masters, so no FK — the same reason bom_fg_detail.item_id carries none.
    item_id              INTEGER,
    sku_code             VARCHAR(300) NOT NULL,
    item_description     VARCHAR(500),
    -- Whole units only: a requisition asks for a countable number of pieces,
    -- grams or carats, and the fractional part belongs in the weight columns.
    item_qty             INTEGER      NOT NULL DEFAULT 0,
    uom                  VARCHAR(20),                              -- UOM lookup code

    -- ── Weights (grams; stone carats are carried on item_qty + UOM) ──
    gross_weight         NUMERIC(14,4) DEFAULT 0,
    net_weight           NUMERIC(14,4) DEFAULT 0,
    pure_weight          NUMERIC(14,4) DEFAULT 0,

    -- ── Vendor mapping ──
    -- Set from the variant's vendor_variant_code when the SKU carries one; the
    -- flag is stored rather than derived so a requisition still reads the way
    -- it was raised after the master is re-mapped.
    is_vendor_mapped     BOOLEAN      NOT NULL DEFAULT FALSE,
    vendor_item_no       VARCHAR(100),

    -- ── Originating demand ──
    ref_request_number   VARCHAR(100),
    ref_request_source   VARCHAR(50),                              -- PR_REQUEST_SOURCE lookup
    ref_source_reference VARCHAR(200),

    required_date        DATE,
    remarks              VARCHAR(500),

    -- ── Status ──
    is_active            BOOLEAN   DEFAULT TRUE,
    deactivation_reason  VARCHAR(500),
    deactivated_at       TIMESTAMP,

    created_by           INTEGER,
    updated_by           INTEGER,
    created_at           TIMESTAMP DEFAULT NOW(),
    updated_at           TIMESTAMP DEFAULT NOW(),

    CONSTRAINT chk_pr_itemtype CHECK (itemtype IN ('FG', 'FINDING', 'METAL', 'STONE', 'COMPONENT')),
    CONSTRAINT chk_pr_qty      CHECK (item_qty > 0),
    CONSTRAINT chk_pr_weights  CHECK (COALESCE(gross_weight, 0) >= 0
                                  AND COALESCE(net_weight,   0) >= 0
                                  AND COALESCE(pure_weight,  0) >= 0),
    -- "Vendor mapped" with no vendor item number is the state that silently
    -- sends a PO out with a blank part number, so the pair is enforced here.
    CONSTRAINT chk_pr_vendor_item CHECK (is_vendor_mapped = FALSE
                                      OR COALESCE(TRIM(vendor_item_no), '') <> '')
);

CREATE INDEX IF NOT EXISTS idx_pr_active   ON purchase_requisition(is_active);
CREATE INDEX IF NOT EXISTS idx_pr_date     ON purchase_requisition(requisition_date DESC);
CREATE INDEX IF NOT EXISTS idx_pr_itemtype ON purchase_requisition(itemtype);
CREATE INDEX IF NOT EXISTS idx_pr_sku      ON purchase_requisition(sku_code);
CREATE INDEX IF NOT EXISTS idx_pr_ref_req  ON purchase_requisition(ref_request_number);

-- ── 2. Auto-generate requisition_number ───────────────────────
-- Same pattern as sales_order_hdr.order_no: the number is the DB's to hand out,
-- so two users clicking Create at once can't land on the same one. The screen
-- shows a preview only.
CREATE SEQUENCE IF NOT EXISTS purchase_requisition_no_seq START 1;

CREATE OR REPLACE FUNCTION fn_purchase_requisition_gen_no()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.requisition_number IS NULL OR TRIM(NEW.requisition_number) = '' THEN
        NEW.requisition_number := 'PR-' || LPAD(nextval('purchase_requisition_no_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_purchase_requisition_no
BEFORE INSERT ON purchase_requisition
FOR EACH ROW EXECUTE FUNCTION fn_purchase_requisition_gen_no();

-- ── 3. Lookup seed — where the demand came from ───────────────
-- master_lookup_id_seq drifts behind MAX(id) whenever rows arrive with explicit
-- ids (data load / restore), and every INSERT then fails on the primary key —
-- see 20260727000005_resync_master_lookup_id_seq. GREATEST only ever moves the
-- sequence forward, so this is a no-op where it is already correct.
SELECT setval(
  'master_lookup_id_seq',
  GREATEST(
    (SELECT COALESCE(MAX(id), 1) FROM master_lookup),
    (SELECT last_value FROM master_lookup_id_seq)
  )
);

INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('PR_REQUEST_SOURCE', 'SALES_ORDER', 'Sales Order',          1, TRUE),
  ('PR_REQUEST_SOURCE', 'MIN_MAX',     'Min-Max Planning',     2, TRUE),
  ('PR_REQUEST_SOURCE', 'PRODUCTION',  'Production Order',     3, TRUE),
  ('PR_REQUEST_SOURCE', 'STOCK_REPLN', 'Stock Replenishment',  4, TRUE),
  ('PR_REQUEST_SOURCE', 'MANUAL',      'Manual Request',       5, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

-- ── 4. Menu entry ─────────────────────────────────────────────
-- Slot 1 under Purchase Management (parent 3) — a requisition precedes the
-- Purchase Order (2) and Blanket Agreement (3) it turns into.
SELECT setval('menu_master_id_seq', (SELECT MAX(id) FROM menu_master));

INSERT INTO menu_master (parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active)
VALUES (3, 'PM_REQUISITIONS', 'Purchase Requisition', '/purchase-mgmt/requisitions', 'ClipboardListIcon', 1, 2, TRUE)
ON CONFLICT (menu_code) DO UPDATE
SET parent_id  = EXCLUDED.parent_id,
    menu_name  = EXCLUDED.menu_name,
    menu_url   = EXCLUDED.menu_url,
    menu_icon  = EXCLUDED.menu_icon,
    menu_order = EXCLUDED.menu_order,
    menu_level = EXCLUDED.menu_level,
    is_active  = TRUE;

-- Mirror Sales Order's grants: the roles that raise demand are the roles that
-- requisition against it, so this needs no trip to the Permissions screen.
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export)
SELECT src.role_id, mm.id, src.can_view, src.can_create, src.can_update, src.can_delete, src.can_print, src.can_export
FROM   role_menu_mapping src
JOIN   menu_master mm ON mm.menu_code = 'PM_REQUISITIONS'
WHERE  src.menu_id = (SELECT id FROM menu_master WHERE menu_code = 'ORD_SALES')
ON CONFLICT (role_id, menu_id) DO NOTHING;
