-- Finding N (SELECT * cleanup): trims 4 live project_config query templates
-- from `SELECT *` / `bom_fg.*` to explicit column lists matching what the
-- calling code (fgBom.controller.ts, finBom.controller.ts, FGBOMPage.tsx,
-- FindingBOMPage.tsx) actually uses. Reference copy of the same UPDATEs
-- applied directly against the local dev DB — run this on any other
-- environment (Dev/UAT) to keep project_config in sync.

UPDATE project_config SET key_value = '
SELECT id, bom_id, bom_type, item_type, seq_no, item_id, item_code, item_name,
       item_quantity, uom1_code, purity_code, gross_weight, net_weight,
       stone_cts, stone_gms, component_weight, remarks
FROM bom_fg_detail WHERE bom_id = $1 AND is_active = TRUE ORDER BY bom_type, seq_no
', updated_at = NOW() WHERE key_code = 'fg_bom_detail_get';

UPDATE project_config SET key_value = '
SELECT variant_id, bom_status, min_weight, max_weight, gross_weight, net_weight,
       stone_cts, stone_gms, component_weight, effective_from, effective_to, remarks
FROM bom_fg WHERE id = $1 AND is_active = TRUE
', updated_at = NOW() WHERE key_code = 'fg_bom_active_get';

UPDATE project_config SET key_value = '
SELECT id, bom_id, bom_type, item_type, seq_no, item_id, item_code, item_name,
       item_quantity, uom1_code, purity_code, gross_weight, net_weight,
       stone_cts, stone_gms, component_weight, remarks
FROM bom_fin_detail WHERE bom_id = $1 AND is_active = TRUE ORDER BY bom_type, seq_no
', updated_at = NOW() WHERE key_code = 'fin_bom_detail_get';

UPDATE project_config SET key_value = '
SELECT variant_id, bom_status, min_weight, max_weight, gross_weight, net_weight,
       component_weight, stone_cts, stone_gms, effective_from, effective_to, remarks
FROM bom_fin WHERE id = $1 AND is_active = TRUE
', updated_at = NOW() WHERE key_code = 'fin_bom_active_get';
