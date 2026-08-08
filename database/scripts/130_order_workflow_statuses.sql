-- Sales Order / Purchase Order move onto the workflow engine, which replaces the
-- flat DRAFT → SUBMITTED lifecycle with DRAFT → PENDING_APPROVAL → APPROVED
-- (plus REJECTED, and CANCELLED as before).
--
-- Existing SUBMITTED rows become APPROVED, not PENDING_APPROVAL. Under the old
-- rules SUBMITTED was the terminal state — the order was placed and could no
-- longer be edited — so APPROVED is the status that preserves what those rows
-- actually mean. Re-opening settled orders for an approval that never applied to
-- them would be the bigger lie, and it would strand every one of them: they have
-- no wf_request row for an approver to act on.
--
-- No CHECK constraint is added on either status column: none existed before, and
-- the columns are plain VARCHAR(20) written only by the controllers.

UPDATE sales_order_hdr    SET order_status = 'APPROVED' WHERE order_status = 'SUBMITTED';
UPDATE sales_order_lines  SET item_status  = 'APPROVED' WHERE item_status  = 'SUBMITTED';

UPDATE purchase_order_hdr   SET po_status   = 'APPROVED' WHERE po_status   = 'SUBMITTED';
UPDATE purchase_order_lines SET line_status = 'APPROVED' WHERE line_status = 'SUBMITTED';
