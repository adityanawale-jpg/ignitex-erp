// sales_order_hdr.order_status / purchase_order_hdr.po_status /
// metal_receipt.receipt_status — the lifecycle every workflow-driven transaction
// document here shares. Kept separate from WF_STATUS (the generic engine's
// wf_request.wf_status) even though several values overlap textually: these are
// the document's own states, and the workflow hooks translate between the two.
//
// DRAFT ──submit──▶ PENDING_APPROVAL ──approve──▶ APPROVED
//   ▲                      │
//   └────────rfc───────────┤
//                          └──reject──▶ REJECTED
//
// CANCELLED is reachable from anything except itself and is terminal.
export const ORDER_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

// Every status a list filter may be given, in lifecycle order.
export const ORDER_STATUSES = [
  ORDER_STATUS.DRAFT,
  ORDER_STATUS.PENDING_APPROVAL,
  ORDER_STATUS.APPROVED,
  ORDER_STATUS.REJECTED,
  ORDER_STATUS.CANCELLED,
] as const;

// Editing is a maker activity: only before approval, and after the checker has
// handed the order back. Everything else is locked.
export const ORDER_EDITABLE: readonly string[] = [
  ORDER_STATUS.DRAFT,
  ORDER_STATUS.REJECTED,
];

// module_code on wf_config / record_type on wf_request — must match the
// recordType each page passes to WorkflowPanel. Metal Receipt rides the same
// lifecycle as the two orders, so it lives here rather than in an enum of its
// own that would say exactly the same thing.
export const ORDER_RECORD_TYPE = {
  SALES_ORDER: 'SALES_ORDER',
  PURCHASE_ORDER: 'PURCHASE_ORDER',
  METAL_RECEIPT: 'METAL_RECEIPT',
} as const;
