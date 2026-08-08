-- ══════════════════════════════════════════════════════════════
-- 117_supplier_rate_contract_uom_rc_lookup.sql
-- Master Management → Supplier Rate Contract → UOM field
--   Replace hardcoded GMS/CTS UOM values with a UOM_RC lookup type:
--     GM - Gram, CT - Carat, PCS - Pieces.
--   Rate Basis "Per Weight" (PER_GM) → GM/CT only.
--   Rate Basis "Per Pc" (PER_PC)     → PCS only.
-- ══════════════════════════════════════════════════════════════

BEGIN;

INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('UOM_RC', 'GM',  'Gram',   1, TRUE),
  ('UOM_RC', 'CT',  'Carat',  2, TRUE),
  ('UOM_RC', 'PCS', 'Pieces', 3, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

-- Migrate existing rows off the old hardcoded values onto the new lookup codes.
UPDATE supplier_rate_contract SET uom = 'GM' WHERE uom = 'GMS';
UPDATE supplier_rate_contract SET uom = 'CT' WHERE uom = 'CTS';

-- Enforce the Rate Basis <-> UOM pairing on pre-existing rows.
UPDATE supplier_rate_contract SET uom = 'PCS' WHERE rate_basis = 'PER_PC' AND uom <> 'PCS';
UPDATE supplier_rate_contract SET uom = 'GM'  WHERE rate_basis = 'PER_GM' AND uom = 'PCS';

ALTER TABLE supplier_rate_contract ALTER COLUMN uom SET DEFAULT 'GM';

COMMIT;
