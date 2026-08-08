-- ============================================================
-- 113_variant_document_uploads.sql
-- Add real file-upload columns for the "Add New Variant" Casting
-- tab (CAD File, Manufacturing Drawing, Technical Documents) on
-- fg_item_variant and fin_item_variant, and update the four
-- variant CRUD queries to include them.
-- Run after 112_finding_used_in_bom.sql
-- ============================================================

-- ── 1. DDL ───────────────────────────────────────────────────
ALTER TABLE fg_item_variant
  ADD COLUMN IF NOT EXISTS cad_file_url              VARCHAR(500),
  ADD COLUMN IF NOT EXISTS manufacturing_drawing_url  VARCHAR(500),
  ADD COLUMN IF NOT EXISTS technical_documents_url    VARCHAR(500);

ALTER TABLE fin_item_variant
  ADD COLUMN IF NOT EXISTS cad_file_url              VARCHAR(500),
  ADD COLUMN IF NOT EXISTS manufacturing_drawing_url  VARCHAR(500),
  ADD COLUMN IF NOT EXISTS technical_documents_url    VARCHAR(500);

-- ── 2. fg_variant_create ─────────────────────────────────────
UPDATE project_config SET key_value =
'INSERT INTO fg_item_variant
  (item_id, sku_code, karat_color, sku_type, group_sales,
   old_erp_variant, weight_band, size, width_size, style_tone,
   design_source, standard_alloy, catalogue_reference, vendor_name,
   vendor_variant_code, vendor_variant_name,
   shape, product_description, pipe_thickness, diamond_cut, squeezing,
   setting_size, wire_size, hammering, combination_line, compacting,
   machine_used, kada_salai_size, rfid_chip_number, file_link,
   cad_file_url, manufacturing_drawing_url, technical_documents_url,
   rubber_die_number, wax_resin_weight, ef_batch_number,
   zinc_surface, zinc_die_number, zinc_weight,
   seo_words, usp, short_description, long_description,
   retail_brand, keywords_tags, product_title)
VALUES
  (:item_id, :sku_code, :karat_color, :sku_type, :group_sales,
   :old_erp_variant, :weight_band, :size, :width_size, :style_tone,
   :design_source, :standard_alloy, :catalogue_reference, :vendor_name,
   :vendor_variant_code, :vendor_variant_name,
   :shape, :product_description, :pipe_thickness, :diamond_cut, :squeezing,
   :setting_size, :wire_size, :hammering, :combination_line, :compacting,
   :machine_used, :kada_salai_size, :rfid_chip_number, :file_link,
   :cad_file_url, :manufacturing_drawing_url, :technical_documents_url,
   :rubber_die_number, :wax_resin_weight, :ef_batch_number,
   :zinc_surface, :zinc_die_number, :zinc_weight,
   :seo_words, :usp, :short_description, :long_description,
   :retail_brand, :keywords_tags, :product_title)
RETURNING *'
WHERE key_code = 'fg_variant_create';

-- ── 3. fg_variant_update ─────────────────────────────────────
UPDATE project_config SET key_value =
'UPDATE fg_item_variant SET
  karat_color              = :karat_color,
  sku_type                 = :sku_type,
  group_sales              = :group_sales,
  old_erp_variant          = :old_erp_variant,
  weight_band              = :weight_band,
  size                     = :size,
  width_size               = :width_size,
  style_tone               = :style_tone,
  design_source            = :design_source,
  standard_alloy           = :standard_alloy,
  catalogue_reference      = :catalogue_reference,
  vendor_name              = :vendor_name,
  vendor_variant_code      = :vendor_variant_code,
  vendor_variant_name      = :vendor_variant_name,
  shape                    = :shape,
  product_description      = :product_description,
  pipe_thickness           = :pipe_thickness,
  diamond_cut              = :diamond_cut,
  squeezing                = :squeezing,
  setting_size             = :setting_size,
  wire_size                = :wire_size,
  hammering                = :hammering,
  combination_line         = :combination_line,
  compacting               = :compacting,
  machine_used             = :machine_used,
  kada_salai_size          = :kada_salai_size,
  rfid_chip_number         = :rfid_chip_number,
  file_link                = :file_link,
  cad_file_url             = :cad_file_url,
  manufacturing_drawing_url = :manufacturing_drawing_url,
  technical_documents_url  = :technical_documents_url,
  rubber_die_number        = :rubber_die_number,
  wax_resin_weight         = :wax_resin_weight,
  ef_batch_number          = :ef_batch_number,
  zinc_surface             = :zinc_surface,
  zinc_die_number          = :zinc_die_number,
  zinc_weight              = :zinc_weight,
  seo_words                = :seo_words,
  usp                      = :usp,
  short_description        = :short_description,
  long_description         = :long_description,
  retail_brand             = :retail_brand,
  keywords_tags            = :keywords_tags,
  product_title            = :product_title,
  updated_at               = CURRENT_TIMESTAMP
