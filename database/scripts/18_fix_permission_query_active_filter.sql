-- ============================================================
-- 18_fix_permission_query_active_filter.sql
-- Ensure permission_menus_by_role_get only returns menus that
-- are currently active (is_active = TRUE) in menu_master.
-- This makes Permission Management match Menu Master active list.
-- Safe to re-run.
-- ============================================================

UPDATE project_config
SET key_value =
  'SELECT
     m.id          AS menu_id,
     m.menu_code,
     m.menu_name,
     m.parent_id,
     m.menu_level,
     m.menu_order,
     pm.menu_name  AS parent_name,
     COALESCE(rm.can_view,   FALSE) AS can_view,
     COALESCE(rm.can_create, FALSE) AS can_create,
     COALESCE(rm.can_update, FALSE) AS can_update,
     COALESCE(rm.can_delete, FALSE) AS can_delete,
     COALESCE(rm.can_print,  FALSE) AS can_print,
     COALESCE(rm.can_export, FALSE) AS can_export
   FROM menu_master m
   LEFT JOIN role_menu_mapping rm
     ON m.id = rm.menu_id AND rm.role_id = :role_id
   LEFT JOIN menu_master pm
     ON pm.id = m.parent_id AND pm.is_active = TRUE
   WHERE m.is_active = TRUE
     AND (m.parent_id IS NULL OR m.parent_id IN (
       SELECT id FROM menu_master WHERE is_active = TRUE
     ))
   ORDER BY m.menu_level, m.menu_order'
WHERE key_code = 'permission_menus_by_role_get';

-- Verify
SELECT key_code, LEFT(key_value, 80) AS preview
FROM project_config
WHERE key_code = 'permission_menus_by_role_get';
