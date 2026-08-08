-- Migration 101: Adds a user-level, form-wise permission override layer on top
-- of the existing role-wise system (role_menu_mapping).
--
-- Each column in user_menu_mapping is tri-state:
--   NULL  = inherit the role's value (no change to today's behavior)
--   TRUE  = force-allow for this user, even if the role denies it
--   FALSE = force-deny for this user, even if the role allows it
--
-- Effective permission = COALESCE(user_menu_mapping.can_x, role_menu_mapping.can_x, FALSE)
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS user_menu_mapping (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES user_master(user_id) ON DELETE CASCADE,
    menu_id     INT NOT NULL REFERENCES menu_master(id) ON DELETE CASCADE,
    can_view    BOOLEAN,
    can_create  BOOLEAN,
    can_update  BOOLEAN,
    can_delete  BOOLEAN,
    can_print   BOOLEAN,
    can_export  BOOLEAN,
    is_active   BOOLEAN     DEFAULT TRUE,
    created_by  INT,
    updated_by  INT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, menu_id)
);

CREATE INDEX IF NOT EXISTS idx_user_menu_mapping_user ON user_menu_mapping(user_id);

-- ── Nav entry — System Admin submenu, restricted to SYS_ADMIN only ──
INSERT INTO menu_master (parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active)
SELECT 10, 'SA_USER_PERM', 'User-wise Permission Override', '/settings/user-permissions', 'ShieldCheckIcon', 11, 2, TRUE
WHERE NOT EXISTS (SELECT 1 FROM menu_master WHERE menu_code = 'SA_USER_PERM');

INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export)
SELECT 1, m.id, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
FROM menu_master m
WHERE m.menu_code = 'SA_USER_PERM'
ON CONFLICT (role_id, menu_id) DO NOTHING;
