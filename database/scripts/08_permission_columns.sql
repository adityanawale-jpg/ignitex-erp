-- ============================================================
-- 08_permission_columns.sql
-- Add can_print and can_export permission columns to role_menu_mapping.
-- Update project_config dynamic queries to include new columns.
-- Run AFTER 07_user_role_seed.sql.
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT DO UPDATE).
-- ============================================================

BEGIN;

-- ── 1. Add columns to role_menu_mapping ──────────────────────
ALTER TABLE role_menu_mapping
  ADD COLUMN IF NOT EXISTS can_print  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_export BOOLEAN NOT NULL DEFAULT FALSE;

-- Grant SYS_ADMIN all new permissions
UPDATE role_menu_mapping
SET can_print = TRUE, can_export = TRUE
WHERE role_id = (SELECT id FROM role_master WHERE role_code = 'SYS_ADMIN');

-- Grant PROCESS_ADMIN print + export
UPDATE role_menu_mapping
SET can_print = TRUE, can_export = TRUE
WHERE role_id = (SELECT id FROM role_master WHERE role_code = 'PROCESS_ADMIN');

-- Grant MANAGER print + export
UPDATE role_menu_mapping
SET can_print = TRUE, can_export = TRUE
WHERE role_id = (SELECT id FROM role_master WHERE role_code = 'MANAGER');

-- ── 2. Update permission_menus_by_role_get ───────────────────
UPDATE project_config
SET key_value =
  'SELECT m.id as menu_id, m.menu_code, m.menu_name, m.parent_id, m.menu_level, m.menu_order,
          pm.menu_name as parent_name,
          COALESCE(rm.can_view,   FALSE) as can_view,
          COALESCE(rm.can_create, FALSE) as can_create,
          COALESCE(rm.can_update, FALSE) as can_update,
          COALESCE(rm.can_delete, FALSE) as can_delete,
          COALESCE(rm.can_print,  FALSE) as can_print,
          COALESCE(rm.can_export, FALSE) as can_export
   FROM menu_master m
   LEFT JOIN role_menu_mapping rm ON m.id = rm.menu_id AND rm.role_id = :role_id
   LEFT JOIN menu_master pm ON pm.id = m.parent_id
   WHERE m.is_active = TRUE
   ORDER BY m.menu_level, m.menu_order'
WHERE key_code = 'permission_menus_by_role_get';

-- ── 3. Update permission_upsert ──────────────────────────────
UPDATE project_config
SET key_value =
  'INSERT INTO role_menu_mapping
     (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export, is_active)
   VALUES
     (:role_id, :menu_id, :can_view, :can_create, :can_update, :can_delete, :can_print, :can_export, TRUE)
   ON CONFLICT (role_id, menu_id) DO UPDATE SET
     can_view   = EXCLUDED.can_view,
     can_create = EXCLUDED.can_create,
     can_update = EXCLUDED.can_update,
     can_delete = EXCLUDED.can_delete,
     can_print  = EXCLUDED.can_print,
     can_export = EXCLUDED.can_export,
     is_active  = TRUE
   RETURNING *'
WHERE key_code = 'permission_upsert';

-- ── 4. Update menu_get (used by sidebar on login) ────────────
UPDATE project_config
SET key_value =
  'SELECT m.*, rm.can_view, rm.can_create, rm.can_update, rm.can_delete, rm.can_print, rm.can_export
   FROM menu_master m
   LEFT JOIN role_menu_mapping rm ON m.id = rm.menu_id AND rm.role_id = :role_id
   WHERE m.is_active = TRUE
   ORDER BY m.menu_level, m.menu_order'
WHERE key_code = 'menu_get';

COMMIT;
