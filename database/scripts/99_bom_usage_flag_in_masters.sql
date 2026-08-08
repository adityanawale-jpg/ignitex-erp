-- ============================================================
-- 99_bom_usage_flag_in_masters.sql
-- Add used_in_bom computed boolean to the list SELECT queries
-- for Metal Master, Component Master, and Stone Items.
-- Edit button is hidden on the frontend when this is TRUE.
-- Safe to re-run (UPDATE is idempotent).
-- ============================================================

BEGIN;

-- ── Metal Master ─────────────────────────────────────────────
UPDATE project_config SET key_value =
'SELECT m.id, m.metal_code, m.metal_type, m.karat_color, m.purity, m.metal_name,
       m.is_active, m.created_at, m.updated_at,
       (EXISTS(SELECT 1 FROM bom_fg_detail  d WHERE d.item_id = m.id AND d.item_type = ''METAL'' AND d.is_active = TRUE)
        OR EXISTS(SELECT 1 FROM bom_fin_detail d WHERE d.item_id = m.id AND d.item_type = ''METAL'' AND d.is_active = TRUE)
       ) AS used_in_bom
FROM metal_master m'
WHERE key_code = 'comp_item_list_select';

-- ── Component Master ─────────────────────────────────────────
UPDATE project_config SET key_value =
'SELECT c.id, c.component_code, c.component_type, c.component_name, c.component_desc,
       c.is_active, c.created_at, c.updated_at,
       (EXISTS(SELECT 1 FROM bom_fg_detail  d WHERE d.item_id = c.id AND d.item_type = ''COMPONENT'' AND d.is_active = TRUE)
        OR EXISTS(SELECT 1 FROM bom_fin_detail d WHERE d.item_id = c.id AND d.item_type = ''COMPONENT'' AND d.is_active = TRUE)
       ) AS used_in_bom
FROM component_master c'
WHERE key_code = 'comp_master_list_select';

-- ── Stone Items ───────────────────────────────────────────────
UPDATE project_config SET key_value =
'SELECT s.id, s.stn_code, s.stn_type, s.stn_shape, s.stn_quality, s.stn_color, s.stn_size,
       s.std_cts, s.is_active, s.created_at, s.updated_at,
       (EXISTS(SELECT 1 FROM bom_fg_detail  d WHERE d.item_id = s.id AND d.item_type = ''STONE'' AND d.is_active = TRUE)
        OR EXISTS(SELECT 1 FROM bom_fin_detail d WHERE d.item_id = s.id AND d.item_type = ''STONE'' AND d.is_active = TRUE)
       ) AS used_in_bom
FROM stone_item_master s'
WHERE key_code = 'stone_item_list_select';

COMMIT;
