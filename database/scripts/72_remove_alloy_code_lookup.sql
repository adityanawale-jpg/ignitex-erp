-- ============================================================
-- 72_remove_alloy_code_lookup.sql
-- Remove ALLOY_CODE entries from master_lookup.
-- Standard Alloy and Customer Alloy now resolve from alloy_master
-- instead of master_lookup. The stored alloy_code values in
-- item_variant (standard_alloy) and item_variant_client (alloy_code)
-- remain as-is — they now reference alloy_master.alloy_code.
-- Safe to re-run (DELETE is idempotent when rows are gone).
-- ============================================================

BEGIN;

DELETE FROM master_lookup WHERE lookup_type = 'ALLOY_CODE';

COMMIT;
