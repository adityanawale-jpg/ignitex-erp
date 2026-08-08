-- Migration 71: Move Alloy Master menu from Purchase Management
-- to Master Management (parent_id=2) and mirror role permissions

-- Ensure Alloy Master is under Master Management (parent_id = 2)
UPDATE menu_master
SET
  parent_id  = 2,
  menu_name  = 'Alloy Master',
  menu_url   = '/master-mgmt/alloys',
  menu_icon  = 'BeakerIcon',
  menu_level = 2
WHERE menu_code = 'MM_ALLOY_MASTER';

-- Mirror role permissions from Metal Master
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT
  src.role_id,
  mm.id,
  src.can_view,
  src.can_create,
  src.can_update,
  src.can_delete
FROM   role_menu_mapping src
JOIN   menu_master mm ON mm.menu_code = 'MM_ALLOY_MASTER'
WHERE  src.menu_id = (SELECT id FROM menu_master WHERE menu_code = 'MM_METAL_MASTER' LIMIT 1)
ON CONFLICT (role_id, menu_id) DO NOTHING;
