-- ============================================================
-- 98_fix_workflow_menu_url.sql
-- Fix: menu entry for Workflow Configuration was inserted with
-- URL '/settings/workflow-config' (script 45) but the actual
-- AppRoute is 'master-mgmt/workflow'.
-- Also fixes display name to 'Workflow Configuration'.
-- Safe to re-run — uses UPSERT.
-- ============================================================

BEGIN;

INSERT INTO menu_master
  (parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active)
VALUES (
  10,
  'SA_WF_CONFIG',
  'Workflow Configuration',
  'master-mgmt/workflow',
  'AdjustmentsHorizontalIcon',
  (SELECT COALESCE(MAX(menu_order), 0) + 1 FROM menu_master WHERE parent_id = 10),
  2,
  TRUE
)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_url   = 'master-mgmt/workflow',
  menu_name  = 'Workflow Configuration',
  is_active  = TRUE;

COMMIT;
