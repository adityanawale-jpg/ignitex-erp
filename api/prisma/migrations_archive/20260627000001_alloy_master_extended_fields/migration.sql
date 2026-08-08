-- Migration 70: Extend alloy_master with production/commercial fields,
-- seed LOV data in master_lookup, update project_config queries

-- ── 1. Add extended columns ───────────────────────────────────
ALTER TABLE alloy_master
  ADD COLUMN IF NOT EXISTS metal_category              VARCHAR(100),
  ADD COLUMN IF NOT EXISTS purity_target               VARCHAR(200),
  ADD COLUMN IF NOT EXISTS application_type            VARCHAR(200),
  ADD COLUMN IF NOT EXISTS alloy_status                VARCHAR(50),
  ADD COLUMN IF NOT EXISTS with_silver                 VARCHAR(10),
  ADD COLUMN IF NOT EXISTS silver_percentage           NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS alloy_additives_type        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS alloy_density               NUMERIC(8,3),
  ADD COLUMN IF NOT EXISTS composition_remark          VARCHAR(500),
  ADD COLUMN IF NOT EXISTS alloy_hardness              VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tensile_strength            VARCHAR(100),
  ADD COLUMN IF NOT EXISTS ductility_elongation        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS melting_range               VARCHAR(100),
  ADD COLUMN IF NOT EXISTS color_tone                  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS finish_behaviour            VARCHAR(100),
  ADD COLUMN IF NOT EXISTS max_drawing_reduction       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS alloy_required              VARCHAR(200),
  ADD COLUMN IF NOT EXISTS breakage_sensitivity        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS melting_method              VARCHAR(100),
  ADD COLUMN IF NOT EXISTS alloy_cost_per_gram         NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS indicative_alloy_cost_per_gram NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS supplier_name               VARCHAR(255),
  ADD COLUMN IF NOT EXISTS alloy_brand                 VARCHAR(200),
  ADD COLUMN IF NOT EXISTS alloy_hazardous             BOOLEAN DEFAULT FALSE;

