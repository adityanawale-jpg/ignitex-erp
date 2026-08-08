-- ============================================================
-- 67_rename_sfg_bom_menu.sql
-- Rename menu: "Bill of Materials(SFG BOM)" → "Bill of Materials (Finding BOM)"
-- ============================================================

BEGIN;

UPDATE menu_master
SET menu_name = 'Bill of Materials (Finding BOM)'
WHERE menu_code = 'MM_SFG_BOM'
  AND menu_name <> 'Bill of Materials (Finding BOM)';

COMMIT;
