-- ============================================================
-- 90_fix_reject_wf_sync.sql
-- When the legacy rejectFGBOM endpoint fires, it resets
-- bom_fg.bom_status = 'DRAFT' but fg_bom_reject_wf_sync
-- previously only set wf_status = 'REJECTED' without resetting
-- current_step to 1. This left wf_request stuck at step 2
-- (the approval step, can_submit = FALSE), blocking re-submission.
--
-- Fix 1: Update the SQL so reject also resets current_step = 1
--        and wf_status = 'DRAFT' (matching the BOM's DRAFT state).
-- Fix 2: One-time repair of any already-corrupted wf_request rows
--        where bom is DRAFT but wf_request is stuck past step 1.
-- ============================================================

BEGIN;

-- ── 1. Fix fg_bom_reject_wf_sync query ───────────────────────────
UPDATE project_config
SET key_value =
'UPDATE wf_request
SET wf_status = ''DRAFT'', current_step = 1, updated_at = NOW()
WHERE record_type = ''FG_BOM'' AND record_id = $1'
WHERE key_code = 'fg_bom_reject_wf_sync';

-- ── 2. One-time repair of existing stale rows ─────────────────────
-- Reset any wf_request for FG_BOM where the BOM is DRAFT but
-- current_step is not 1 (stuck at approval step after legacy reject).
UPDATE wf_request wr
SET wf_status = 'DRAFT', current_step = 1, updated_at = NOW()
WHERE wr.record_type = 'FG_BOM'
  AND wr.current_step <> 1
  AND EXISTS (
    SELECT 1 FROM bom_fg bf
    WHERE bf.id = wr.record_id AND bf.bom_status = 'DRAFT'
  );

COMMIT;
