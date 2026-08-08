-- ============================================================
-- 40_variant_vendor_name.sql
-- 1. Drop client_variant_code / client_variant_name columns
--    from item_variant (moved to item_variant_client table in 41)
-- 2. Add vendor_name column
-- 3. Update fg_variant_create and fg_variant_update in
--    project_config to reflect the new schema
-- Run BEFORE 41_variant_client.sql
-- ============================================================

BEGIN;

-- ── 1. Schema changes ────────────────────────────────────────
ALTER TABLE item_variant
  DROP COLUMN IF EXISTS client_variant_code,
  DROP COLUMN IF EXISTS client_variant_name,
  ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255);

-- ── 2. Update fg_variant_create ──────────────────────────────
UPDATE project_config
SET key_value =
  'INSERT INTO item_variant (item_id, sku_code, karat_color, weight_band, size, width_size, style_tone, vendor_name, vendor_variant_code, vendor_variant_name, shape, product_description, pipe_thickness, diamond_cut, squeezing, setting_size, wire_size, hammering, combination_line, compacting, machine_used, kada_salai_size, rfid_chip_number, file_link, rubber_die_number, wax_resin_weight, ef_batch_number, zinc_surface, zinc_die_number, zinc_weight, seo_words, usp, short_description, long_description, retail_brand, keywords_tags, product_title, video_upload, video_360) VALUES (:item_id, :sku_code, :karat_color, :weight_band, :size, :width_size, :style_tone, :vendor_name, :vendor_variant_code, :vendor_variant_name, :shape, :product_description, :pipe_thickness, :diamond_cut, :squeezing, :setting_size, :wire_size, :hammering, :combination_line, :compacting, :machine_used, :kada_salai_size, :rfid_chip_number, :file_link, :rubber_die_number, :wax_resin_weight, :ef_batch_number, :zinc_surface, :zinc_die_number, :zinc_weight, :seo_words, :usp, :short_description, :long_description, :retail_brand, :keywords_tags, :product_title, :video_upload, :video_360) RETURNING *'
WHERE key_code = 'fg_variant_create';

-- ── 3. Update fg_variant_update ──────────────────────────────
UPDATE project_config
SET key_value =
  'UPDATE item_variant SET karat_color=:karat_color, weight_band=:weight_band, size=:size, width_size=:width_size, style_tone=:style_tone, vendor_name=:vendor_name, vendor_variant_code=:vendor_variant_code, vendor_variant_name=:vendor_variant_name, shape=:shape, product_description=:product_description, pipe_thickness=:pipe_thickness, diamond_cut=:diamond_cut, squeezing=:squeezing, setting_size=:setting_size, wire_size=:wire_size, hammering=:hammering, combination_line=:combination_line, compacting=:compacting, machine_used=:machine_used, kada_salai_size=:kada_salai_size, rfid_chip_number=:rfid_chip_number, file_link=:file_link, rubber_die_number=:rubber_die_number, wax_resin_weight=:wax_resin_weight, ef_batch_number=:ef_batch_number, zinc_surface=:zinc_surface, zinc_die_number=:zinc_die_number, zinc_weight=:zinc_weight, seo_words=:seo_words, usp=:usp, short_description=:short_description, long_description=:long_description, retail_brand=:retail_brand, keywords_tags=:keywords_tags, product_title=:product_title, video_upload=:video_upload, video_360=:video_360, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *'
WHERE key_code = 'fg_variant_update';

COMMIT;
