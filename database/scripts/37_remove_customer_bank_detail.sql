-- ============================================================
-- 37_remove_customer_bank_detail.sql
-- Remove customer_bank_detail table (bank details no longer
-- collected on the Customer Master form)
-- Run after 36_customer_master.sql
-- ============================================================

BEGIN;

DROP INDEX  IF EXISTS idx_cust_bank_cid;
DROP TABLE  IF EXISTS customer_bank_detail;

COMMIT;
