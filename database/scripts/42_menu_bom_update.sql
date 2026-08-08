-- ============================================================
-- 42_menu_bom_update.sql
-- Remove Sub Assembly Items (id=23) and Raw Materials Items (id=25)
-- Rename Bill of Materials (BOM) → Bill of Materials(FG BOM)
-- Add  Bill of Materials(SFG BOM) after FG BOM
-- ============================================================

BEGIN;

-- Remove role_menu_mapping rows first (FK has no ON DELETE CASCADE)
DELETE FROM role_menu_mapping WHERE menu_id IN (23, 25);

-- Now remove the two unused menus
DELETE FROM menu_master WHERE id IN (23, 25);

-- Rename BOM → FG BOM and update its code / url / order
UPDATE menu_master
SET menu_code  = 'MM_FG_BOM',
    menu_name  = 'Bill of Materials(FG BOM)',
    menu_url   = '/master-mgmt/fg-bom',
    menu_order = 5
WHERE id = 27;

-- Close the gaps left by the two deleted entries
UPDATE menu_master SET menu_order = 3 WHERE id = 24;  -- Components Items
UPDATE menu_master SET menu_order = 4 WHERE id = 26;  -- Stone Items
-- id=27 already set to 5 above
-- new SFG BOM will be 6
UPDATE menu_master SET menu_order = 7  WHERE id = 28;  -- Supplier Master
UPDATE menu_master SET menu_order = 8  WHERE id = 29;  -- Supplier Rate Contract
UPDATE menu_master SET menu_order = 9  WHERE id = 30;  -- Customer Master
UPDATE menu_master SET menu_order = 10 WHERE id = 31;  -- Customer Price Master
UPDATE menu_master SET menu_order = 11 WHERE id = 32;  -- Production Departments
UPDATE menu_master SET menu_order = 12 WHERE id = 33;  -- Capacity Master
UPDATE menu_master SET menu_order = 13 WHERE id = 34;  -- Operations
UPDATE menu_master SET menu_order = 14 WHERE id = 35;  -- Work Definition
UPDATE menu_master SET menu_order = 15 WHERE id = 36;  -- Min Max Planning

-- Insert Bill of Materials(SFG BOM)
INSERT INTO menu_master (id, parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active)
VALUES (37, 2, 'MM_SFG_BOM', 'Bill of Materials(SFG BOM)', '/master-mgmt/sfg-bom', 'ClipboardListIcon', 6, 2, TRUE);

-- Mirror permissions from FG BOM (id=27) to SFG BOM (id=37) for every role
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT role_id, 37, can_view, can_create, can_update, can_delete
FROM role_menu_mapping
WHERE menu_id = 27
ON CONFLICT (role_id, menu_id) DO NOTHING;

COMMIT;
