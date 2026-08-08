-- ============================================================
-- IGNITEX.AI ERP - Add inactive_date & inactive_reason to user_master
-- Version: 3.0.0
-- Safe to run once against an existing database.
-- ============================================================

BEGIN;

ALTER TABLE user_master
  ADD COLUMN IF NOT EXISTS inactive_date   DATE,
  ADD COLUMN IF NOT EXISTS inactive_reason VARCHAR(500);

COMMENT ON COLUMN user_master.inactive_date   IS 'Date the user was deactivated';
COMMENT ON COLUMN user_master.inactive_reason IS 'Reason provided when the user was deactivated';

COMMIT;
