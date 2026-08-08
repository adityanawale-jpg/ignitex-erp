-- ============================================================
-- 73_fg_bom_unified_grid.sql
-- FG BOM: Unified single-grid BOM lines replacing 3-tab design
--
-- Changes:
--   1. FG_ITEM_TYPE LOV (FINDING, STONE, METAL, COMPONENT)
--   2. item_type column on bom_fg_detail
--   3. component_weight column on bom_fg_detail and bom_fg header
--   4. Updated project_config queries for new schema
--   5. Fix fg_bom_lov_components → now searches component_master
--   6. Add fg_bom_lov_metals → searches metal_master
-- Run after 72_remove_alloy_code_lookup.sql
-- ============================================================

BEGIN;

-- ── 1. FG_ITEM_TYPE LOV ──────────────────────────────────────────
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('FG_ITEM_TYPE', 'FINDING',   'Finding',   1, TRUE),
  ('FG_ITEM_TYPE', 'STONE',     'Stone',     2, TRUE),
  ('FG_ITEM_TYPE', 'METAL',     'Metal',     3, TRUE),
  ('FG_ITEM_TYPE', 'COMPONENT', 'Component', 4, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

-- ── 2. Add item_type to bom_fg_detail ───────────────────────────
ALTER TABLE bom_fg_detail
  ADD COLUMN IF NOT EXISTS item_type VARCHAR(50);

-- ── 3. Add component_weight to bom_fg_detail ────────────────────
ALTER TABLE bom_fg_detail
  ADD COLUMN IF NOT EXISTS component_weight NUMERIC(12,6) DEFAULT 0;

-- ── 4. Add component_weight to bom_fg header ────────────────────
ALTER TABLE bom_fg
  ADD COLUMN IF NOT EXISTS component_weight NUMERIC(12,6) DEFAULT 0;

-- ── 5. Backfill item_type from existing bom_type ─────────────────
UPDATE bom_fg_detail
  SET item_type = CASE bom_type
    WHEN 'SFG_BOM'   THEN 'FINDING'
    WHEN 'METAL_BOM' THEN 'METAL'
    WHEN 'STONE_BOM' THEN 'STONE'
    ELSE bom_type
  END
WHERE item_type IS NULL;

-- ── 6. fg_bom_detail_insert — add item_type ($3) and component_weight ($19)
-- Full param order:
--   $1 bom_id, $2 bom_type (=item_type), $3 item_type, $4 seq_no,
--   $5 item_id, $6 item_code, $7 item_name,
--   $8 item_quantity, $9 uom1_code, $10 item_weight, $11 uom2_code,
--   $12 purity_code, $13 pure_weight, $14 weight_gms,
--   $15 gross_weight, $16 net_weight, $17 stone_cts, $18 stone_gms,
--   $19 component_weight, $20 remarks, $21 created_by
UPDATE project_config SET key_value =
'INSERT INTO bom_fg_detail
  (bom_id, bom_type, item_type, seq_no, item_id, item_code, item_name,
   item_quantity, uom1_code, item_weight, uom2_code,
   purity_code, pure_weight, weight_gms,
   gross_weight, net_weight, stone_cts, stone_gms, component_weight,
   remarks, created_by)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)'
WHERE key_code = 'fg_bom_detail_insert';

-- ── 7. fg_bom_update — add component_weight ($10); id shifts to $12
UPDATE project_config SET key_value =
'UPDATE bom_fg SET
  min_weight = $1, max_weight = $2, effective_from = $3, effective_to = $4,
  remarks = $5, gross_weight = $6, net_weight = $7, stone_cts = $8, stone_gms = $9,
  component_weight = $10, updated_by = $11, updated_at = NOW()
WHERE id = $12'
WHERE key_code = 'fg_bom_update';

-- ── 8. fg_bom_create — add component_weight ($9); eff_from shifts to $10
UPDATE project_config SET key_value =
'INSERT INTO bom_fg
  (variant_id, bom_version, bom_status, min_weight, max_weight,
   gross_weight, net_weight, stone_cts, stone_gms, component_weight,
   effective_from, effective_to, remarks, created_by, updated_by)
VALUES ($1,$2,''DRAFT'',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
RETURNING id'
WHERE key_code = 'fg_bom_create';

-- ── 9. fg_bom_rfc_create — add component_weight ($9); eff_from shifts to $10
UPDATE project_config SET key_value =
'INSERT INTO bom_fg
  (variant_id, bom_version, bom_status,
   min_weight, max_weight, gross_weight, net_weight,
   stone_cts, stone_gms, component_weight, effective_from, effective_to,
   remarks, created_by, updated_by)
VALUES ($1,$2,''DRAFT'',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
RETURNING id'
WHERE key_code = 'fg_bom_rfc_create';

-- ── 10. fg_bom_rfc_detail_copy — include item_type and component_weight
UPDATE project_config SET key_value =
'INSERT INTO bom_fg_detail
  (bom_id, bom_type, item_type, seq_no, item_id, item_code, item_name,
   item_quantity, uom1_code, item_weight, uom2_code,
   purity_code, pure_weight, weight_gms,
   gross_weight, net_weight, stone_cts, stone_gms, component_weight,
   remarks, created_by)
SELECT $1, bom_type, item_type, seq_no, item_id, item_code, item_name,
       item_quantity, uom1_code, item_weight, uom2_code,
       purity_code, pure_weight, weight_gms,
       gross_weight, net_weight, stone_cts, stone_gms, component_weight,
       remarks, $2
FROM   bom_fg_detail
WHERE  bom_id = $3 AND is_active = TRUE
ORDER  BY item_type, seq_no'
WHERE key_code = 'fg_bom_rfc_detail_copy';

-- ── 11. Fix fg_bom_lov_components → now uses component_master
--        (component_item_master was renamed to metal_master in migration 62;
--         a new component_master was created in migration 64)
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
WHERE key_code = 'fg_bom_lov_components';

-- ── 12. New fg_bom_lov_metals → searches metal_master ────────────
INSERT INTO project_config (key_code, config_type, description, key_value) VALUES
('fg_bom_lov_metals', 'query', 'LOV: metal master search by metal_code or metal_name',
'SELECT id,
       metal_code AS code,
       COALESCE(CONCAT_WS('' - '', metal_name, karat_color, purity), metal_code) AS name,
       metal_type, karat_color, purity
FROM   metal_master
WHERE  is_active = TRUE
  AND (metal_code ILIKE $1 OR COALESCE(metal_name,'''') ILIKE $1)
ORDER  BY metal_code LIMIT 60')
ON CONFLICT (key_code) DO NOTHING;

COMMIT;
