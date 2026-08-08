-- ============================================================
-- 63_metal_master_menu.sql
-- Add Metal Master menu item under Master Management
-- Rename id=24 Components Items → Component Master (Under Construction)
-- Metal Master gets order=3; all existing items from order=3 shift +1
-- Safe to run once. Re-run protection: INSERT ON CONFLICT DO NOTHING.
-- Run after 62_component_to_metal_master.sql
-- ============================================================

BEGIN;

-- ── 0. Sync sequence to avoid duplicate key errors ─────────────
SELECT setval('menu_master_id_seq', (SELECT MAX(id) FROM menu_master));

-- ── 1. Shift Master Management items at order ≥ 3 to make room ─
--    Only shift if Metal Master doesn't exist yet (idempotent guard)
UPDATE menu_master
SET    menu_order = menu_order + 1
WHERE  parent_id  = 2
  AND  menu_order >= 3
  AND  NOT EXISTS (
         SELECT 1 FROM menu_master WHERE menu_code = 'MM_METAL_MASTER'
       );

-- ── 2. Insert Metal Master (skip if already present) ───────────
INSERT INTO menu_master
  (parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active)
VALUES
  (2, 'MM_METAL_MASTER', 'Metal Master', '/master-mgmt/metal-master', 'BeakerIcon', 3, 2, TRUE)
ON CONFLICT (menu_code) DO NOTHING;

-- ── 3. Mirror permissions from Component Items (id=24) ─────────
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT
  src.role_id,
  mm.id,
  src.can_view,
  src.can_create,
  src.can_update,
  src.can_delete
FROM   role_menu_mapping src
JOIN   menu_master mm ON mm.menu_code = 'MM_METAL_MASTER'
WHERE  src.menu_id = 24
ON CONFLICT (role_id, menu_id) DO NOTHING;

-- ── 4. Rename Component Items → Component Master ────────────────
UPDATE menu_master
SET    menu_name = 'Component Master'
WHERE  id = 24
  AND  menu_name <> 'Component Master';

COMMIT;
