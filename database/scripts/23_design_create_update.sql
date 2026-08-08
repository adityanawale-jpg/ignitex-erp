-- ============================================================
-- 23_design_create_update.sql
-- Adds design_create and design_update to project_config
-- Run after 22_design_image_field.sql
-- ============================================================

BEGIN;

INSERT INTO project_config (key_code, key_value, description, config_type, is_active) VALUES

('design_create',
 'INSERT INTO design_master (design_code, design_no, collection_name, product_name, manufacturing_name, design_attributes) VALUES (:design_code, :design_no, :collection_name, :product_name, :manufacturing_name, :design_attributes::jsonb) RETURNING *',
 'Create design master record', 'query', TRUE),

('design_update',
 'UPDATE design_master SET design_no=:design_no, collection_name=:collection_name, product_name=:product_name, manufacturing_name=:manufacturing_name, design_attributes=:design_attributes::jsonb, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *',
 'Update design master record', 'query', TRUE)

ON CONFLICT (key_code) DO UPDATE SET
  key_value   = EXCLUDED.key_value,
  description = EXCLUDED.description,
  updated_at  = CURRENT_TIMESTAMP;

COMMIT;
