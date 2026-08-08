-- Customer Price Master → Metal → Plating & Finishing.
--
-- Rhodium, Tricolour Rhodium, Lobster and Silky Rope are charged as amounts,
-- not percentages. Rename the four columns to match, and widen them from
-- NUMERIC(5,2) (capped at 999.99 — unusable for a rupee charge) to
-- NUMERIC(10,2), the same shape hallmark_amt already uses.
--
-- Values carry over as-is; anything previously keyed in as a percentage now
-- reads as rupees and needs re-entering by the business.

ALTER TABLE customer_price_master_metal RENAME COLUMN rhodium_perc          TO rhodium_amt;
ALTER TABLE customer_price_master_metal RENAME COLUMN tricolor_rhodium_perc TO tricolor_rhodium_amt;
ALTER TABLE customer_price_master_metal RENAME COLUMN lobster_perc          TO lobster_amt;
ALTER TABLE customer_price_master_metal RENAME COLUMN silky_rope_perc       TO silky_rope_amt;

ALTER TABLE customer_price_master_metal
  ALTER COLUMN rhodium_amt          TYPE NUMERIC(10,2),
  ALTER COLUMN tricolor_rhodium_amt TYPE NUMERIC(10,2),
  ALTER COLUMN lobster_amt          TYPE NUMERIC(10,2),
  ALTER COLUMN silky_rope_amt       TYPE NUMERIC(10,2);

-- The cust_price_metal_* project_config templates seeded by script 106 are not
-- read by any controller (customerPriceMaster.controller goes through Prisma),
-- but leaving them pointed at dropped columns is a trap for whoever wires them
-- up later. 'rhodium_perc' also covers 'tricolor_rhodium_perc' as a substring.
UPDATE project_config
SET key_value = REPLACE(REPLACE(REPLACE(key_value,
      'rhodium_perc',    'rhodium_amt'),
      'lobster_perc',    'lobster_amt'),
      'silky_rope_perc', 'silky_rope_amt')
WHERE key_code LIKE 'cust_price_metal_%'
  AND key_value LIKE '%_perc%';
