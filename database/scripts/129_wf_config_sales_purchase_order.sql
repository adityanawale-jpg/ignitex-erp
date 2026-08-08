-- Settings → Workflow Configuration: seed approval workflows for Sales Order and
-- Purchase Order so both appear on the page ready for an admin to assign steps.
--
-- module_code is what WorkflowPanel passes as recordType, so it must stay
-- SALES_ORDER / PURCHASE_ORDER to match the order pages.
--
-- Steps follow the BOM precedent: step 1 submits, step 2 approves / rejects /
-- raises RFC. Idempotent, so re-running is harmless.

INSERT INTO wf_config (wf_code, wf_name, module_code, description, is_active)
VALUES
  ('SO_APPROVAL', 'Sales Order Approval Workflow',    'SALES_ORDER',
   'Two-step workflow: Maker submits the sales order, Checker approves / rejects / raises RFC', TRUE),
  ('PO_APPROVAL', 'Purchase Order Approval Workflow', 'PURCHASE_ORDER',
   'Two-step workflow: Maker submits the purchase order, Checker approves / rejects / raises RFC', TRUE)
ON CONFLICT (wf_code) DO UPDATE SET
  wf_name     = EXCLUDED.wf_name,
  module_code = EXCLUDED.module_code,
  description = EXCLUDED.description,
  is_active   = TRUE;

-- Step 1 — Submit. Left unassigned on purpose: the engine treats an unassigned
-- step 1 as "anyone may raise this", which is what a maker step should be.
INSERT INTO wf_step (config_id, step_no, step_name, can_submit, can_approve, can_reject, can_rfc, is_active)
SELECT id, 1, 'Submit for Approval', TRUE, FALSE, FALSE, FALSE, TRUE
FROM   wf_config WHERE wf_code IN ('SO_APPROVAL', 'PO_APPROVAL')
ON CONFLICT (config_id, step_no) DO UPDATE SET
  step_name  = EXCLUDED.step_name,
  can_submit = TRUE,
  is_active  = TRUE;

-- Step 2 — Approve / Reject / RFC, RFC sending the order back to step 1.
--
-- Unlike step 1 this one MUST carry an assignee. The engine only waives the
-- assignee check for step 1, so an approval step with no role and no user is one
-- nobody can act on — every submitted order would sit at PENDING_APPROVAL with
-- no way forward. It is seeded to the system administrator role so approvals
-- work the moment the migration lands; an admin should repoint it at the real
-- approver role on Settings → Workflow Configuration.
INSERT INTO wf_step (config_id, step_no, step_name, role_id, can_submit, can_approve, can_reject, can_rfc, rfc_to_step, is_active)
SELECT c.id, 2, 'Approve / Reject / RFC',
       (SELECT r.id FROM role_master r
         WHERE r.role_code IN ('SYS_ADMIN', 'ADMIN') AND COALESCE(r.is_active, TRUE)
         ORDER BY CASE r.role_code WHEN 'SYS_ADMIN' THEN 0 ELSE 1 END, r.id
         LIMIT 1),
       FALSE, TRUE, TRUE, TRUE, 1, TRUE
FROM   wf_config c WHERE c.wf_code IN ('SO_APPROVAL', 'PO_APPROVAL')
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
