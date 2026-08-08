-- ============================================================
-- 66_rename_fg_tables.sql
-- Rename FG item tables and update menu name:
--   item_master         → fg_item_master
--   item_variant        → fg_item_variant
--   item_variant_client → fg_item_variant_client
--   (item_metal_bom and item_stone_bom were dropped in script 38)
-- Menu: "Finished goods Items" → "FG Master"
-- Also updates all project_config key_value references.
-- Safe to re-run (IF EXISTS guards on index renames).
-- ============================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════
-- 1. RENAME TABLES
--    PostgreSQL automatically updates FK references when a
--    referenced table is renamed, so no FK drops needed.
-- ══════════════════════════════════════════════════════════════
ALTER TABLE item_master         RENAME TO fg_item_master;
ALTER TABLE item_variant        RENAME TO fg_item_variant;
ALTER TABLE item_variant_client RENAME TO fg_item_variant_client;

-- ══════════════════════════════════════════════════════════════
-- 2. RENAME KNOWN INDEXES (names stay on old table after rename)
-- ══════════════════════════════════════════════════════════════
ALTER INDEX IF EXISTS idx_ivc_variant RENAME TO idx_fg_ivc_variant;

-- ══════════════════════════════════════════════════════════════
-- 3. UPDATE project_config key_value — replace table names
--
--    Order matters:
--      a) item_variant_client first  (subset of item_variant)
--      b) item_variant second
--      c) item_metal_bom
--      d) item_master last
--         (\m / \M = word-boundary in PostgreSQL POSIX regex,
--          so "stone_item_master" and "component_item_master"
--          are NOT matched — underscore is a word char, so
--          there is no boundary before "item" in those names)
-- ══════════════════════════════════════════════════════════════

-- a) item_variant_client → fg_item_variant_client
UPDATE project_config
SET key_value = regexp_replace(key_value, '\mitem_variant_client\M', 'fg_item_variant_client', 'g')
WHERE key_value LIKE '%item_variant_client%';

-- b) item_variant → fg_item_variant
UPDATE project_config
SET key_value = regexp_replace(key_value, '\mitem_variant\M', 'fg_item_variant', 'g')
WHERE key_value LIKE '%item_variant%';

-- c) item_master → fg_item_master (word-boundary keeps stone/component untouched)
UPDATE project_config
SET key_value = regexp_replace(key_value, '\mitem_master\M', 'fg_item_master', 'g')
WHERE key_value LIKE '%item_master%';

-- ══════════════════════════════════════════════════════════════
-- 4. RENAME MENU
-- ══════════════════════════════════════════════════════════════
UPDATE menu_master
SET menu_name = 'FG Master'
WHERE menu_code = 'MM_FG_ITEMS'
  AND menu_name <> 'FG Master';

COMMIT;
