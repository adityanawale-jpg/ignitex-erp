-- ============================================================
-- Remove legacy "Operations" menu entry (MM_OPERATIONS, id 34)
--
-- This was a leftover placeholder menu item pointing at the same URL
-- (/master-mgmt/operations) as the real, in-use feature "Operation
-- Master" (MM_OPERATION_MASTER, id 40), which is untouched by this
-- script. MM_OPERATIONS is not referenced anywhere in app/src or
-- api/src (no usePermission() calls, no route registration).
--
-- Safe to re-run.
-- ============================================================

BEGIN;

DELETE FROM role_menu_mapping WHERE menu_id IN (SELECT id FROM menu_master WHERE menu_code = 'MM_OPERATIONS');
DELETE FROM user_menu_mapping WHERE menu_id IN (SELECT id FROM menu_master WHERE menu_code = 'MM_OPERATIONS');
DELETE FROM menu_master WHERE menu_code = 'MM_OPERATIONS';

COMMIT;
