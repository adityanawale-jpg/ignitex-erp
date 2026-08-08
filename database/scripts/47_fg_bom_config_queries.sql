-- ============================================================
-- 47_fg_bom_config_queries.sql
-- Move all FG BOM SQL out of fgBom.controller.ts into
-- project_config. Controller becomes a pure orchestrator;
-- zero SQL is hardcoded in TypeScript.
-- ============================================================

BEGIN;

INSERT INTO project_config (key_code, config_type, description, key_value) VALUES

-- ── List (base only; controller appends WHERE + ORDER BY + LIMIT/OFFSET) ─────
('fg_bom_list_select', 'query', 'FG BOM list — SELECT + FROM/JOIN (controller appends WHERE/ORDER/LIMIT)',
'SELECT
  iv.id           AS variant_id,
  iv.sku_code,
  iv.karat_color,
  iv.weight_band,
  iv.size,
  im.collection_name,
  im.design_code,
  im.design_no,
  im.product_name,
  bf.id           AS bom_id,
  COALESCE(bf.bom_status, ''NO_BOM'') AS bom_status,
  bf.bom_version,
  bf.gross_weight,
  bf.net_weight,
  bf.min_weight,
  bf.max_weight,
  bf.stone_cts,
  bf.stone_gms,
  bf.updated_at   AS bom_updated_at
FROM item_variant iv
JOIN item_master im ON iv.item_id = im.id AND im.sku_type = ''FG''
LEFT JOIN LATERAL (
  SELECT id, bom_status, bom_version, gross_weight, net_weight,
         min_weight, max_weight, stone_cts, stone_gms, updated_at
  FROM   bom_fg
  WHERE  variant_id = iv.id AND is_active = TRUE
  ORDER  BY created_at DESC LIMIT 1
) bf ON TRUE'),

('fg_bom_list_count', 'query', 'FG BOM list — COUNT + FROM/JOIN (controller appends WHERE)',
'SELECT COUNT(*) AS total
FROM item_variant iv
JOIN item_master im ON iv.item_id = im.id AND im.sku_type = ''FG''
LEFT JOIN LATERAL (
  SELECT id, bom_status
  FROM   bom_fg
  WHERE  variant_id = iv.id AND is_active = TRUE
  ORDER  BY created_at DESC LIMIT 1
) bf ON TRUE'),

-- ── Stats ─────────────────────────────────────────────────────────────────────
('fg_bom_stats', 'query', 'FG BOM tab counts by status',
'SELECT
  COUNT(*) FILTER (WHERE bf.bom_status = ''DRAFT'' OR bf.id IS NULL) AS draft,
  COUNT(*) FILTER (WHERE bf.bom_status = ''PENDING_APPROVAL'')       AS pending_approval,
  COUNT(*) FILTER (WHERE bf.bom_status = ''ACTIVE'')                 AS active
FROM item_variant iv
JOIN item_master im ON iv.item_id = im.id AND im.sku_type = ''FG''
LEFT JOIN LATERAL (
  SELECT id, bom_status
  FROM   bom_fg
  WHERE  variant_id = iv.id AND is_active = TRUE
  ORDER  BY created_at DESC LIMIT 1
) bf ON TRUE
WHERE iv.is_active = TRUE'),

-- ── Variant GET ───────────────────────────────────────────────────────────────
('fg_bom_variant_header', 'query', 'FG BOM — variant info header (sku, design, product fields)',
'SELECT iv.id AS variant_id, iv.sku_code, iv.karat_color, iv.weight_band, iv.size,
       im.collection_name, im.design_code, im.design_no, im.product_name
FROM   item_variant iv
JOIN   item_master  im ON iv.item_id = im.id
WHERE  iv.id = $1 AND iv.is_active = TRUE'),

('fg_bom_by_variant', 'query', 'FG BOM — latest active BOM for a variant with user names',
'SELECT bf.*,
       TRIM(COALESCE(su.first_name,'''') || '' '' || COALESCE(su.last_name,'''')) AS submitted_by_name,
       TRIM(COALESCE(au.first_name,'''') || '' '' || COALESCE(au.last_name,'''')) AS approved_by_name,
       TRIM(COALESCE(ru.first_name,'''') || '' '' || COALESCE(ru.last_name,'''')) AS rejected_by_name
FROM   bom_fg bf
LEFT   JOIN user_master su ON su.user_id = bf.submitted_by
LEFT   JOIN user_master au ON au.user_id = bf.approved_by
LEFT   JOIN user_master ru ON ru.user_id = bf.rejected_by
WHERE  bf.variant_id = $1 AND bf.is_active = TRUE
ORDER  BY bf.created_at DESC LIMIT 1'),

('fg_bom_detail_get', 'query', 'FG BOM — all detail lines for a BOM ordered by type and seq',
'SELECT * FROM bom_fg_detail WHERE bom_id = $1 AND is_active = TRUE ORDER BY bom_type, seq_no'),

-- ── Validation ────────────────────────────────────────────────────────────────
('fg_bom_variant_check', 'query', 'Check variant exists and is active — returns id or empty',
'SELECT id FROM item_variant WHERE id = $1 AND is_active = TRUE'),

('fg_bom_status_check', 'query', 'Get BOM bom_status by id',
'SELECT bom_status FROM bom_fg WHERE id = $1'),

('fg_bom_active_get', 'query', 'Get full BOM row (active only) — used for RFC validation',
'SELECT * FROM bom_fg WHERE id = $1 AND is_active = TRUE'),

-- ── Version numbering ─────────────────────────────────────────────────────────
('fg_bom_version_new', 'query', 'Next version number when creating a new BOM (COUNT + 1)',
'SELECT COUNT(*) + 1 AS nv FROM bom_fg WHERE variant_id = $1'),

('fg_bom_version_rfc', 'query', 'Next version number for RFC new draft (COUNT, then +1 in controller)',
'SELECT COUNT(*) AS nv FROM bom_fg WHERE variant_id = $1'),

-- ── BOM header create / update ────────────────────────────────────────────────
('fg_bom_create', 'query', 'Insert new BOM header — returns id',
'INSERT INTO bom_fg
  (variant_id, bom_version, bom_status, min_weight, max_weight,
   gross_weight, net_weight, stone_cts, stone_gms,
   effective_from, effective_to, remarks, created_by, updated_by)
VALUES ($1,$2,''DRAFT'',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)
RETURNING id'),

('fg_bom_update', 'query', 'Update existing BOM header fields',
'UPDATE bom_fg SET
  min_weight = $1, max_weight = $2, effective_from = $3, effective_to = $4,
  remarks = $5, gross_weight = $6, net_weight = $7, stone_cts = $8, stone_gms = $9,
  updated_by = $10, updated_at = NOW()
WHERE id = $11'),

-- ── Detail lines ──────────────────────────────────────────────────────────────
('fg_bom_detail_delete', 'query', 'Delete all detail lines for a BOM before re-insert',
'DELETE FROM bom_fg_detail WHERE bom_id = $1'),

('fg_bom_detail_insert', 'query', 'Insert one BOM detail line (controller loops per line)',
'INSERT INTO bom_fg_detail
  (bom_id, bom_type, seq_no, item_id, item_code, item_name,
   item_quantity, uom1_code, item_weight, uom2_code,
   purity_code, pure_weight, weight_gms, remarks, created_by)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)'),

-- ── Workflow status transitions ───────────────────────────────────────────────
('fg_bom_submit', 'query', 'Submit BOM — set status to PENDING_APPROVAL',
'UPDATE bom_fg
SET bom_status = ''PENDING_APPROVAL'', submitted_by = $1, submitted_at = NOW(), updated_at = NOW()
WHERE id = $2'),

('fg_bom_approve', 'query', 'Approve BOM — set status to ACTIVE',
'UPDATE bom_fg
SET bom_status = ''ACTIVE'', approved_by = $1, approved_at = NOW(), updated_at = NOW()
WHERE id = $2'),

('fg_bom_approve_wf_sync', 'query', 'Sync wf_request to APPROVED after legacy approve',
'UPDATE wf_request SET wf_status = ''APPROVED'', updated_at = NOW()
WHERE record_type = ''FG_BOM'' AND record_id = $1 AND wf_status != ''APPROVED'''),

('fg_bom_reject', 'query', 'Reject BOM — reset to DRAFT with rejection_reason',
'UPDATE bom_fg
SET bom_status = ''DRAFT'', rejected_by = $1, rejected_at = NOW(),
    rejection_reason = $2, submitted_by = NULL, submitted_at = NULL, updated_at = NOW()
WHERE id = $3'),

('fg_bom_reject_wf_sync', 'query', 'Sync wf_request to REJECTED after legacy reject',
'UPDATE wf_request SET wf_status = ''REJECTED'', updated_at = NOW()
WHERE record_type = ''FG_BOM'' AND record_id = $1 AND wf_status != ''REJECTED'''),

-- ── RFC ───────────────────────────────────────────────────────────────────────
('fg_bom_rfc_create', 'query', 'Insert new DRAFT BOM for RFC — returns id',
'INSERT INTO bom_fg
  (variant_id, bom_version, bom_status,
   min_weight, max_weight, gross_weight, net_weight,
   stone_cts, stone_gms, effective_from, effective_to,
   remarks, created_by, updated_by)
VALUES ($1,$2,''DRAFT'',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)
RETURNING id'),

('fg_bom_rfc_detail_copy', 'query', 'Copy all detail lines from source BOM to new RFC BOM',
'INSERT INTO bom_fg_detail
  (bom_id, bom_type, seq_no, item_id, item_code, item_name,
   item_quantity, uom1_code, item_weight, uom2_code,
   purity_code, pure_weight, weight_gms, remarks, created_by)
SELECT $1, bom_type, seq_no, item_id, item_code, item_name,
       item_quantity, uom1_code, item_weight, uom2_code,
       purity_code, pure_weight, weight_gms, remarks, $2
FROM   bom_fg_detail
WHERE  bom_id = $3 AND is_active = TRUE
ORDER  BY bom_type, seq_no'),

-- ── LOV inline search (pass ''%%'' when search is empty) ──────────────────────
('fg_bom_lov_variants', 'query', 'LOV: FG variant search by sku_code',
'SELECT iv.id,
       iv.sku_code                    AS code,
       iv.sku_code                    AS name,
       iv.karat_color, iv.weight_band,
       im.collection_name
FROM   item_variant iv
JOIN   item_master  im ON iv.item_id = im.id
WHERE  iv.is_active = TRUE AND iv.sku_code ILIKE $1
ORDER  BY iv.sku_code LIMIT 60'),

('fg_bom_lov_components', 'query', 'LOV: component item search by code or name',
'SELECT id,
       comp_code AS code,
       COALESCE(comp_name, comp_code) AS name,
       comp_metal_type, comp_type, comp_karat_color
FROM   component_item_master
WHERE  is_active = TRUE
  AND (comp_code ILIKE $1 OR COALESCE(comp_name,'''') ILIKE $1)
ORDER  BY comp_code LIMIT 60'),

('fg_bom_lov_stones', 'query', 'LOV: stone item search by stn_code',
'SELECT id,
       stn_code AS code,
       TRIM(CONCAT_WS('' '', stn_type, stn_shape, COALESCE(stn_quality,''''), COALESCE(stn_size,''''))) AS name,
       stn_type, stn_shape, stn_quality, stn_color, stn_size
FROM   stone_item_master
WHERE  is_active = TRUE AND stn_code ILIKE $1
ORDER  BY stn_code LIMIT 60');

COMMIT;
