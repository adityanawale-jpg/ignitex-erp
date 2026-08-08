-- ============================================================
-- ADMIN MASTERS MIGRATION
-- Adds: Menu Master, Role Master, Permission Master
-- Run this AFTER 00_reset_and_init.sql
-- ============================================================

BEGIN;

-- ============================================================
-- NEW MENU ITEMS (Menu Master, Permission Master, Mail Config)
-- ============================================================
INSERT INTO menu_master (parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level)
VALUES
  (8, 'MENU_MASTER',       'Menu Master',       '/settings/menus',       'ListBulletIcon', 4, 2),
  (8, 'PERMISSION_MASTER', 'Permission Master', '/settings/permissions', 'ShieldCheckIcon',5, 2),
  (8, 'MAIL_CONFIG',       'Mail Config',       '/settings/mail-config', 'EnvelopeIcon',   6, 2)
ON CONFLICT (menu_code) DO NOTHING;

-- Grant ADMIN role full access to the new menus
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT 1, id, TRUE, TRUE, TRUE, TRUE
FROM menu_master
WHERE menu_code IN ('MENU_MASTER', 'PERMISSION_MASTER', 'MAIL_CONFIG')
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- ============================================================
-- DYNAMIC QUERIES — MENU MASTER
-- ============================================================
INSERT INTO project_config (key_code, key_value, description, config_type) VALUES

('menu_master_list_get',
 'SELECT m.id, m.parent_id, m.menu_code, m.menu_name, m.menu_url, m.menu_icon, m.menu_order, m.menu_level, m.is_active, m.created_at, pm.menu_name as parent_name FROM menu_master m LEFT JOIN menu_master pm ON pm.id = m.parent_id ORDER BY m.menu_level, m.menu_order, m.id',
 'Get all menus with parent name', 'query'),

('menu_master_create',
 'INSERT INTO menu_master (parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active) VALUES (:parent_id, :menu_code, :menu_name, :menu_url, :menu_icon, :menu_order, :menu_level, :is_active) RETURNING *',
 'Create new menu item', 'query'),

('menu_master_update',
 'UPDATE menu_master SET parent_id=:parent_id, menu_name=:menu_name, menu_url=:menu_url, menu_icon=:menu_icon, menu_order=:menu_order, menu_level=:menu_level, is_active=:is_active WHERE id=:id RETURNING *',
 'Update menu item', 'query'),

('menu_master_delete',
 'UPDATE menu_master SET is_active=FALSE WHERE id=:id RETURNING id',
 'Soft delete menu item', 'query'),

-- ============================================================
-- DYNAMIC QUERIES — ROLE MASTER
-- ============================================================
('role_master_list_get',
 'SELECT id, role_code, role_name, description, is_active, created_at, updated_at FROM role_master ORDER BY id',
 'Get all roles', 'query'),

('role_master_create',
 'INSERT INTO role_master (role_code, role_name, description, is_active) VALUES (:role_code, :role_name, :description, :is_active) RETURNING *',
 'Create new role', 'query'),

('role_master_update',
 'UPDATE role_master SET role_name=:role_name, description=:description, is_active=:is_active, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *',
 'Update role', 'query'),

('role_master_delete',
 'UPDATE role_master SET is_active=FALSE, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING id',
 'Soft delete role', 'query'),

-- ============================================================
-- DYNAMIC QUERIES — PERMISSION MASTER
-- ============================================================
('permission_menus_by_role_get',
 'SELECT m.id as menu_id, m.menu_code, m.menu_name, m.parent_id, m.menu_level, m.menu_order, pm.menu_name as parent_name, COALESCE(rm.can_view, FALSE) as can_view, COALESCE(rm.can_create, FALSE) as can_create, COALESCE(rm.can_update, FALSE) as can_update, COALESCE(rm.can_delete, FALSE) as can_delete FROM menu_master m LEFT JOIN role_menu_mapping rm ON m.id = rm.menu_id AND rm.role_id = :role_id LEFT JOIN menu_master pm ON pm.id = m.parent_id WHERE m.is_active = TRUE ORDER BY m.menu_level, m.menu_order',
 'Get all menus with permission flags for a specific role', 'query'),

('permission_upsert',
 'INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete, is_active) VALUES (:role_id, :menu_id, :can_view, :can_create, :can_update, :can_delete, TRUE) ON CONFLICT (role_id, menu_id) DO UPDATE SET can_view=EXCLUDED.can_view, can_create=EXCLUDED.can_create, can_update=EXCLUDED.can_update, can_delete=EXCLUDED.can_delete, is_active=TRUE RETURNING *',
 'Upsert a single role-menu permission row', 'query'),

('permission_remove',
 'DELETE FROM role_menu_mapping WHERE role_id=:role_id AND menu_id=:menu_id RETURNING id',
 'Remove a role-menu permission mapping', 'query')

ON CONFLICT (key_code) DO NOTHING;

COMMIT;
