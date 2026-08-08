-- ============================================================
-- 45_workflow_engine.sql
-- Global configurable workflow engine
-- Supports N-step approval flows for any module
-- ============================================================

BEGIN;

-- ── 1. wf_config  (one workflow definition per module) ──────────
CREATE TABLE IF NOT EXISTS wf_config (
  id          SERIAL        PRIMARY KEY,
  wf_code     VARCHAR(50)   UNIQUE NOT NULL,  -- e.g. 'BOM_APPROVAL'
  wf_name     VARCHAR(200)  NOT NULL,          -- e.g. 'BOM Approval Workflow'
  module_code VARCHAR(50)   NOT NULL,          -- e.g. 'FG_BOM'
  description TEXT,
  is_active   BOOLEAN       DEFAULT TRUE,
  created_by  INT,
  updated_by  INT,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ── 2. wf_step  (steps within a workflow) ───────────────────────
--   step_no = 1 is always the initiator/submit step (no assignee check needed)
--   step_no > 1 are review/approval steps with role or user assignee
CREATE TABLE IF NOT EXISTS wf_step (
  id           SERIAL  PRIMARY KEY,
  config_id    INT     NOT NULL REFERENCES wf_config(id) ON DELETE CASCADE,
  step_no      INT     NOT NULL,
  step_name    VARCHAR(200) NOT NULL,
  -- Assignee: role_id OR user_id (role takes priority if both set)
  role_id      INT     REFERENCES role_master(id)    ON DELETE SET NULL,
  user_id      INT     REFERENCES user_master(user_id) ON DELETE SET NULL,
  -- Actions allowed AT this step
  can_submit   BOOLEAN DEFAULT FALSE,  -- step 1 = submit trigger
  can_approve  BOOLEAN DEFAULT FALSE,
  can_reject   BOOLEAN DEFAULT FALSE,
  can_rfc      BOOLEAN DEFAULT FALSE,
  -- RFC sends record back to this step number
  rfc_to_step  INT     DEFAULT 1,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(config_id, step_no)
);

-- ── 3. wf_request  (one row per record's active workflow journey) ─
CREATE TABLE IF NOT EXISTS wf_request (
  id           SERIAL  PRIMARY KEY,
  config_id    INT     NOT NULL REFERENCES wf_config(id),
  record_type  VARCHAR(50)  NOT NULL,  -- 'FG_BOM'
  record_id    INT          NOT NULL,
  current_step INT          NOT NULL DEFAULT 1,
  wf_status    VARCHAR(50)  NOT NULL DEFAULT 'DRAFT',
    -- DRAFT | PENDING | APPROVED | REJECTED | RFC
  created_by   INT,
  updated_by   INT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(record_type, record_id)
);

CREATE INDEX IF NOT EXISTS idx_wf_request_record ON wf_request(record_type, record_id);
CREATE INDEX IF NOT EXISTS idx_wf_request_status ON wf_request(wf_status);

-- ── 4. wf_history  (audit trail of every action) ────────────────
CREATE TABLE IF NOT EXISTS wf_history (
  id          SERIAL  PRIMARY KEY,
  request_id  INT     NOT NULL REFERENCES wf_request(id) ON DELETE CASCADE,
  step_no     INT     NOT NULL,
  step_name   VARCHAR(200),
  action      VARCHAR(50)  NOT NULL,  -- SUBMIT | APPROVE | REJECT | RFC
  action_by   INT          NOT NULL,
  action_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  remarks     TEXT
);

CREATE INDEX IF NOT EXISTS idx_wf_history_request ON wf_history(request_id);

-- ── 5. Seed: FG BOM Approval Workflow ───────────────────────────
INSERT INTO wf_config (wf_code, wf_name, module_code, description)
VALUES (
  'BOM_APPROVAL',
  'BOM Approval Workflow',
  'FG_BOM',
  'Two-step workflow: Maker submits, Checker approves / rejects / raises RFC'
)
ON CONFLICT (wf_code) DO NOTHING;

-- Step 1: Submit (initiator — any form user can trigger)
INSERT INTO wf_step (config_id, step_no, step_name, can_submit, is_active)
SELECT id, 1, 'Submit for Approval', TRUE, TRUE
FROM   wf_config WHERE wf_code = 'BOM_APPROVAL'
ON CONFLICT (config_id, step_no) DO NOTHING;

-- Step 2: Approval (no role assigned by default — admin should configure)
INSERT INTO wf_step (config_id, step_no, step_name, can_approve, can_reject, can_rfc, rfc_to_step, is_active)
SELECT id, 2, 'Approve / Reject / RFC', TRUE, TRUE, TRUE, 1, TRUE
FROM   wf_config WHERE wf_code = 'BOM_APPROVAL'
ON CONFLICT (config_id, step_no) DO NOTHING;

-- ── 6. Menu entry for Workflow Config (under System Admin, parent_id = 10) ─
INSERT INTO menu_master (parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active)
VALUES (
  10,
  'SA_WF_CONFIG',
  'Workflow Config',
  '/settings/workflow-config',
  'AdjustmentsHorizontalIcon',
  (SELECT COALESCE(MAX(menu_order), 0) + 1 FROM menu_master WHERE parent_id = 10),
  2,
  TRUE
)
ON CONFLICT (menu_code) DO NOTHING;

COMMIT;