-- ── 2. Seed LOV data ──────────────────────────────────────────
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('ALLOY_METAL_CATEGORY', 'GOLD',         'Gold',         1, TRUE),
  ('ALLOY_METAL_CATEGORY', 'SILVER',       'Silver',       2, TRUE),
  ('ALLOY_METAL_CATEGORY', 'SPECIAL',      'Special',      3, TRUE),
  ('ALLOY_METAL_CATEGORY', 'EXPERIMENTAL', 'Experimental', 4, TRUE),
  ('ALLOY_PURITY_TARGET', '22K',   '22K',   1, TRUE),
  ('ALLOY_PURITY_TARGET', '18K',   '18K',   2, TRUE),
  ('ALLOY_PURITY_TARGET', '14K',   '14K',   3, TRUE),
  ('ALLOY_PURITY_TARGET', '9K',    '9K',    4, TRUE),
  ('ALLOY_PURITY_TARGET', '10K',   '10K',   5, TRUE),
  ('ALLOY_PURITY_TARGET', '925SS', '925ss', 6, TRUE),
  ('ALLOY_STATUS', 'ACTIVE',      'Active',           1, TRUE),
  ('ALLOY_STATUS', 'INACTIVE',    'Inactive',         2, TRUE),
  ('ALLOY_STATUS', 'TRIAL',       'Trial (Timebond)', 3, TRUE),
  ('ALLOY_STATUS', 'DISAPPROVED', 'DisApproved',      4, TRUE),
  ('ALLOY_YN', 'YES', 'Yes', 1, TRUE),
  ('ALLOY_YN', 'NO',  'No',  2, TRUE),
  ('ALLOY_ADDITIVE_TYPE', 'COPPER',    'Copper',    1, TRUE),
  ('ALLOY_ADDITIVE_TYPE', 'ZINC',      'Zinc',      2, TRUE),
  ('ALLOY_ADDITIVE_TYPE', 'PALLADIUM', 'Palladium', 3, TRUE),
  ('ALLOY_ADDITIVE_TYPE', 'RHODIUM',   'Rhodium',   4, TRUE),
  ('ALLOY_ADDITIVE_TYPE', 'PLATINUM',  'Platinum',  5, TRUE),
  ('ALLOY_ADDITIVE_TYPE', 'SILICON',   'Silicon',   6, TRUE),
  ('ALLOY_COLOR_TONE', 'YELLOW', 'Yellow', 1, TRUE),
  ('ALLOY_COLOR_TONE', 'ROSE',   'Rose',   2, TRUE),
  ('ALLOY_COLOR_TONE', 'WHITE',  'White',  3, TRUE),
  ('ALLOY_COLOR_TONE', 'CUSTOM', 'Custom', 4, TRUE),
  ('ALLOY_FINISH', 'MATTE',       'Matte',              1, TRUE),
  ('ALLOY_FINISH', 'HIGH_POLISH', 'High-polish',        2, TRUE),
  ('ALLOY_FINISH', 'DIAMOND_CUT', 'Diamond Cut Family', 3, TRUE),
  ('ALLOY_MELTING_METHOD', 'MANUAL',           'Manual',             1, TRUE),
  ('ALLOY_MELTING_METHOD', 'MANUAL_INDUCTION', 'Manual-induction',   2, TRUE),
  ('ALLOY_MELTING_METHOD', 'CONTINUOUS',       'Continuous Melting', 3, TRUE),
  ('ALLOY_MELTING_METHOD', 'VACUUM_CASTING',   'Vacuum Casting',     4, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

-- ── 3. Update alloy_list_select ───────────────────────────────
UPDATE project_config SET key_value =
'SELECT id, alloy_code, alloy_name, karat, purity_pct, description,
        metal_category, purity_target, application_type, alloy_status,
        with_silver, silver_percentage, alloy_additives_type, alloy_density,
        composition_remark, alloy_hardness, tensile_strength, ductility_elongation,
        melting_range, color_tone, finish_behaviour, max_drawing_reduction,
        alloy_required, breakage_sensitivity, melting_method,
        alloy_cost_per_gram, indicative_alloy_cost_per_gram,
        supplier_name, alloy_brand, alloy_hazardous,
        is_active, created_at, updated_at
FROM alloy_master'
WHERE key_code = 'alloy_list_select';

-- ── 4. Update alloy_create ────────────────────────────────────
UPDATE project_config SET key_value =
'INSERT INTO alloy_master (
  alloy_code, alloy_name, karat, purity_pct, description,
  metal_category, purity_target, application_type, alloy_status,
  with_silver, silver_percentage, alloy_additives_type, alloy_density,
  composition_remark, alloy_hardness, tensile_strength, ductility_elongation,
  melting_range, color_tone, finish_behaviour, max_drawing_reduction,
  alloy_required, breakage_sensitivity, melting_method,
  alloy_cost_per_gram, indicative_alloy_cost_per_gram,
  supplier_name, alloy_brand, alloy_hazardous,
  created_by, updated_by
) VALUES (
  $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
  $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$30
) RETURNING id, alloy_code'
WHERE key_code = 'alloy_create';

-- ── 5. Update alloy_update ────────────────────────────────────
UPDATE project_config SET key_value =
'UPDATE alloy_master SET
  alloy_name=$1, karat=$2, purity_pct=$3, description=$4,
  metal_category=$5, purity_target=$6, application_type=$7, alloy_status=$8,
  with_silver=$9, silver_percentage=$10, alloy_additives_type=$11, alloy_density=$12,
  composition_remark=$13, alloy_hardness=$14, tensile_strength=$15, ductility_elongation=$16,
  melting_range=$17, color_tone=$18, finish_behaviour=$19, max_drawing_reduction=$20,
  alloy_required=$21, breakage_sensitivity=$22, melting_method=$23,
  alloy_cost_per_gram=$24, indicative_alloy_cost_per_gram=$25,
  supplier_name=$26, alloy_brand=$27, alloy_hazardous=$28,
  updated_by=$29, updated_at=NOW()
WHERE id=$30
RETURNING id, alloy_code'
WHERE key_code = 'alloy_update';
