-- ERP-wide branding & UI settings (key-value store)
CREATE TABLE IF NOT EXISTS erp_settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO erp_settings (key, value) VALUES
  ('erp_logo_url',    NULL),
  ('erp_name',        'IgniteX.ai'),
  ('erp_subtitle',    'ENTERPRICES ERP'),
  ('favicon_url',     NULL),
  ('footer_company',  'IgniteX.ai')
ON CONFLICT (key) DO NOTHING;

-- Add ERP Configuration to System Admin (order 0 = first item)
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active)
VALUES (118, 10, 'SA_ERP_CONFIG', 'ERP Configuration', '/settings/erp-config', 'Settings2', 0, 2, TRUE)
ON CONFLICT (id) DO UPDATE SET
  parent_id  = EXCLUDED.parent_id,
  menu_code  = EXCLUDED.menu_code,
  menu_name  = EXCLUDED.menu_name,
  menu_url   = EXCLUDED.menu_url,
  menu_icon  = EXCLUDED.menu_icon,
  menu_order = EXCLUDED.menu_order,
  is_active  = EXCLUDED.is_active;
