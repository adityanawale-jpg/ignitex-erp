-- ============================================================
-- 89_ensure_fg_bom_workflow.sql
-- Guarantee the FG BOM approval workflow config and steps
-- exist and are correctly configured.
-- Uses ON CONFLICT DO UPDATE so this is safe to run on any
-- DB regardless of whether migration 45 previously ran.
-- ============================================================

BEGIN;

-- ── 1. Upsert wf_config ──────────────────────────────────────────
INSERT INTO wf_config (wf_code, wf_name, module_code, description, is_active)
VALUES (
  'BOM_APPROVAL',
  'BOM Approval Workflow',
  'FG_BOM',
  'Two-step workflow: Maker submits, Checker approves / rejects / raises RFC',
  TRUE
)
ON CONFLICT (wf_code) DO UPDATE SET
  wf_name     = EXCLUDED.wf_name,
  module_code = EXCLUDED.module_code,
  description = EXCLUDED.description,
  is_active   = TRUE;

-- ── 2. Upsert step 1: Submit (any form user can trigger) ─────────
INSERT INTO wf_step (config_id, step_no, step_name, can_submit, can_approve, can_reject, can_rfc, is_active)
SELECT id, 1, 'Submit for Approval', TRUE, FALSE, FALSE, FALSE, TRUE
FROM   wf_config WHERE wf_code = 'BOM_APPROVAL'
ON CONFLICT (config_id, step_no) DO UPDATE SET
  step_name  = EXCLUDED.step_name,
  can_submit = TRUE,
  is_active  = TRUE;

-- ── 3. Upsert step 2: Approve / Reject / RFC ─────────────────────
INSERT INTO wf_step (config_id, step_no, step_name, can_submit, can_approve, can_reject, can_rfc, rfc_to_step, is_active)
SELECT id, 2, 'Approve / Reject / RFC', FALSE, TRUE, TRUE, TRUE, 1, TRUE
FROM   wf_config WHERE wf_code = 'BOM_APPROVAL'
ON CONFLICT (config_id, step_no) DO UPDATE SET
  step_name   = EXCLUDED.step_name,
  can_approve = TRUE,
  can_reject  = TRUE,
  can_rfc     = TRUE,
  rfc_to_step = 1,
  is_active   = TRUE;

COMMIT;
