-- ============================================================
-- 65_metal_name_lookup_seed.sql
-- Seed LOV records for METAL_NAME lookup type.
-- Metal Master uses METAL_NAME as the lookup type for the
-- Metal Name field (e.g. GB = Gold Bar, WG = White Gold, etc.)
-- Safe to re-run — ON CONFLICT DO NOTHING.
-- ============================================================

BEGIN;

INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active)
VALUES
  ('METAL_NAME', 'GB',  'Gold Bar',      1, TRUE),
  ('METAL_NAME', 'WG',  'White Gold',    2, TRUE),
  ('METAL_NAME', 'YG',  'Yellow Gold',   3, TRUE),
  ('METAL_NAME', 'RG',  'Rose Gold',     4, TRUE),
  ('METAL_NAME', 'GN',  'Gold Nugget',   5, TRUE),
  ('METAL_NAME', 'SLV', 'Silver',        6, TRUE),
  ('METAL_NAME', 'PT',  'Platinum',      7, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

COMMIT;
