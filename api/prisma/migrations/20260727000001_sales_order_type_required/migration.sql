-- ══════════════════════════════════════════════════════════════
-- Sales Order — retire the STANDARD order type
--
-- Order Type now decides which master feeds the Customer Item picker
-- (FG Stock / FG Customer → FG Master variants, Finding Order → Finding
-- Master variants), so a generic STANDARD type no longer has a meaning and
-- the column must not silently default to it.
--
-- Existing sales orders already saved as STANDARD are left untouched — the
-- UI keeps showing their stored value so nothing is rewritten behind the
-- user's back; they just have to pick a real type the next time one is edited.
-- ══════════════════════════════════════════════════════════════

-- 1. Drop the dangling column default (the API always sends order_type)
ALTER TABLE sales_order_hdr ALTER COLUMN order_type DROP DEFAULT;

-- 2. Retire the STANDARD lookup value. Deactivated rather than deleted so
--    any historical order referencing it can still resolve a name.
UPDATE master_lookup
SET    is_active           = FALSE,
       deactivation_reason = 'Retired — order type now selects the item master (FG / Finding)',
       deactivated_at      = NOW(),
       updated_at          = NOW()
WHERE  lookup_type = 'SALES_ORDER_TYPE'
  AND  lookup_code = 'STANDARD'
  AND  is_active   = TRUE;

-- 3. Seed the three live order types (no-ops where they already exist)
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('SALES_ORDER_TYPE', 'STK', 'FG Stock Order',    1, TRUE),
  ('SALES_ORDER_TYPE', 'CUS', 'FG Customer Order', 2, TRUE),
  ('SALES_ORDER_TYPE', 'FIO', 'Finding Order',     3, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;
