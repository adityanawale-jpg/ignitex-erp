-- ============================================================
-- 60_drop_unused_tables.sql
-- Remove 9 tables that have no frontend pages or API usage.
-- CASCADE handles all FK constraints automatically.
-- Drop order: dependents first, then parents.
-- ============================================================

BEGIN;

-- ── 1. Dependent tables first ─────────────────────────────────
DROP TABLE IF EXISTS sales_order_items  CASCADE;
DROP TABLE IF EXISTS stock_ledger       CASCADE;
DROP TABLE IF EXISTS purchase_order     CASCADE;
DROP TABLE IF EXISTS sales_order        CASCADE;

-- ── 2. Parent tables ──────────────────────────────────────────
DROP TABLE IF EXISTS product_master      CASCADE;
DROP TABLE IF EXISTS category_master     CASCADE;
DROP TABLE IF EXISTS metal_master        CASCADE;
DROP TABLE IF EXISTS notification_master CASCADE;
-- audit_log intentionally NOT dropped — has active frontend page + written on every action

-- ── 3. Remove related project_config query entries ────────────
DELETE FROM project_config
WHERE key_code IN (
  'product_list_get',
  'metal_list_get',
  'category_list_get',
  'notifications_get',
  'sales_order_list_get',
  'dashboard_stats_get'
);

COMMIT;
