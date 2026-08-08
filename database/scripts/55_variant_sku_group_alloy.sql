-- ============================================================
-- 55_variant_sku_group_alloy.sql
-- 1. Add sku_type, group_sales to item_variant
-- 2. Add alloy_code, group_sales to item_variant_client
-- 3. Add ALLOY_CODE lookup (1 default record)
-- 4. Update project_config queries
-- ============================================================

BEGIN;

-- ── 1. item_variant: new columns ────────────────────────────
ALTER TABLE item_variant
  ADD COLUMN IF NOT EXISTS sku_type   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS group_sales VARCHAR(100);

-- ── 2. item_variant_client: new columns ─────────────────────
ALTER TABLE item_variant_client
  ADD COLUMN IF NOT EXISTS alloy_code  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS group_sales VARCHAR(100);

-- ── 3. ALLOY_CODE lookup (1 default record) ─────────────────
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active)
VALUES ('ALLOY_CODE', 'STD', 'Standard', 1, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

-- ── 4. Update fg_variant_create ─────────────────────────────
UPDATE project_config SET key_value =
  'INSERT INTO item_variant (item_id, sku_code, karat_color, sku_type, group_sales, weight_band, size, width_size, style_tone, vendor_name, vendor_variant_code, vendor_variant_name, shape, product_description, pipe_thickness, diamond_cut, squeezing, setting_size, wire_size, hammering, combination_line, compacting, machine_used, kada_salai_size, rfid_chip_number, file_link, rubber_die_number, wax_resin_weight, ef_batch_number, zinc_surface, zinc_die_number, zinc_weight, seo_words, usp, short_description, long_description, retail_brand, keywords_tags, product_title, video_upload, video_360) VALUES (:item_id, :sku_code, :karat_color, :sku_type, :group_sales, :weight_band, :size, :width_size, :style_tone, :vendor_name, :vendor_variant_code, :vendor_variant_name, :shape, :product_description, :pipe_thickness, :diamond_cut, :squeezing, :setting_size, :wire_size, :hammering, :combination_line, :compacting, :machine_used, :kada_salai_size, :rfid_chip_number, :file_link, :rubber_die_number, :wax_resin_weight, :ef_batch_number, :zinc_surface, :zinc_die_number, :zinc_weight, :seo_words, :usp, :short_description, :long_description, :retail_brand, :keywords_tags, :product_title, :video_upload, :video_360) RETURNING *'
WHERE key_code = 'fg_variant_create';

-- ── 5. Update fg_variant_update ─────────────────────────────
UPDATE project_config SET key_value =
  'UPDATE item_variant SET karat_color=:karat_color, sku_type=:sku_type, group_sales=:group_sales, weight_band=:weight_band, size=:size, width_size=:width_size, style_tone=:style_tone, vendor_name=:vendor_name, vendor_variant_code=:vendor_variant_code, vendor_variant_name=:vendor_variant_name, shape=:shape, product_description=:product_description, pipe_thickness=:pipe_thickness, diamond_cut=:diamond_cut, squeezing=:squeezing, setting_size=:setting_size, wire_size=:wire_size, hammering=:hammering, combination_line=:combination_line, compacting=:compacting, machine_used=:machine_used, kada_salai_size=:kada_salai_size, rfid_chip_number=:rfid_chip_number, file_link=:file_link, rubber_die_number=:rubber_die_number, wax_resin_weight=:wax_resin_weight, ef_batch_number=:ef_batch_number, zinc_surface=:zinc_surface, zinc_die_number=:zinc_die_number, zinc_weight=:zinc_weight, seo_words=:seo_words, usp=:usp, short_description=:short_description, long_description=:long_description, retail_brand=:retail_brand, keywords_tags=:keywords_tags, product_title=:product_title, video_upload=:video_upload, video_360=:video_360, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *'
WHERE key_code = 'fg_variant_update';

-- ── 6. Update fg_variant_client_get ─────────────────────────
UPDATE project_config SET key_value =
  'SELECT id, variant_id, customer_name, customer_variant_code, customer_variant_name, alloy_code, group_sales FROM item_variant_client WHERE variant_id=:variant_id AND is_active=TRUE ORDER BY id'
WHERE key_code = 'fg_variant_client_get';

-- ── 7. Update fg_variant_client_create ──────────────────────
UPDATE project_config SET key_value =
  'INSERT INTO item_variant_client (variant_id, customer_name, customer_variant_code, customer_variant_name, alloy_code, group_sales) VALUES (:variant_id, :customer_name, :customer_variant_code, :customer_variant_name, :alloy_code, :group_sales) RETURNING *'
WHERE key_code = 'fg_variant_client_create';

COMMIT;