WHERE id = :id
RETURNING *'
WHERE key_code = 'fg_variant_update';

-- ── 4. fin_variant_create ────────────────────────────────────
UPDATE project_config SET key_value = $q$
INSERT INTO fin_item_variant
  (item_id, sku_code, karat_color, sku_type, group_sales,
   old_erp_variant, weight_band, size, width_size, style_tone,
   design_source, standard_alloy, catalogue_reference, vendor_name,
   vendor_variant_code, vendor_variant_name,
   shape, product_description, pipe_thickness, diamond_cut, squeezing,
   setting_size, wire_size, hammering, combination_line, compacting,
   machine_used, kada_salai_size, rfid_chip_number, file_link,
   cad_file_url, manufacturing_drawing_url, technical_documents_url,
   rubber_die_number, gross_weight, net_weight,
   wax_resin_weight, ef_batch_number,
   zinc_surface, zinc_die_number, zinc_weight,
   seo_words, usp, short_description, long_description,
   retail_brand, keywords_tags, product_title)
VALUES
  (:item_id, :sku_code, :karat_color, :sku_type, :group_sales,
   :old_erp_variant, :weight_band, :size, :width_size, :style_tone,
   :design_source, :standard_alloy, :catalogue_reference, :vendor_name,
   :vendor_variant_code, :vendor_variant_name,
   :shape, :product_description, :pipe_thickness, :diamond_cut, :squeezing,
   :setting_size, :wire_size, :hammering, :combination_line, :compacting,
   :machine_used, :kada_salai_size, :rfid_chip_number, :file_link,
   :cad_file_url, :manufacturing_drawing_url, :technical_documents_url,
   :rubber_die_number, :gross_weight, :net_weight,
   :wax_resin_weight, :ef_batch_number,
   :zinc_surface, :zinc_die_number, :zinc_weight,
   :seo_words, :usp, :short_description, :long_description,
   :retail_brand, :keywords_tags, :product_title)
RETURNING *
$q$
WHERE key_code = 'fin_variant_create';

-- ── 5. fin_variant_update ────────────────────────────────────
UPDATE project_config SET key_value = $q$
UPDATE fin_item_variant SET
  karat_color              = :karat_color,
  sku_type                 = :sku_type,
  group_sales              = :group_sales,
  old_erp_variant          = :old_erp_variant,
  weight_band              = :weight_band,
  size                     = :size,
  width_size               = :width_size,
  style_tone               = :style_tone,
  design_source            = :design_source,
  standard_alloy           = :standard_alloy,
  catalogue_reference      = :catalogue_reference,
  vendor_name              = :vendor_name,
  vendor_variant_code      = :vendor_variant_code,
  vendor_variant_name      = :vendor_variant_name,
  shape                    = :shape,
  product_description      = :product_description,
  pipe_thickness           = :pipe_thickness,
  diamond_cut              = :diamond_cut,
  squeezing                = :squeezing,
  setting_size             = :setting_size,
  wire_size                = :wire_size,
  hammering                = :hammering,
  combination_line         = :combination_line,
  compacting               = :compacting,
  machine_used             = :machine_used,
  kada_salai_size          = :kada_salai_size,
  rfid_chip_number         = :rfid_chip_number,
  file_link                = :file_link,
  cad_file_url             = :cad_file_url,
  manufacturing_drawing_url = :manufacturing_drawing_url,
  technical_documents_url  = :technical_documents_url,
  rubber_die_number        = :rubber_die_number,
  gross_weight             = :gross_weight,
  net_weight               = :net_weight,
  wax_resin_weight         = :wax_resin_weight,
  ef_batch_number          = :ef_batch_number,
  zinc_surface             = :zinc_surface,
  zinc_die_number          = :zinc_die_number,
  zinc_weight              = :zinc_weight,
  seo_words                = :seo_words,
  usp                      = :usp,
  short_description        = :short_description,
  long_description         = :long_description,
  retail_brand             = :retail_brand,
  keywords_tags            = :keywords_tags,
  product_title            = :product_title,
  updated_at               = CURRENT_TIMESTAMP
WHERE id = :id
RETURNING *
$q$
WHERE key_code = 'fin_variant_update';
