-- ============================================================
-- 129_sales_order_line_gold_rate.sql
-- Order Management → Sales Order → Order Lines
--
-- Gold Rate now sits on the line itself, between UOM and Price. It is filled
-- from the Daily Rate master when the Item is picked, and it is editable — a
-- line may be struck at a negotiated rate rather than the day's published one,
-- and the line's price is calculated from whichever figure the cell holds.
--
-- Storing it matters because sales_order_lines keeps the resulting price and
-- not its working: without this column, reopening an order would re-derive the
-- breakdown off whatever the rate happens to be today and could no longer
-- explain the price that was actually saved.
--
-- Always ₹ per gram, matching daily_rate_line.rate_per_gram — same precision so
-- a rate copied off a sheet round-trips exactly.
--
-- NULL means no metal rate applied: an amount-priced line, a line whose item is
-- not on the customer's sheet, or an order raised before this column existed.
-- Run after 128_daily_rate_master.sql
-- ============================================================

ALTER TABLE sales_order_lines
  ADD COLUMN IF NOT EXISTS gold_rate NUMERIC(18,4);

COMMENT ON COLUMN sales_order_lines.gold_rate IS
  'Metal rate per gram this line was priced against — from the Daily Rate master unless edited on the line. NULL when no rate applied.';
