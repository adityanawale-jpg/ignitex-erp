-- Add 'FG' to the FG_ITEM_TYPE lookup so Customer Price Master (Metal tab) can
-- price finished goods. Selecting it drives /fg-bom/lov/fg, which searches FG
-- Master variants the same way FINDING searches Finding Master.
--
-- display_order 10 keeps FG last: FGBOMPage's BOM-line grid defaults to the
-- first FG_ITEM_TYPE entry, and FINDING must stay the default there.
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('FG_ITEM_TYPE', 'FG', 'FG', 10, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO UPDATE
  SET lookup_name   = EXCLUDED.lookup_name,
      display_order = EXCLUDED.display_order,
      is_active     = TRUE;
