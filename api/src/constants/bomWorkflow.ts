// BOM's own lifecycle column (bom_fg.bom_status / bom_fin.bom_status).
// Kept separate from WF_STATUS below even though a couple of values overlap
// textually — they're two different enums (the BOM's own status vs. the
// generic workflow engine's wf_request.wf_status) that just happen to share
// DRAFT/REJECTED as spellings.
export const BOM_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  ACTIVE: 'ACTIVE',
  REJECTED: 'REJECTED',
  // Synthetic sentinel used in list/sort SQL for a variant with no BOM row yet —
  // not a real bom_fg.bom_status/bom_fin.bom_status column value.
  NO_BOM: 'NO_BOM',
} as const;

// wf_request.wf_status — the generic workflow engine's own status vocabulary.
export const WF_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  RFC: 'RFC',
} as const;

// wf_history.action / the `action` executeWorkflowAction accepts.
export const WF_ACTION = {
  SUBMIT: 'SUBMIT',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  RFC: 'RFC',
} as const;
