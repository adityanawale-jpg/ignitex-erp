-- Audit finding Y: bom_fg/bom_fin header weight+carat totals (gross_weight,
-- net_weight, stone_cts, stone_gms, component_weight) were being computed
-- independently in three places in application code (two frontend pages'
-- reduce() calls and a third hand-rolled accumulator in fgImport.controller.ts),
-- all in JS float arithmetic despite the columns being fixed-point NUMERIC,
-- and the manual save endpoints didn't verify the client-supplied totals
-- against the detail lines at all. These functions make the DB the single
-- source of truth: call them after writing detail rows and the header is
-- always an exact SUM() over its own active detail lines.

CREATE OR REPLACE FUNCTION fn_bom_fg_recalc_header(p_bom_id INT)
RETURNS VOID AS $$
BEGIN
  UPDATE bom_fg SET
    gross_weight     = COALESCE(agg.gross, 0),
    net_weight       = COALESCE(agg.net, 0),
    stone_cts        = COALESCE(agg.cts, 0),
    stone_gms        = COALESCE(agg.gms, 0),
    component_weight = COALESCE(agg.comp, 0)
  FROM (
    SELECT
      SUM(gross_weight)     AS gross,
      SUM(net_weight)       AS net,
      SUM(stone_cts)        AS cts,
      SUM(stone_gms)        AS gms,
      SUM(component_weight) AS comp
    FROM bom_fg_detail
    WHERE bom_id = p_bom_id AND is_active = TRUE
  ) agg
  WHERE bom_fg.id = p_bom_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_bom_fin_recalc_header(p_bom_id INT)
RETURNS VOID AS $$
BEGIN
  UPDATE bom_fin SET
    gross_weight     = COALESCE(agg.gross, 0),
    net_weight       = COALESCE(agg.net, 0),
    stone_cts        = COALESCE(agg.cts, 0),
    stone_gms        = COALESCE(agg.gms, 0),
    component_weight = COALESCE(agg.comp, 0)
  FROM (
    SELECT
      SUM(gross_weight)     AS gross,
      SUM(net_weight)       AS net,
      SUM(stone_cts)        AS cts,
      SUM(stone_gms)        AS gms,
      SUM(component_weight) AS comp
    FROM bom_fin_detail
    WHERE bom_id = p_bom_id AND is_active = TRUE
  ) agg
  WHERE bom_fin.id = p_bom_id;
END;
$$ LANGUAGE plpgsql;
