-- ============================================================
-- Remove legacy "Production Departments" menu entry (MM_PROD_DEPT, id 32)
--
-- This was a leftover placeholder menu item that never had a frontend
-- route/page wired up. The real, in-use feature is "Department Master"
-- (MM_DEPT_MASTER), which is untouched by this script.
--
-- Safe to re-run.
-- ============================================================

BEGIN;

DELETE FROM role_menu_mapping WHERE menu_id IN (SELECT id FROM menu_master WHERE menu_code = 'MM_PROD_DEPT');
DELETE FROM user_menu_mapping WHERE menu_id IN (SELECT id FROM menu_master WHERE menu_code = 'MM_PROD_DEPT');
DELETE FROM menu_master WHERE menu_code = 'MM_PROD_DEPT';

COMMIT;
