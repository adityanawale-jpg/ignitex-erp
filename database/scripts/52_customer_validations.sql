-- 52_customer_validations.sql
-- project_config queries for Customer Master duplicate checks
BEGIN;

INSERT INTO project_config (key_code, config_type, description, key_value) VALUES

('customer_check_name', 'query', 'Check if customer_name already exists (case-insensitive, excludes given id)',
'SELECT EXISTS(
  SELECT 1 FROM customer_master
  WHERE LOWER(TRIM(customer_name)) = LOWER(TRIM($1))
  AND ($2::int IS NULL OR id != $2)
) AS exists'),

('customer_check_company', 'query', 'Check if customer_company_name already exists (case-insensitive, excludes given id)',
'SELECT EXISTS(
  SELECT 1 FROM customer_master
  WHERE LOWER(TRIM(customer_company_name)) = LOWER(TRIM($1))
  AND ($2::int IS NULL OR id != $2)
) AS exists'),

('customer_check_pan', 'query', 'Check if pan_card already exists (case-insensitive, excludes given id)',
'SELECT EXISTS(
  SELECT 1 FROM customer_master
  WHERE UPPER(TRIM(pan_card)) = UPPER(TRIM($1))
  AND ($2::int IS NULL OR id != $2)
) AS exists'),

('customer_check_gstin', 'query', 'Check if gstin_uin_number already exists (case-insensitive, excludes given id)',
'SELECT EXISTS(
  SELECT 1 FROM customer_master
  WHERE UPPER(TRIM(gstin_uin_number)) = UPPER(TRIM($1))
  AND ($2::int IS NULL OR id != $2)
) AS exists')

ON CONFLICT (key_code) DO UPDATE SET key_value = EXCLUDED.key_value;

COMMIT;
