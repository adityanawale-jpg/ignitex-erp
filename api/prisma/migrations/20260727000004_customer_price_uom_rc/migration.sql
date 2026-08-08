-- Move Customer Price Master (metal + stone) off the hardcoded GMS/CTS pair onto
-- the UOM_RC lookup, matching what Supplier Rate Contract already does. Rate Basis
-- "Per Weight" (PER_GM) allows GM/CT; "Per Pc" (PER_PC) is restricted to PCS —
-- enforced in the frontend dropdown and in normalizeRateFields on the controller.

-- Metal: existing rows onto the new lookup codes.
UPDATE customer_price_master_metal SET uom = 'GM' WHERE uom = 'GMS';
UPDATE customer_price_master_metal SET uom = 'CT' WHERE uom = 'CTS';

-- Enforce the Rate Basis <-> UOM pairing on pre-existing metal rows.
UPDATE customer_price_master_metal SET uom = 'PCS' WHERE rate_basis = 'PER_PC' AND uom <> 'PCS';
UPDATE customer_price_master_metal SET uom = 'GM'  WHERE rate_basis = 'PER_GM' AND uom = 'PCS';

ALTER TABLE customer_price_master_metal ALTER COLUMN uom SET DEFAULT 'GM';

-- Stone: same migration, but carats are the natural weight unit here.
UPDATE customer_price_master_stone SET uom = 'CT' WHERE uom = 'CTS';
UPDATE customer_price_master_stone SET uom = 'GM' WHERE uom = 'GMS';

UPDATE customer_price_master_stone SET uom = 'PCS' WHERE rate_basis = 'PER_PC' AND uom <> 'PCS';
UPDATE customer_price_master_stone SET uom = 'CT'  WHERE rate_basis = 'PER_GM' AND uom = 'PCS';

ALTER TABLE customer_price_master_stone ALTER COLUMN uom SET DEFAULT 'CT';
