-- ============================================================
-- 130_fix_self_approval_stuck_pending.sql
-- Repair records left in PENDING_APPROVAL by the self-approval bug.
--
-- The workflow engine skipped its auto-approve step whenever a
-- SUBMIT already landed the request on APPROVED — which is what
-- happens when the config has a single active step (no separate
-- approver step). The wf_request said APPROVED while the document
-- stayed PENDING_APPROVAL, and no step could approve it, so the
-- record was stuck in the Pending for Approval tab.
--
-- Fixed in workflow.service.ts; this heals the existing rows.
-- Only touches records whose wf_request is already APPROVED, so
-- genuinely pending records awaiting a checker are left alone.
-- Safe to re-run.
-- ============================================================

BEGIN;

-- ── FG BOM ───────────────────────────────────────────────────────
UPDATE bom_fg b
SET    bom_status  = 'ACTIVE',
       approved_by = COALESCE(b.approved_by, b.submitted_by),
       approved_at = COALESCE(b.approved_at, r.updated_at, NOW()),
       updated_at  = NOW()
FROM   wf_request r
WHERE  r.record_type = 'FG_BOM'
  AND  r.record_id   = b.id
  AND  r.wf_status   = 'APPROVED'
  AND  b.bom_status  = 'PENDING_APPROVAL';

-- ── Finding BOM ──────────────────────────────────────────────────
UPDATE bom_fin b
SET    bom_status  = 'ACTIVE',
       approved_by = COALESCE(b.approved_by, b.submitted_by),
       approved_at = COALESCE(b.approved_at, r.updated_at, NOW()),
       updated_at  = NOW()
FROM   wf_request r
WHERE  r.record_type = 'FINDING_BOM'
  AND  r.record_id   = b.id
  AND  r.wf_status   = 'APPROVED'
  AND  b.bom_status  = 'PENDING_APPROVAL';

-- ── Sales Order ──────────────────────────────────────────────────
UPDATE sales_order_hdr h
SET    order_status = 'APPROVED',
       updated_at   = NOW()
FROM   wf_request r
WHERE  r.record_type  = 'SALES_ORDER'
  AND  r.record_id    = h.id
  AND  r.wf_status    = 'APPROVED'
  AND  h.order_status = 'PENDING_APPROVAL';

UPDATE sales_order_lines l
SET    item_status = 'APPROVED',
       updated_at  = NOW()
FROM   sales_order_hdr h
WHERE  h.id           = l.order_id
  AND  h.order_status = 'APPROVED'
  AND  l.item_status  = 'PENDING_APPROVAL';

-- ── Purchase Order ───────────────────────────────────────────────
UPDATE purchase_order_hdr h
SET    po_status  = 'APPROVED',
       updated_at = NOW()
FROM   wf_request r
WHERE  r.record_type = 'PURCHASE_ORDER'
  AND  r.record_id   = h.id
  AND  r.wf_status   = 'APPROVED'
  AND  h.po_status   = 'PENDING_APPROVAL';

UPDATE purchase_order_lines l
SET    line_status = 'APPROVED',
       updated_at  = NOW()
FROM   purchase_order_hdr h
WHERE  h.id          = l.po_id
  AND  h.po_status   = 'APPROVED'
  AND  l.line_status = 'PENDING_APPROVAL';

COMMIT;
