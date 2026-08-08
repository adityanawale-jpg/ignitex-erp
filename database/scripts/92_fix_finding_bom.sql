-- ============================================================
-- 92_fix_finding_bom.sql
-- Fixes for Finding BOM (migration 91 patch)
--
-- Fix 1: fin_bom_stats — add im.is_active = TRUE to WHERE clause
--         (was counting variants of inactive masters, causing
--          draft count to exceed the list row count)
-- Fix 2: fin_bom_lov_components — wrong table name
--         (component_item_master no longer exists; correct table
--          is component_master with component_code/component_name)
-- ============================================================

BEGIN;

-- ── Fix 1: fin_bom_stats ─────────────────────────────────────────
UPDATE project_config SET key_value =
$q$SELECT
  COUNT(*) FILTER (WHERE bf.bom_status = 'DRAFT' OR bf.id IS NULL) AS draft,
  COUNT(*) FILTER (WHERE bf.bom_status = 'PENDING_APPROVAL')       AS pending_approval,
  COUNT(*) FILTER (WHERE bf.bom_status = 'ACTIVE')                 AS active
FROM fin_item_variant iv
JOIN fin_item_master im ON iv.item_id = im.id
LEFT JOIN LATERAL (
  SELECT id, bom_status
  FROM   bom_fin
  WHERE  variant_id = iv.id AND is_active = TRUE
  ORDER  BY created_at DESC LIMIT 1
) bf ON TRUE
WHERE iv.is_active = TRUE AND im.is_active = TRUE$q$
WHERE key_code = 'fin_bom_stats';

-- ── Fix 2: fin_bom_lov_components ────────────────────────────────
UPDATE project_config SET key_value =
'SELECT id,
       component_code AS code,
       COALESCE(CONCAT_WS('' - '', component_name, component_desc), component_code) AS name,
       component_type
FROM   component_master
WHERE  is_active = TRUE
  AND (component_code ILIKE $1
    OR COALESCE(component_name,'''') ILIKE $1
    OR COALESCE(component_desc,'''') ILIKE $1)
ORDER  BY component_code LIMIT 60'
WHERE key_code = 'fin_bom_lov_components';

-- ── FIN_ITEM_TYPE LOV ────────────────────────────────────────────
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('FIN_ITEM_TYPE', 'STONE',     'Stone',     1, TRUE),
  ('FIN_ITEM_TYPE', 'METAL',     'Metal',     2, TRUE),
  ('FIN_ITEM_TYPE', 'COMPONENT', 'Component', 3, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

COMMIT;
