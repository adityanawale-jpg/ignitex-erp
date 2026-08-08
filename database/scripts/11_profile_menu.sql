-- Add User Profile to System Admin menu
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active)
VALUES (117, 10, 'SA_USER_PROFILE', 'User Profile', '/profile', 'UserCircle', 1, 2, TRUE)
ON CONFLICT (id) DO UPDATE SET
  parent_id  = EXCLUDED.parent_id,
  menu_code  = EXCLUDED.menu_code,
  menu_name  = EXCLUDED.menu_name,
  menu_url   = EXCLUDED.menu_url,
  menu_icon  = EXCLUDED.menu_icon,
  menu_order = EXCLUDED.menu_order,
  is_active  = EXCLUDED.is_active;
