-- Vendor Type lookup values for Supplier Master
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('VENDOR_TYPE', 'DOMESTIC',          'Domestic',          1, TRUE),
  ('VENDOR_TYPE', 'INTERNATIONAL',     'International',     2, TRUE),
  ('VENDOR_TYPE', 'SEZ_ZONE_MERCHANT', 'SEZ Zone Merchant', 3, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;
