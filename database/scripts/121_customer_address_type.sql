-- ══════════════════════════════════════════════════════════════
-- 121_customer_address_type.sql
-- Master Management → Customer Master → Address Information
--   Address Type dropdown driven by the ADRESS_TYPE lookup
--   (Bill To / Ship To), defaulting to Bill To.
--
--   A Ship To address can be flagged "Same as Bill To", and captures
--   its address as a single free-text block (ship_to_address) rather
--   than the adrs_1 / adrs_2 / adrs_3 lines a Bill To address uses.
--
-- Reference copy of prisma migration 20260728000001_customer_address_type
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- 1. Columns — existing rows fall back to Bill To via the DEFAULT
ALTER TABLE customer_address_info
  ADD COLUMN IF NOT EXISTS adrs_type       VARCHAR(50) NOT NULL DEFAULT 'BILL_TO',
  ADD COLUMN IF NOT EXISTS same_as_bill_to BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ship_to_address TEXT;

-- 2. Lookup values
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('ADRESS_TYPE', 'BILL_TO', 'Bill To', 1, TRUE),
  ('ADRESS_TYPE', 'SHIP_TO', 'Ship To', 2, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

COMMIT;
