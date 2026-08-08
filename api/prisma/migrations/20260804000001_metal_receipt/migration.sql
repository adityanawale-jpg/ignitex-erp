-- ══════════════════════════════════════════════════════════════
-- 20260804000001_metal_receipt
-- Inventory Management → Metal Receipt
--
--   1. metal_receipt table (one row per received metal line)
--   2. Auto receipt_number trigger (MR-000001, MR-000002, …)
--   3. Workflow config (MR_APPROVAL) so Draft → Approved works
--   4. Menu entry (IM_METAL_RECEIPT) + role grants
--
-- A receipt row names ONE metal SKU, deliberately — the same shape
-- purchase_requisition uses and for the same reason: every column the business
-- gave for this screen (SKU / received wt / UID / purity / pure wt / inward
-- org / inward sub-inv) describes a single lot, and the customer + doc_number
-- pair is what ties the several lines that arrived on one document back
-- together. A header/line split would put the lot columns one table further
-- from the grid for no gain today.
--
-- UID identifies the physical lot (bar, grain packet, tag) the metal came in
-- as. It is indexed but NOT unique: metal arriving without a tag is entered
-- blank, and a customer re-using their own numbering across years is common
-- enough that a hard constraint would block honest data entry.
--
-- Status is the workflow lifecycle, not the is_active flag the masters carry:
-- this screen's work list is Draft / Approved, and metal that has been accepted
-- into a sub-inventory is not the receiver's to rewrite afterwards. The column
-- is written only through the workflow engine (see workflow.service.ts →
-- runModuleHook), except for CANCELLED which the cancel endpoint sets directly.
--
-- Run after 20260803000001_fix_self_approval_stuck_pending
-- ══════════════════════════════════════════════════════════════

