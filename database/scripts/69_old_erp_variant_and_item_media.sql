-- 1. Add new columns to fg_item_variant
ALTER TABLE fg_item_variant
  ADD COLUMN IF NOT EXISTS old_erp_variant VARCHAR(100),
  ADD COLUMN IF NOT EXISTS standard_alloy  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS design_source   VARCHAR(100);

-- 2. Add video fields to fg_item_master
ALTER TABLE fg_item_master
  ADD COLUMN IF NOT EXISTS video_upload VARCHAR(500),
  ADD COLUMN IF NOT EXISTS video_360    VARCHAR(500);

-- 3. Seed DESIGN_SOURCE lookup values
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active)
VALUES
  ('DESIGN_SOURCE', 'IN_HOUSE', 'In-House', 1, TRUE),
  ('DESIGN_SOURCE', 'VENDOR',   'Vendor',   2, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

-- 4. Update fg_variant_create: add old_erp_variant, standard_alloy, design_source; drop video fields
UPDATE project_config SET
  key_value = 'INSERT INTO fg_item_variant (item_id, sku_code, karat_color, old_erp_variant, weight_band, size, width_size, style_tone, design_source, standard_alloy, client_variant_code, client_variant_name, vendor_variant_code, vendor_variant_name, shape, product_description, pipe_thickness, diamond_cut, squeezing, setting_size, wire_size, hammering, combination_line, compacting, machine_used, kada_salai_size, rfid_chip_number, file_link, rubber_die_number, wax_resin_weight, ef_batch_number, zinc_surface, zinc_die_number, zinc_weight, seo_words, usp, short_description, long_description, retail_brand, keywords_tags, product_title) VALUES (:item_id, :sku_code, :karat_color, :old_erp_variant, :weight_band, :size, :width_size, :style_tone, :design_source, :standard_alloy, :client_variant_code, :client_variant_name, :vendor_variant_code, :vendor_variant_name, :shape, :product_description, :pipe_thickness, :diamond_cut, :squeezing, :setting_size, :wire_size, :hammering, :combination_line, :compacting, :machine_used, :kada_salai_size, :rfid_chip_number, :file_link, :rubber_die_number, :wax_resin_weight, :ef_batch_number, :zinc_surface, :zinc_die_number, :zinc_weight, :seo_words, :usp, :short_description, :long_description, :retail_brand, :keywords_tags, :product_title) RETURNING *'
WHERE key_code = 'fg_variant_create';

-- 5. Update fg_variant_update: add old_erp_variant, standard_alloy, design_source; drop video fields
UPDATE project_config SET
  key_value = 'UPDATE fg_item_variant SET karat_color=:karat_color, old_erp_variant=:old_erp_variant, weight_band=:weight_band, size=:size, width_size=:width_size, style_tone=:style_tone, design_source=:design_source, standard_alloy=:standard_alloy, client_variant_code=:client_variant_code, client_variant_name=:client_variant_name, vendor_variant_code=:vendor_variant_code, vendor_variant_name=:vendor_variant_name, shape=:shape, product_description=:product_description, pipe_thickness=:pipe_thickness, diamond_cut=:diamond_cut, squeezing=:squeezing, setting_size=:setting_size, wire_size=:wire_size, hammering=:hammering, combination_line=:combination_line, compacting=:compacting, machine_used=:machine_used, kada_salai_size=:kada_salai_size, rfid_chip_number=:rfid_chip_number, file_link=:file_link, rubber_die_number=:rubber_die_number, wax_resin_weight=:wax_resin_weight, ef_batch_number=:ef_batch_number, zinc_surface=:zinc_surface, zinc_die_number=:zinc_die_number, zinc_weight=:zinc_weight, seo_words=:seo_words, usp=:usp, short_description=:short_description, long_description=:long_description, retail_brand=:retail_brand, keywords_tags=:keywords_tags, product_title=:product_title, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *'
WHERE key_code = 'fg_variant_update';

-- 6. Update fg_item_create to include video_upload, video_360
UPDATE project_config SET
  key_value = 'INSERT INTO fg_item_master (design_id, design_code, design_no, collection_name, product_name, manufacturing_name, jewellery_type, sku_type, gender, tech_type, manufacturing_level, occasion, group_sales, sub_category, status, uom1, uom2, video_upload, video_360) VALUES (:design_id, :design_code, :design_no, :collection_name, :product_name, :manufacturing_name, :jewellery_type, :sku_type, :gender, :tech_type, :manufacturing_level, :occasion, :group_sales, :sub_category, :status, :uom1, :uom2, :video_upload, :video_360) RETURNING *'
WHERE key_code = 'fg_item_create';

-- 7. Update fg_item_update to include video_upload, video_360
UPDATE project_config SET
  key_value = 'UPDATE fg_item_master SET manufacturing_name=:manufacturing_name, jewellery_type=:jewellery_type, sku_type=:sku_type, gender=:gender, tech_type=:tech_type, manufacturing_level=:manufacturing_level, occasion=:occasion, group_sales=:group_sales, sub_category=:sub_category, status=:status, uom1=:uom1, uom2=:uom2, video_upload=:video_upload, video_360=:video_360, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *'
WHERE key_code = 'fg_item_update';
