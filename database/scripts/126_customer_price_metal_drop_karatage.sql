-- ══════════════════════════════════════════════════════════════
-- 126_customer_price_metal_drop_karatage.sql
-- Master Management → Customer Price Master → Metal
--
-- Karatage is dropped from the price entry. It also sat in the table's unique
-- key, so the key narrows to (customer_id, itemtype, sku_code) — which is
-- stricter: two rows for the same customer/item type/SKU that were previously
-- kept apart by karatage would now collide.
--
-- The guard below fails the migration with the conflicting combinations named,
-- rather than letting Postgres reject the index with a generic duplicate-key
-- error. Nothing is deleted or merged automatically: which of two competing
-- prices survives is a pricing decision, not a migration's to make.
-- Reference copy of prisma migration 20260728000006_customer_price_metal_drop_karatage
-- Run after 125_fix_design_query_templates.sql
-- ══════════════════════════════════════════════════════════════

BEGIN;


DO $$
DECLARE
  conflicts TEXT;
BEGIN
  SELECT string_agg(format('customer_id=%s / %s / %s (%s rows)', customer_id, itemtype, sku_code, n), '; ')
  INTO   conflicts
  FROM (
    SELECT customer_id, itemtype, sku_code, COUNT(*) AS n
    FROM   customer_price_master_metal
    GROUP  BY customer_id, itemtype, sku_code
    HAVING COUNT(*) > 1
  ) d;

  IF conflicts IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot drop karatage — these customer/item-type/SKU combinations exist more than once and are only kept apart by karatage: %. Merge or remove the extra rows in Customer Price Master, then re-run.', conflicts;
  END IF;
END $$;

ALTER TABLE customer_price_master_metal DROP CONSTRAINT IF EXISTS uq_cust_price_metal_cust_item_sku_karat;
ALTER TABLE customer_price_master_metal DROP COLUMN IF EXISTS karatage;
ALTER TABLE customer_price_master_metal
  ADD CONSTRAINT uq_cust_price_metal_cust_item_sku UNIQUE (customer_id, itemtype, sku_code);

COMMIT;
