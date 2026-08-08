-- Remove legacy "Production Departments" menu entry (MM_PROD_DEPT, id 32).
-- Never had a frontend route/page — real feature is "Department Master" (MM_DEPT_MASTER), untouched.

DELETE FROM role_menu_mapping WHERE menu_id IN (SELECT id FROM menu_master WHERE menu_code = 'MM_PROD_DEPT');
DELETE FROM user_menu_mapping WHERE menu_id IN (SELECT id FROM menu_master WHERE menu_code = 'MM_PROD_DEPT');
DELETE FROM menu_master WHERE menu_code = 'MM_PROD_DEPT';
