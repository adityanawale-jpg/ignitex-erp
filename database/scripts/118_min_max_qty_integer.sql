-- ══════════════════════════════════════════════════════════════
-- 118_min_max_qty_integer.sql
-- Master Management → Min/Max Planning → Quantity Planning fields
--   Min Qty / Max Qty / MOQ Qty are whole numbers only — convert the
--   columns from NUMERIC(12,4) to INTEGER. Weight fields are untouched.
-- ══════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE min_max_planning_master
  ALTER COLUMN min_quantity TYPE INTEGER USING ROUND(min_quantity)::INTEGER,
  ALTER COLUMN max_quantity TYPE INTEGER USING ROUND(max_quantity)::INTEGER,
  ALTER COLUMN moq_quantity TYPE INTEGER USING ROUND(moq_quantity)::INTEGER;

ALTER TABLE min_max_planning_master
  ALTER COLUMN min_quantity SET DEFAULT 0,
  ALTER COLUMN max_quantity SET DEFAULT 0,
  ALTER COLUMN moq_quantity SET DEFAULT 0;

COMMIT;