-- ── 1. Table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS metal_receipt (
    id                   SERIAL PRIMARY KEY,
    receipt_number       VARCHAR(30)  UNIQUE,                     -- auto: MR-000001
    receipt_date         DATE         NOT NULL DEFAULT CURRENT_DATE,

    -- ── Who it came from ──
    customer_id          INTEGER      NOT NULL REFERENCES customer_master(id),
    -- The customer's own document number for the shipment. Not unique: one
    -- document routinely covers several lots, each entered as its own row.
    doc_number           VARCHAR(100),
    shipment_location    VARCHAR(300),

    -- ── The metal ──
    -- metal_master row the SKU was picked from. No FK: the picker is the shared
    -- item LOV (itemLov.service.ts), and a receipt must still read the way it
    -- was entered after the master is re-coded.
    item_id              INTEGER,
    sku_code             VARCHAR(300) NOT NULL,
    item_description     VARCHAR(500),
    uid                  VARCHAR(100),                            -- lot / bar / tag id
    purity               VARCHAR(50),                             -- PURITY lookup code

    -- ── Weights (grams) ──
    received_weight      NUMERIC(14,4) NOT NULL DEFAULT 0,
    -- Fine-metal content of received_weight. Derived from purity on screen, but
    -- stored rather than computed: an assay can correct it after the fact.
    pure_weight          NUMERIC(14,4) DEFAULT 0,

    -- ── Where it lands ──
    inward_inv_org       VARCHAR(50),                             -- INV_ORG lookup code
    inward_sub_inv       VARCHAR(100),                            -- inventory_structure.sub_inv_code

    remarks              VARCHAR(500),

    -- ── Status ──
    receipt_status       VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    cancel_reason        VARCHAR(500),
    cancelled_at         TIMESTAMP,

    created_by           INTEGER,
    updated_by           INTEGER,
    created_at           TIMESTAMP DEFAULT NOW(),
    updated_at           TIMESTAMP DEFAULT NOW(),

    CONSTRAINT chk_mr_status CHECK (receipt_status IN
        ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED')),
    CONSTRAINT chk_mr_received_wt CHECK (received_weight > 0),
    -- Pure is the fine-metal content of what was weighed in, so it can never
    -- exceed it. This is the check that catches a purity typed as a multiplier
    -- (916) where a factor (0.916) was meant.
    CONSTRAINT chk_mr_pure_wt CHECK (COALESCE(pure_weight, 0) >= 0
                                 AND COALESCE(pure_weight, 0) <= received_weight)
);

CREATE INDEX IF NOT EXISTS idx_mr_status   ON metal_receipt(receipt_status);
CREATE INDEX IF NOT EXISTS idx_mr_date     ON metal_receipt(receipt_date DESC);
CREATE INDEX IF NOT EXISTS idx_mr_customer ON metal_receipt(customer_id);
CREATE INDEX IF NOT EXISTS idx_mr_doc_no   ON metal_receipt(doc_number);
CREATE INDEX IF NOT EXISTS idx_mr_sku      ON metal_receipt(sku_code);
CREATE INDEX IF NOT EXISTS idx_mr_uid      ON metal_receipt(uid);

-- ── 2. Auto-generate receipt_number ───────────────────────────
-- Same pattern as purchase_requisition.requisition_number: the number is the
-- DB's to hand out, so two users clicking Create at once can't land on the same
-- one. The screen shows a preview only.
CREATE SEQUENCE IF NOT EXISTS metal_receipt_no_seq START 1;

CREATE OR REPLACE FUNCTION fn_metal_receipt_gen_no()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.receipt_number IS NULL OR TRIM(NEW.receipt_number) = '' THEN
        NEW.receipt_number := 'MR-' || LPAD(nextval('metal_receipt_no_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_metal_receipt_no
BEFORE INSERT ON metal_receipt
FOR EACH ROW EXECUTE FUNCTION fn_metal_receipt_gen_no();

-- ── 3. Workflow config ────────────────────────────────────────
-- module_code is what WorkflowPanel passes as recordType, so it must stay
-- METAL_RECEIPT to match the page. Steps follow the Sales / Purchase Order
-- precedent: step 1 submits, step 2 approves / rejects / raises RFC.
INSERT INTO wf_config (wf_code, wf_name, module_code, description, is_active)
VALUES
  ('MR_APPROVAL', 'Metal Receipt Approval Workflow', 'METAL_RECEIPT',
   'Two-step workflow: Maker submits the metal receipt, Checker approves / rejects / raises RFC', TRUE)
ON CONFLICT (wf_code) DO UPDATE SET
  wf_name     = EXCLUDED.wf_name,
  module_code = EXCLUDED.module_code,
  description = EXCLUDED.description,
  is_active   = TRUE;

-- Step 1 — Submit. Left unassigned on purpose: the engine treats an unassigned
-- step 1 as "anyone may raise this", which is what a maker step should be.
INSERT INTO wf_step (config_id, step_no, step_name, can_submit, can_approve, can_reject, can_rfc, is_active)
SELECT id, 1, 'Submit for Approval', TRUE, FALSE, FALSE, FALSE, TRUE
FROM   wf_config WHERE wf_code = 'MR_APPROVAL'
ON CONFLICT (config_id, step_no) DO UPDATE SET
  step_name  = EXCLUDED.step_name,
  can_submit = TRUE,
  is_active  = TRUE;

-- Step 2 — Approve / Reject / RFC, RFC sending the receipt back to step 1.
--
-- Unlike step 1 this one MUST carry an assignee: the engine only waives the
-- assignee check for step 1, so an approval step with no role and no user is one
-- nobody can act on, and every submitted receipt would sit at PENDING_APPROVAL
-- with no way forward. Seeded to the system administrator role so approvals work
-- the moment the migration lands; an admin should repoint it at the real
-- approver role on Settings → Workflow Configuration.
INSERT INTO wf_step (config_id, step_no, step_name, role_id, can_submit, can_approve, can_reject, can_rfc, rfc_to_step, is_active)
SELECT c.id, 2, 'Approve / Reject / RFC',
       (SELECT r.id FROM role_master r
         WHERE r.role_code IN ('SYS_ADMIN', 'ADMIN') AND COALESCE(r.is_active, TRUE)
         ORDER BY CASE r.role_code WHEN 'SYS_ADMIN' THEN 0 ELSE 1 END, r.id
         LIMIT 1),
       FALSE, TRUE, TRUE, TRUE, 1, TRUE
FROM   wf_config c WHERE c.wf_code = 'MR_APPROVAL'
ON CONFLICT (config_id, step_no) DO UPDATE SET
  step_name   = EXCLUDED.step_name,
  -- Never clobber an approver an admin has already chosen, by role or by user.
  role_id     = CASE
                  WHEN wf_step.role_id IS NOT NULL OR wf_step.user_id IS NOT NULL
                    THEN wf_step.role_id
                  ELSE EXCLUDED.role_id
                END,
  can_approve = TRUE,
  can_reject  = TRUE,
  can_rfc     = TRUE,
  rfc_to_step = 1,
  is_active   = TRUE;

-- ── 4. Menu entry ─────────────────────────────────────────────
-- Slot 1 under Inventory Management (parent 4). Metal Receipt is where stock
-- enters the system, so it precedes the two placeholder screens (On Hand Stock,
-- Costing Module) that 05_menu_restructure.sql seeded at 1 and 2 — those shift
-- down one. The UPDATE is scoped to those two codes so an admin who has already
-- re-ordered this module by hand keeps their arrangement everywhere else.
--
-- Resolved via pg_get_serial_sequence rather than the literal
-- 'menu_master_id_seq': years of explicit-id seeding (00_reset_and_init.sql)
-- and hardcoded setval calls (05_menu_restructure.sql) have left some
-- environments' real backing sequence out of sync with — or differently named
-- than — that literal, which is exactly the class of bug that made the insert
-- below fail with a duplicate-key error on menu_master_pkey.
SELECT setval(pg_get_serial_sequence('menu_master', 'id'), (SELECT MAX(id) FROM menu_master));

UPDATE menu_master SET menu_order = 2 WHERE menu_code = 'IM_ON_HAND' AND menu_order = 1;
UPDATE menu_master SET menu_order = 3 WHERE menu_code = 'IM_COSTING' AND menu_order = 2;

INSERT INTO menu_master (parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active)
VALUES (4, 'IM_METAL_RECEIPT', 'Metal Receipt', '/inventory-mgmt/metal-receipt', 'ArrowDownTrayIcon', 1, 2, TRUE)
ON CONFLICT (menu_code) DO UPDATE
SET parent_id  = EXCLUDED.parent_id,
    menu_name  = EXCLUDED.menu_name,
    menu_url   = EXCLUDED.menu_url,
    menu_icon  = EXCLUDED.menu_icon,
    menu_order = EXCLUDED.menu_order,
    menu_level = EXCLUDED.menu_level,
    is_active  = TRUE;

-- Mirror the Sales Order grants, as Purchase Requisition did: the roles that
-- take a customer's order are the roles that book the metal that customer sends
-- in, so this needs no trip to the Permissions screen.
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export)
SELECT src.role_id, mm.id, src.can_view, src.can_create, src.can_update, src.can_delete, src.can_print, src.can_export
FROM   role_menu_mapping src
JOIN   menu_master mm ON mm.menu_code = 'IM_METAL_RECEIPT'
WHERE  src.menu_id = (SELECT id FROM menu_master WHERE menu_code = 'ORD_SALES')
ON CONFLICT (role_id, menu_id) DO NOTHING;
