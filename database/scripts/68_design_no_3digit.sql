-- Change design_no sequence padding from 5 digits to 3 digits
UPDATE project_config
SET key_value = 'SELECT LPAD((COALESCE(MAX(CASE WHEN design_no ~ ''^[0-9]+$'' THEN design_no::integer ELSE 0 END), 0) + 1)::text, 3, ''0'') AS next_no FROM design_master WHERE product_name = :product_name AND collection_name = :collection_name AND is_active = TRUE'
WHERE key_code = 'design_next_no';
