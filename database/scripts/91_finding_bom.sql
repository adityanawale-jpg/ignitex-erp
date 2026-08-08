-- ============================================================
-- 91_finding_bom.sql
-- Finding BOM: tables, queries, workflow, variant BOM status
--
-- 1. bom_fin + bom_fin_detail tables
-- 2. project_config queries for Finding BOM (fin_bom_*)
-- 3. Rename wf_code BOM_APPROVAL → FG_BOM_APPROVAL
-- 4. Create FINDING_BOM_APPROVAL workflow + steps
-- 5. Update fin_variant_list_get to include bom_id / bom_status
-- ============================================================

BEGIN;

-- ── 1. bom_fin  (header — one per fin_item_variant) ──────────────
CREATE TABLE IF NOT EXISTS bom_fin (
  id               SERIAL        PRIMARY KEY,
  variant_id       INT           NOT NULL REFERENCES fin_item_variant(id),
  bom_version      VARCHAR(20)   NOT NULL DEFAULT '1.0',
  bom_status       VARCHAR(50)   NOT NULL DEFAULT 'DRAFT',
    -- DRAFT | PENDING_APPROVAL | ACTIVE | REJECTED
  gross_weight     DECIMAL(12,6) DEFAULT 0,
  net_weight       DECIMAL(12,6) DEFAULT 0,
  component_weight DECIMAL(12,6) DEFAULT 0,
  min_weight       DECIMAL(12,6),
  max_weight       DECIMAL(12,6),
  stone_cts        DECIMAL(12,6) DEFAULT 0,
  stone_gms        DECIMAL(12,6) DEFAULT 0,
  effective_from   DATE,
  effective_to     DATE,
  remarks          TEXT,
  -- Workflow audit
  submitted_by     INT,
  submitted_at     TIMESTAMP,
  approved_by      INT,
  approved_at      TIMESTAMP,
  rejected_by      INT,
  rejected_at      TIMESTAMP,
  rejection_reason TEXT,
  -- Standard audit
  is_active        BOOLEAN       DEFAULT TRUE,
  created_by       INT           NOT NULL,
  updated_by       INT,
  created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bom_fin_variant ON bom_fin(variant_id);
CREATE INDEX IF NOT EXISTS idx_bom_fin_status  ON bom_fin(bom_status);

-- ── 2. bom_fin_detail  (many lines per header) ───────────────────
CREATE TABLE IF NOT EXISTS bom_fin_detail (
  id               SERIAL        PRIMARY KEY,
  bom_id           INT           NOT NULL REFERENCES bom_fin(id) ON DELETE CASCADE,
  bom_type         VARCHAR(50)   NOT NULL,
  item_type        VARCHAR(50),
  seq_no           INT           NOT NULL DEFAULT 1,
  item_id          INT           NOT NULL,
  item_code        VARCHAR(300),
  item_name        VARCHAR(300),
  item_quantity    DECIMAL(12,4) DEFAULT 1,
  uom1_code        VARCHAR(50),
  item_weight      DECIMAL(12,6),
  uom2_code        VARCHAR(50),
  purity_code      VARCHAR(50),
  pure_weight      DECIMAL(12,6),
  weight_gms       DECIMAL(12,6),
  gross_weight     DECIMAL(12,6),
  net_weight       DECIMAL(12,6),
  stone_cts        DECIMAL(12,6),
  stone_gms        DECIMAL(12,6),
  component_weight DECIMAL(12,6) DEFAULT 0,
  remarks          TEXT,
  is_active        BOOLEAN       DEFAULT TRUE,
  created_by       INT,
  updated_by       INT,
  created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bom_fin_detail_bom  ON bom_fin_detail(bom_id);
CREATE INDEX IF NOT EXISTS idx_bom_fin_detail_type ON bom_fin_detail(bom_type);

-- ── 3. project_config queries for Finding BOM ────────────────────
INSERT INTO project_config (key_code, config_type, description, key_value) VALUES

-- List (base parts — WHERE/ORDER/LIMIT added dynamically by controller)
('fin_bom_list_select', 'query', 'Finding BOM list — select base (controller appends WHERE/ORDER/LIMIT)',
$q$SELECT
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
  COALESCE(bf.bom_status, 'NO_BOM') AS bom_status,
  bf.bom_version,
  bf.gross_weight,
  bf.net_weight,
  bf.min_weight,
  bf.max_weight,
  bf.stone_cts,
  bf.stone_gms,
  bf.updated_at   AS bom_updated_at
FROM fin_item_variant iv
JOIN fin_item_master im ON iv.item_id = im.id
LEFT JOIN LATERAL (
  SELECT id, bom_status, bom_version, gross_weight, net_weight,
         min_weight, max_weight, stone_cts, stone_gms, updated_at
  FROM   bom_fin
  WHERE  variant_id = iv.id AND is_active = TRUE
  ORDER  BY created_at DESC LIMIT 1
) bf ON TRUE$q$),

('fin_bom_list_count', 'query', 'Finding BOM list — count base (controller appends WHERE)',
$q$SELECT COUNT(*) AS total
FROM fin_item_variant iv
JOIN fin_item_master im ON iv.item_id = im.id
LEFT JOIN LATERAL (
  SELECT id, bom_status
  FROM   bom_fin
  WHERE  variant_id = iv.id AND is_active = TRUE
  ORDER  BY created_at DESC LIMIT 1
) bf ON TRUE$q$),

('fin_bom_stats', 'query', 'Finding BOM tab counts by status',
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
WHERE iv.is_active = TRUE AND im.is_active = TRUE$q$),

-- Variant GET
('fin_bom_variant_header', 'query', 'Finding BOM — variant info header',
'SELECT iv.id AS variant_id, iv.sku_code, iv.karat_color, iv.weight_band, iv.size,
       im.collection_name, im.design_code, im.design_no, im.product_name
FROM   fin_item_variant iv
JOIN   fin_item_master  im ON iv.item_id = im.id
WHERE  iv.id = $1 AND iv.is_active = TRUE'),

('fin_bom_by_variant', 'query', 'Finding BOM — latest active BOM for a variant with user names',
'SELECT bf.*,
       TRIM(COALESCE(su.first_name,'''') || '' '' || COALESCE(su.last_name,'''')) AS submitted_by_name,
       TRIM(COALESCE(au.first_name,'''') || '' '' || COALESCE(au.last_name,'''')) AS approved_by_name,
       TRIM(COALESCE(ru.first_name,'''') || '' '' || COALESCE(ru.last_name,'''')) AS rejected_by_name
FROM   bom_fin bf
LEFT   JOIN user_master su ON su.user_id = bf.submitted_by
LEFT   JOIN user_master au ON au.user_id = bf.approved_by
LEFT   JOIN user_master ru ON ru.user_id = bf.rejected_by
WHERE  bf.variant_id = $1 AND bf.is_active = TRUE
ORDER  BY bf.created_at DESC LIMIT 1'),

('fin_bom_detail_get', 'query', 'Finding BOM — all detail lines for a BOM',
'SELECT * FROM bom_fin_detail WHERE bom_id = $1 AND is_active = TRUE ORDER BY bom_type, seq_no'),

-- Validation
('fin_bom_variant_check', 'query', 'Check finding variant exists and is active',
'SELECT id FROM fin_item_variant WHERE id = $1 AND is_active = TRUE'),

('fin_bom_status_check', 'query', 'Get Finding BOM bom_status by id',
'SELECT bom_status FROM bom_fin WHERE id = $1'),

('fin_bom_active_get', 'query', 'Get full Finding BOM row (active only) — used for RFC validation',
'SELECT * FROM bom_fin WHERE id = $1 AND is_active = TRUE'),

-- Version numbering
('fin_bom_version_new', 'query', 'Next version number when creating a new Finding BOM',
'SELECT COUNT(*) + 1 AS nv FROM bom_fin WHERE variant_id = $1'),

('fin_bom_version_rfc', 'query', 'Next version number for Finding BOM RFC',
'SELECT COUNT(*) AS nv FROM bom_fin WHERE variant_id = $1'),

-- BOM header create / update
('fin_bom_create', 'query', 'Insert new Finding BOM header — returns id',
'INSERT INTO bom_fin
  (variant_id, bom_version, bom_status, min_weight, max_weight,
   gross_weight, net_weight, stone_cts, stone_gms, component_weight,
   effective_from, effective_to, remarks, created_by, updated_by)
VALUES ($1,$2,''DRAFT'',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
RETURNING id'),

('fin_bom_update', 'query', 'Update existing Finding BOM header fields',
'UPDATE bom_fin SET
  min_weight = $1, max_weight = $2, effective_from = $3, effective_to = $4,
  remarks = $5, gross_weight = $6, net_weight = $7, stone_cts = $8, stone_gms = $9,
  component_weight = $10, updated_by = $11, updated_at = NOW()
WHERE id = $12'),

-- Detail lines
('fin_bom_detail_delete', 'query', 'Delete all detail lines for a Finding BOM',
'DELETE FROM bom_fin_detail WHERE bom_id = $1'),

('fin_bom_detail_insert', 'query', 'Insert one Finding BOM detail line',
'INSERT INTO bom_fin_detail
  (bom_id, bom_type, item_type, seq_no, item_id, item_code, item_name,
   item_quantity, uom1_code, item_weight, uom2_code,
   purity_code, pure_weight, weight_gms,
   gross_weight, net_weight, stone_cts, stone_gms, component_weight,
   remarks, created_by)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)'),

-- Workflow status transitions
('fin_bom_submit', 'query', 'Submit Finding BOM — set status to PENDING_APPROVAL',
'UPDATE bom_fin
SET bom_status = ''PENDING_APPROVAL'', submitted_by = $1, submitted_at = NOW(), updated_at = NOW()
WHERE id = $2'),

('fin_bom_approve', 'query', 'Approve Finding BOM — set status to ACTIVE',
'UPDATE bom_fin
SET bom_status = ''ACTIVE'', approved_by = $1, approved_at = NOW(), updated_at = NOW()
WHERE id = $2'),

('fin_bom_approve_wf_sync', 'query', 'Sync wf_request to APPROVED after Finding BOM approve',
'UPDATE wf_request SET wf_status = ''APPROVED'', updated_at = NOW()
WHERE record_type = ''FINDING_BOM'' AND record_id = $1 AND wf_status != ''APPROVED'''),

('fin_bom_reject', 'query', 'Reject Finding BOM — reset to DRAFT',
'UPDATE bom_fin
SET bom_status = ''DRAFT'', rejected_by = $1, rejected_at = NOW(),
    rejection_reason = $2, submitted_by = NULL, submitted_at = NULL, updated_at = NOW()
WHERE id = $3'),

('fin_bom_reject_wf_sync', 'query', 'Sync wf_request to DRAFT after Finding BOM reject',
'UPDATE wf_request
SET wf_status = ''DRAFT'', current_step = 1, updated_at = NOW()
WHERE record_type = ''FINDING_BOM'' AND record_id = $1'),

-- RFC
('fin_bom_rfc_create', 'query', 'Insert new DRAFT Finding BOM for RFC — returns id',
'INSERT INTO bom_fin
  (variant_id, bom_version, bom_status,
   min_weight, max_weight, gross_weight, net_weight,
   stone_cts, stone_gms, component_weight, effective_from, effective_to,
   remarks, created_by, updated_by)
VALUES ($1,$2,''DRAFT'',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
RETURNING id'),

('fin_bom_rfc_detail_copy', 'query', 'Copy all detail lines from source Finding BOM to new RFC BOM',
'INSERT INTO bom_fin_detail
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
FROM   bom_fin_detail
WHERE  bom_id = $3 AND is_active = TRUE
ORDER  BY bom_type, seq_no'),

-- LOV
('fin_bom_lov_components', 'query', 'LOV: component item search for Finding BOM',
'SELECT id,
       component_code AS code,
       COALESCE(CONCAT_WS('' - '', component_name, component_desc), component_code) AS name,
       component_type
FROM   component_master
WHERE  is_active = TRUE
  AND (component_code ILIKE $1
    OR COALESCE(component_name,'''') ILIKE $1
    OR COALESCE(component_desc,'''') ILIKE $1)
ORDER  BY component_code LIMIT 60'),

('fin_bom_lov_metals', 'query', 'LOV: metal master search for Finding BOM',
'SELECT id,
       metal_code AS code,
       COALESCE(CONCAT_WS('' - '', metal_name, karat_color, purity), metal_code) AS name,
       metal_type, karat_color, purity
FROM   metal_master
WHERE  is_active = TRUE
  AND (metal_code ILIKE $1 OR COALESCE(metal_name,'''') ILIKE $1)
ORDER  BY metal_code LIMIT 60')

ON CONFLICT (key_code) DO NOTHING;

-- ── 4. Rename BOM_APPROVAL → FG_BOM_APPROVAL ─────────────────────
UPDATE wf_config
SET wf_code = 'FG_BOM_APPROVAL',
    wf_name = 'FG BOM Approval Workflow',
    updated_at = NOW()
WHERE wf_code = 'BOM_APPROVAL';

-- ── 5. Create FINDING_BOM_APPROVAL workflow ───────────────────────
INSERT INTO wf_config (wf_code, wf_name, module_code, description, is_active)
VALUES (
  'FINDING_BOM_APPROVAL',
  'Finding BOM Approval Workflow',
  'FINDING_BOM',
  'Two-step workflow: Maker submits, Checker approves / rejects / raises RFC',
  TRUE
)
ON CONFLICT (wf_code) DO UPDATE SET
  wf_name     = EXCLUDED.wf_name,
  module_code = EXCLUDED.module_code,
  description = EXCLUDED.description,
  is_active   = TRUE;

-- Step 1: Submit
INSERT INTO wf_step (config_id, step_no, step_name, can_submit, can_approve, can_reject, can_rfc, is_active)
SELECT id, 1, 'Submit for Approval', TRUE, FALSE, FALSE, FALSE, TRUE
FROM   wf_config WHERE wf_code = 'FINDING_BOM_APPROVAL'
ON CONFLICT (config_id, step_no) DO UPDATE SET
  step_name  = EXCLUDED.step_name,
  can_submit = TRUE,
  is_active  = TRUE;

-- Step 2: Approve / Reject / RFC
INSERT INTO wf_step (config_id, step_no, step_name, can_submit, can_approve, can_reject, can_rfc, rfc_to_step, is_active)
SELECT id, 2, 'Approve / Reject / RFC', FALSE, TRUE, TRUE, TRUE, 1, TRUE
FROM   wf_config WHERE wf_code = 'FINDING_BOM_APPROVAL'
ON CONFLICT (config_id, step_no) DO UPDATE SET
  step_name   = EXCLUDED.step_name,
  can_approve = TRUE,
  can_reject  = TRUE,
  can_rfc     = TRUE,
  rfc_to_step = 1,
  is_active   = TRUE;

-- ── 6. Update fin_variant_list_get to include bom_id / bom_status ─
UPDATE project_config
SET key_value =
'SELECT fiv.*,
  bf.id AS bom_id,
  COALESCE(bf.bom_status, ''NO_BOM'') AS bom_status
FROM fin_item_variant fiv
LEFT JOIN LATERAL (
  SELECT id, bom_status
  FROM bom_fin
  WHERE variant_id = fiv.id AND is_active = TRUE
  ORDER BY created_at DESC LIMIT 1
) bf ON TRUE
WHERE fiv.item_id = :item_id AND fiv.is_active = TRUE
ORDER BY fiv.sku_code'
WHERE key_code = 'fin_variant_list_get';



COMMIT;
