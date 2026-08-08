-- Duplicate name check query for Supplier Master
INSERT INTO project_config (key_code, config_type, description, key_value) VALUES
('supplier_check_name', 'query', 'Check if vendor_company_name already exists (case-insensitive, excludes given id)',
'SELECT EXISTS(
  SELECT 1 FROM supplier_master
  WHERE LOWER(TRIM(vendor_company_name)) = LOWER(TRIM($1))
  AND ($2::int IS NULL OR id != $2)
) AS exists')
ON CONFLICT (key_code) DO UPDATE SET key_value = EXCLUDED.key_value;
