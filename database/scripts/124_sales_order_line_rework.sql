-- ══════════════════════════════════════════════════════════════
-- 124_sales_order_line_rework.sql
-- Order Management → Sales Order
--   Order Details : Price Matrix dropped entirely.
--   Order Lines   : Item Description dropped; Customer Item / Item swapped so
--                   Item is the picked SKU and Customer Item is derived from it;
--                   new Sales Group; Warehouse becomes Inventory Org, and both
--                   it and Subinventory now come from Inventory Structure
--                   (stored as codes) instead of free-text lookup values.
--
-- Reference copy of prisma migration 20260728000004_sales_order_line_rework
-- Run after 123_variant_lead_time.sql
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Order Details: Price Matrix ───────────────────────────
ALTER TABLE sales_order_hdr DROP COLUMN IF EXISTS price_matrix;

-- ── 2. Order Lines: Item Description ─────────────────────────
ALTER TABLE sales_order_lines DROP COLUMN IF EXISTS item_desc;

-- ── 3. Swap Customer Item ⇄ Item ─────────────────────────────
-- The picked SKU has always been stored in customer_item and the customer's own
-- code in item_name — the screen labelled them the other way round. Renaming the
-- columns (rather than moving values between them) leaves every existing row's
-- meaning intact.
ALTER TABLE sales_order_lines RENAME COLUMN customer_item TO swap_tmp_item;
ALTER TABLE sales_order_lines RENAME COLUMN item_name     TO customer_item;
ALTER TABLE sales_order_lines RENAME COLUMN swap_tmp_item TO item_name;

-- Item now holds SKU codes (fg/fin_item_variant.sku_code is VARCHAR(150)) so it
-- takes the wider type. Customer Item shows the client variant's code and name
-- together, so it has to hold both: customer_variant_code VARCHAR(100) + the
-- " — " separator + customer_variant_name VARCHAR(200) = 303 at worst.
ALTER TABLE sales_order_lines ALTER COLUMN item_name     TYPE VARCHAR(300);
ALTER TABLE sales_order_lines ALTER COLUMN customer_item TYPE VARCHAR(320);

-- ── 4. Sales Group ───────────────────────────────────────────
-- Filled from the picked variant's group_sales (a GROUP_SALES lookup code), so
-- it matches fg/fin_item_variant.group_sales VARCHAR(100).
ALTER TABLE sales_order_lines ADD COLUMN IF NOT EXISTS sales_group VARCHAR(100);

-- ── 5. Warehouse → Inventory Org ─────────────────────────────
ALTER TABLE sales_order_lines RENAME COLUMN supply_warehouse TO inventory_org;

-- Inventory Org / Subinventory used to hold free-text names typed against the
-- WAREHOUSE / SUBINVENTORY lookup types, which no longer feed these cells. Map
-- anything that matches an Inventory Structure row for the order's own Business
-- Unit onto that row's code, then blank whatever is left: an unmatched value is
-- not selectable in the new dropdowns and would otherwise re-save silently.
UPDATE sales_order_lines l SET inventory_org = s.inv_org_code
FROM   sales_order_hdr h, inventory_structure s
LEFT   JOIN master_lookup org ON org.lookup_type = 'INV_ORG' AND org.lookup_code = s.inv_org_code
WHERE  h.id = l.order_id
  AND  s.inv_bu_code = h.buss_unit_id
  AND  s.is_active = TRUE
  AND  l.inventory_org IS NOT NULL
  AND  (l.inventory_org = s.inv_org_code OR l.inventory_org = org.lookup_name);

UPDATE sales_order_lines SET inventory_org = NULL
WHERE  inventory_org IS NOT NULL
  AND  inventory_org NOT IN (SELECT inv_org_code FROM inventory_structure);

ALTER TABLE sales_order_lines ALTER COLUMN inventory_org TYPE VARCHAR(50);

-- ── 6. Subinventory from Inventory Structure ─────────────────
UPDATE sales_order_lines l SET supply_subinventory = s.sub_inv_code
FROM   sales_order_hdr h, inventory_structure s
WHERE  h.id = l.order_id
  AND  s.inv_bu_code = h.buss_unit_id
  AND  s.is_active = TRUE
  AND  l.supply_subinventory IS NOT NULL
  AND  (l.supply_subinventory = s.sub_inv_code OR l.supply_subinventory = s.sub_inv_name);

UPDATE sales_order_lines SET supply_subinventory = NULL
WHERE  supply_subinventory IS NOT NULL
  AND  supply_subinventory NOT IN (SELECT sub_inv_code FROM inventory_structure);

COMMIT;
