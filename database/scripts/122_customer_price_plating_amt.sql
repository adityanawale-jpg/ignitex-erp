-- ══════════════════════════════════════════════════════════════
-- 122_customer_price_plating_amt.sql
-- Master Management → Customer Price Master → Metal tab
--   Plating & Finishing (Rhodium, Tricolour Rhodium, Lobster,
--   Silky Rope) are amounts, not percentages.
--
--   Renames the four *_perc columns to *_amt and widens them from
--   NUMERIC(5,2) — capped at 999.99, unusable for a rupee charge —
--   to NUMERIC(10,2), matching hallmark_amt.
--
--   Values carry over unchanged; anything previously entered as a
--   percentage now reads as rupees and must be re-keyed.
--
-- Reference copy of prisma migration 20260728000002_customer_price_plating_amt
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- 1. Rename
ALTER TABLE customer_price_master_metal RENAME COLUMN rhodium_perc          TO rhodium_amt;
ALTER TABLE customer_price_master_metal RENAME COLUMN tricolor_rhodium_perc TO tricolor_rhodium_amt;
ALTER TABLE customer_price_master_metal RENAME COLUMN lobster_perc          TO lobster_amt;
ALTER TABLE customer_price_master_metal RENAME COLUMN silky_rope_perc       TO silky_rope_amt;

-- 2. Widen to money-sized precision
ALTER TABLE customer_price_master_metal
  ALTER COLUMN rhodium_amt          TYPE NUMERIC(10,2),
  ALTER COLUMN tricolor_rhodium_amt TYPE NUMERIC(10,2),
  ALTER COLUMN lobster_amt          TYPE NUMERIC(10,2),
  ALTER COLUMN silky_rope_amt       TYPE NUMERIC(10,2);

-- 3. Keep the (currently unused) cust_price_metal_* templates from script 106
--    off the dropped column names. 'rhodium_perc' also covers
--    'tricolor_rhodium_perc' as a substring.
UPDATE project_config
SET key_value = REPLACE(REPLACE(REPLACE(key_value,
      'rhodium_perc',    'rhodium_amt'),
      'lobster_perc',    'lobster_amt'),
      'silky_rope_perc', 'silky_rope_amt')
WHERE key_code LIKE 'cust_price_metal_%'
  AND key_value LIKE '%_perc%';

COMMIT;
