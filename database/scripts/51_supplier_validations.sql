-- 51_supplier_validations.sql
-- project_config queries for PAN / GSTIN / bank-account duplicate checks
BEGIN;

INSERT INTO project_config (key_code, config_type, description, key_value) VALUES

('supplier_check_pan', 'query', 'Check if pan_card already exists (excludes given id)',
'SELECT EXISTS(
  SELECT 1 FROM supplier_master
  WHERE UPPER(TRIM(pan_card)) = UPPER(TRIM($1))
  AND ($2::int IS NULL OR id != $2)
) AS exists'),

('supplier_check_gstin', 'query', 'Check if gstin_uin_number already exists (excludes given id)',
'SELECT EXISTS(
  SELECT 1 FROM supplier_master
  WHERE UPPER(TRIM(gstin_uin_number)) = UPPER(TRIM($1))
  AND ($2::int IS NULL OR id != $2)
) AS exists'),

('supplier_check_bank_account', 'query', 'Check if bank account number exists across any supplier',
'SELECT EXISTS(
  SELECT 1 FROM supplier_bank_detail sbd
  JOIN supplier_master sm ON sm.id = sbd.supplier_id
  WHERE TRIM(sbd.bank_account_number) = TRIM($1)
  AND ($2::int IS NULL OR sbd.supplier_id != $2)
) AS exists')

ON CONFLICT (key_code) DO UPDATE SET key_value = EXCLUDED.key_value;

COMMIT;
