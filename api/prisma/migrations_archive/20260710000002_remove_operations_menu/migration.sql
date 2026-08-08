-- Remove legacy "Operations" menu entry (MM_OPERATIONS, id 34).
-- Duplicate of the same URL as the real feature "Operation Master" (MM_OPERATION_MASTER), untouched.

DELETE FROM role_menu_mapping WHERE menu_id IN (SELECT id FROM menu_master WHERE menu_code = 'MM_OPERATIONS');
DELETE FROM user_menu_mapping WHERE menu_id IN (SELECT id FROM menu_master WHERE menu_code = 'MM_OPERATIONS');
DELETE FROM menu_master WHERE menu_code = 'MM_OPERATIONS';
