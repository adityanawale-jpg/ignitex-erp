-- ============================================================
-- 97_wf_config_self_approval.sql
-- Add self_approval flag to wf_config.
-- When true: submitting a record immediately auto-approves it
-- (no separate approver action needed).
-- ============================================================

BEGIN;

ALTER TABLE wf_config
  ADD COLUMN IF NOT EXISTS self_approval BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN wf_config.self_approval IS
  'When true, SUBMIT automatically triggers APPROVE in the same transaction';

COMMIT;
