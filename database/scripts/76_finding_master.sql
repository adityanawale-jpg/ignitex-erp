-- ============================================================
-- 76_finding_master.sql
-- Create Finding Master: tables + project_config queries + menu
-- Tables: fin_item_master, fin_item_variant, fin_item_variant_client
-- Mirrors FG Master but with fin_ prefix and FIN_SKU_TYPE lookup.
-- Run after 75_fix_fg_variant_create_query.sql
-- ============================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════
-- 1. TABLES
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fin_item_master (
  id                  SERIAL PRIMARY KEY,
  design_id           INT          REFERENCES design_master(id),
  design_code         VARCHAR(50)  NOT NULL,
  design_no           VARCHAR(50),
  collection_name     VARCHAR(100),
  product_name        VARCHAR(100),
  manufacturing_name  VARCHAR(200),
  item_image          VARCHAR(500),
  jewellery_type      VARCHAR(50),
  sku_type            VARCHAR(50),
  gender              VARCHAR(20),
  tech_type           VARCHAR(50),
  manufacturing_level VARCHAR(50),
  occasion            VARCHAR(100),
  group_sales         VARCHAR(100),
  sub_category        VARCHAR(100),
  status              VARCHAR(50)  DEFAULT 'DRAFT',
  uom1                VARCHAR(20),
  uom2                VARCHAR(20),
  video_upload        VARCHAR(500),
  video_360           VARCHAR(500),
  is_active           BOOLEAN      DEFAULT TRUE,
  deactivation_reason VARCHAR(500),
  deactivated_at      TIMESTAMP,
  created_by          INT,
  updated_by          INT,
  created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fin_item_variant (
  id                  SERIAL PRIMARY KEY,
  item_id             INT          NOT NULL REFERENCES fin_item_master(id) ON DELETE CASCADE,
  sku_code            VARCHAR(150) UNIQUE NOT NULL,
  karat_color         VARCHAR(50),
  sku_type            VARCHAR(50),
  group_sales         VARCHAR(100),
  old_erp_variant     VARCHAR(100),
  weight_band         VARCHAR(50),
  size                VARCHAR(50),
  width_size          VARCHAR(50),
  style_tone          VARCHAR(50),
  design_source       VARCHAR(100),
  standard_alloy      VARCHAR(100),
  vendor_name         VARCHAR(200),
  vendor_variant_code VARCHAR(100),
  vendor_variant_name VARCHAR(200),
  shape               VARCHAR(50),
  product_description TEXT,
  pipe_thickness      VARCHAR(50),
  diamond_cut         VARCHAR(50),
  squeezing           VARCHAR(50),
  setting_size        VARCHAR(50),
  wire_size           VARCHAR(50),
  hammering           VARCHAR(50),
  combination_line    VARCHAR(50),
  compacting          VARCHAR(50),
  machine_used        VARCHAR(100),
  kada_salai_size     VARCHAR(50),
  rfid_chip_number    VARCHAR(100),
  file_link           VARCHAR(500),
  rubber_die_number   VARCHAR(100),
  wax_resin_weight    DECIMAL(10,4),
  ef_batch_number     VARCHAR(100),
  zinc_surface        VARCHAR(100),
  zinc_die_number     VARCHAR(100),
  zinc_weight         DECIMAL(10,4),
  seo_words           TEXT,
  usp                 TEXT,
  short_description   TEXT,
  long_description    TEXT,
  retail_brand        VARCHAR(100),
  keywords_tags       TEXT,
  product_title       VARCHAR(300),
  is_active           BOOLEAN      DEFAULT TRUE,
  created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fin_variant_item ON fin_item_variant(item_id);

CREATE TABLE IF NOT EXISTS fin_item_variant_client (
  id                    SERIAL PRIMARY KEY,
  variant_id            INT          NOT NULL REFERENCES fin_item_variant(id) ON DELETE CASCADE,
  customer_name         VARCHAR(255),
  customer_variant_code VARCHAR(100),
  customer_variant_name VARCHAR(200),
  alloy_code            VARCHAR(50),
  group_sales           VARCHAR(100),
  is_active             BOOLEAN      DEFAULT TRUE,
  created_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fin_ivc_variant ON fin_item_variant_client(variant_id);

-- ══════════════════════════════════════════════════════════════
-- 2. PROJECT CONFIG QUERIES
-- ══════════════════════════════════════════════════════════════
INSERT INTO project_config (key_code, key_value, description, config_type, is_active) VALUES

-- ── Item Master list / count / stats ─────────────────────────
('fin_item_list_get',
 'SELECT i.id, i.design_code, i.design_no, i.manufacturing_name, i.collection_name, i.product_name, i.sub_category, i.jewellery_type, i.sku_type, i.gender, i.tech_type, i.manufacturing_level, i.occasion, i.group_sales, i.status, i.is_active, i.created_at, COUNT(v.id)::int AS variant_count, STRING_AGG(v.sku_code, '', '' ORDER BY v.sku_code) AS sku_code FROM fin_item_master i LEFT JOIN fin_item_variant v ON v.item_id = i.id AND v.is_active = TRUE WHERE (i.is_active = CASE WHEN :status = ''active'' THEN TRUE WHEN :status = ''inactive'' THEN FALSE ELSE i.is_active END) AND (COALESCE(:search, '''') = '''' OR i.design_code ILIKE ''%'' || :search || ''%'' OR i.product_name ILIKE ''%'' || :search || ''%'' OR i.manufacturing_name ILIKE ''%'' || :search || ''%'' OR i.collection_name ILIKE ''%'' || :search || ''%'') GROUP BY i.id ORDER BY i.design_code LIMIT :limit OFFSET :offset',
 'Finding items worklist — server-side search + pagination', 'query', TRUE),

('fin_item_list_count',
 'SELECT COUNT(*)::int AS total FROM fin_item_master i WHERE (i.is_active = CASE WHEN :status = ''active'' THEN TRUE WHEN :status = ''inactive'' THEN FALSE ELSE i.is_active END) AND (COALESCE(:search, '''') = '''' OR i.design_code ILIKE ''%'' || :search || ''%'' OR i.product_name ILIKE ''%'' || :search || ''%'' OR i.manufacturing_name ILIKE ''%'' || :search || ''%'' OR i.collection_name ILIKE ''%'' || :search || ''%'')',
 'Count Finding items with search + status filter', 'query', TRUE),

('fin_item_stats',
 'SELECT COUNT(CASE WHEN is_active = TRUE THEN 1 END)::int AS active, COUNT(CASE WHEN is_active = FALSE THEN 1 END)::int AS inactive FROM fin_item_master',
 'Finding item active / inactive totals', 'query', TRUE),

('fin_item_get_by_id',
 'SELECT i.*, d.design_attributes::text AS design_attributes_json, d.design_image FROM fin_item_master i LEFT JOIN design_master d ON d.design_code = i.design_code WHERE i.id = :id',
 'Finding item by id (incl. design_image)', 'query', TRUE),

-- ── Item Master CRUD ─────────────────────────────────────────
('fin_item_create',
 'INSERT INTO fin_item_master (design_id, design_code, design_no, collection_name, product_name, manufacturing_name, jewellery_type, sku_type, gender, tech_type, manufacturing_level, occasion, group_sales, sub_category, status, uom1, uom2, video_upload, video_360) VALUES (:design_id, :design_code, :design_no, :collection_name, :product_name, :manufacturing_name, :jewellery_type, :sku_type, :gender, :tech_type, :manufacturing_level, :occasion, :group_sales, :sub_category, :status, :uom1, :uom2, :video_upload, :video_360) RETURNING *',
 'Create Finding item', 'query', TRUE),

('fin_item_update',
 'UPDATE fin_item_master SET manufacturing_name=:manufacturing_name, jewellery_type=:jewellery_type, sku_type=:sku_type, gender=:gender, tech_type=:tech_type, manufacturing_level=:manufacturing_level, occasion=:occasion, group_sales=:group_sales, sub_category=:sub_category, status=:status, uom1=:uom1, uom2=:uom2, video_upload=:video_upload, video_360=:video_360, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *',
 'Update Finding item', 'query', TRUE),

('fin_item_toggle',
 E'UPDATE fin_item_master\nSET is_active           = NOT is_active,\n    deactivation_reason = CASE WHEN is_active THEN :reason ELSE NULL END,\n    deactivated_at      = CASE WHEN is_active THEN CURRENT_TIMESTAMP ELSE NULL END,\n    updated_at          = CURRENT_TIMESTAMP\nWHERE id = :id\nRETURNING id, design_code, is_active',
 'Toggle Finding item active / deactivation', 'query', TRUE),

-- ── Variant list / CRUD ──────────────────────────────────────
('fin_variant_list_get',
 'SELECT * FROM fin_item_variant WHERE item_id=:item_id AND is_active=TRUE ORDER BY sku_code',
 'Variants for a Finding item', 'query', TRUE),

('fin_variant_create',
 E'INSERT INTO fin_item_variant\n  (item_id, sku_code, karat_color, sku_type, group_sales,\n   old_erp_variant, weight_band, size, width_size, style_tone,\n   design_source, standard_alloy, vendor_name,\n   vendor_variant_code, vendor_variant_name,\n   shape, product_description, pipe_thickness, diamond_cut, squeezing,\n   setting_size, wire_size, hammering, combination_line, compacting,\n   machine_used, kada_salai_size, rfid_chip_number, file_link,\n   rubber_die_number, wax_resin_weight, ef_batch_number,\n   zinc_surface, zinc_die_number, zinc_weight,\n   seo_words, usp, short_description, long_description,\n   retail_brand, keywords_tags, product_title)\nVALUES\n  (:item_id, :sku_code, :karat_color, :sku_type, :group_sales,\n   :old_erp_variant, :weight_band, :size, :width_size, :style_tone,\n   :design_source, :standard_alloy, :vendor_name,\n   :vendor_variant_code, :vendor_variant_name,\n   :shape, :product_description, :pipe_thickness, :diamond_cut, :squeezing,\n   :setting_size, :wire_size, :hammering, :combination_line, :compacting,\n   :machine_used, :kada_salai_size, :rfid_chip_number, :file_link,\n   :rubber_die_number, :wax_resin_weight, :ef_batch_number,\n   :zinc_surface, :zinc_die_number, :zinc_weight,\n   :seo_words, :usp, :short_description, :long_description,\n   :retail_brand, :keywords_tags, :product_title)\nRETURNING *',
 'Create Finding variant', 'query', TRUE),

('fin_variant_update',
 E'UPDATE fin_item_variant SET\n  karat_color              = :karat_color,\n  sku_type                 = :sku_type,\n  group_sales              = :group_sales,\n  old_erp_variant          = :old_erp_variant,\n  weight_band              = :weight_band,\n  size                     = :size,\n  width_size               = :width_size,\n  style_tone               = :style_tone,\n  design_source            = :design_source,\n  standard_alloy           = :standard_alloy,\n  vendor_name              = :vendor_name,\n  vendor_variant_code      = :vendor_variant_code,\n  vendor_variant_name      = :vendor_variant_name,\n  shape                    = :shape,\n  product_description      = :product_description,\n  pipe_thickness           = :pipe_thickness,\n  diamond_cut              = :diamond_cut,\n  squeezing                = :squeezing,\n  setting_size             = :setting_size,\n  wire_size                = :wire_size,\n  hammering                = :hammering,\n  combination_line         = :combination_line,\n  compacting               = :compacting,\n  machine_used             = :machine_used,\n  kada_salai_size          = :kada_salai_size,\n  rfid_chip_number         = :rfid_chip_number,\n  file_link                = :file_link,\n  rubber_die_number        = :rubber_die_number,\n  wax_resin_weight         = :wax_resin_weight,\n  ef_batch_number          = :ef_batch_number,\n  zinc_surface             = :zinc_surface,\n  zinc_die_number          = :zinc_die_number,\n  zinc_weight              = :zinc_weight,\n  seo_words                = :seo_words,\n  usp                      = :usp,\n  short_description        = :short_description,\n  long_description         = :long_description,\n  retail_brand             = :retail_brand,\n  keywords_tags            = :keywords_tags,\n  product_title            = :product_title,\n  updated_at               = CURRENT_TIMESTAMP\nWHERE id = :id\nRETURNING *',
 'Update Finding variant', 'query', TRUE),

('fin_variant_toggle',
 'UPDATE fin_item_variant SET is_active = NOT is_active, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING id, sku_code, is_active',
 'Toggle Finding variant status', 'query', TRUE),

-- ── Variant client CRUD ──────────────────────────────────────
('fin_variant_client_get',
 'SELECT id, variant_id, customer_name, customer_variant_code, customer_variant_name, alloy_code, group_sales FROM fin_item_variant_client WHERE variant_id=:variant_id AND is_active=TRUE ORDER BY id',
 'Client variants for a Finding SKU variant', 'query', TRUE),

('fin_variant_client_delete_all',
 'DELETE FROM fin_item_variant_client WHERE variant_id=:variant_id',
 'Delete all client variants for a Finding SKU variant', 'query', TRUE),

('fin_variant_client_create',
 'INSERT INTO fin_item_variant_client (variant_id, customer_name, customer_variant_code, customer_variant_name, alloy_code, group_sales) VALUES (:variant_id, :customer_name, :customer_variant_code, :customer_variant_name, :alloy_code, :group_sales) RETURNING *',
 'Create Finding client variant row', 'query', TRUE)

ON CONFLICT (key_code) DO UPDATE SET
  key_value   = EXCLUDED.key_value,
  description = EXCLUDED.description,
  updated_at  = CURRENT_TIMESTAMP;

-- ══════════════════════════════════════════════════════════════
-- 3. MENU ENTRY  (parent_id=2 = Master Management)
-- ══════════════════════════════════════════════════════════════
INSERT INTO menu_master
  (parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active)
VALUES
  (2, 'MM_FIN_ITEMS', 'Finding Master', '/master-mgmt/finding-master', 'WrenchScrewdriverIcon', 3, 2, TRUE)
ON CONFLICT (menu_code) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 4. ROLE PERMISSIONS
-- ══════════════════════════════════════════════════════════════
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT 1, id, TRUE, TRUE, TRUE, TRUE  FROM menu_master WHERE menu_code = 'MM_FIN_ITEMS'
ON CONFLICT (role_id, menu_id) DO NOTHING;

INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT 2, id, TRUE, TRUE, TRUE, FALSE FROM menu_master WHERE menu_code = 'MM_FIN_ITEMS'
ON CONFLICT (role_id, menu_id) DO NOTHING;

COMMIT;
