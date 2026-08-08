-- ============================================================
-- 21_finished_goods_items.sql
-- Finished Goods Item Master: tables, lookups, project_config
-- Run after 20_add_activation_token.sql
-- ============================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════
-- 1. DESIGN MASTER  (source of LOV for item creation)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS design_master (
  id                 SERIAL PRIMARY KEY,
  design_code        VARCHAR(50)  UNIQUE NOT NULL,
  design_no          VARCHAR(50)  NOT NULL,
  collection_name    VARCHAR(100),
  product_name       VARCHAR(100),
  manufacturing_name VARCHAR(200),
  design_attributes  JSONB        DEFAULT '{}',
  is_active          BOOLEAN      DEFAULT TRUE,
  created_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ══════════════════════════════════════════════════════════════
-- 2. ITEM MASTER  (FG item header – one per design)
-- ══════════════════════════════════════════════════════════════
CREATE SEQUENCE IF NOT EXISTS item_code_seq START 1000;

CREATE TABLE IF NOT EXISTS item_master (
  id                  SERIAL PRIMARY KEY,
  item_code           VARCHAR(100) UNIQUE NOT NULL,
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
  is_active           BOOLEAN      DEFAULT TRUE,
  created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  created_by          INT,
  updated_by          INT
);

-- ══════════════════════════════════════════════════════════════
-- 3. ITEM VARIANT  (SKU level – many per item)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS item_variant (
  id                  SERIAL PRIMARY KEY,
  item_id             INT          NOT NULL REFERENCES item_master(id) ON DELETE CASCADE,
  sku_code            VARCHAR(150) UNIQUE NOT NULL,
  karat_color         VARCHAR(50),
  weight_band         VARCHAR(50),
  size                VARCHAR(50),
  -- General Attributes
  width_size          VARCHAR(50),
  style_tone          VARCHAR(50),
  client_variant_code VARCHAR(100),
  client_variant_name VARCHAR(200),
  vendor_variant_code VARCHAR(100),
  vendor_variant_name VARCHAR(200),
  shape               VARCHAR(50),
  product_description TEXT,
  -- Manufacturing
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
  -- Casting
  rfid_chip_number    VARCHAR(100),
  file_link           VARCHAR(500),
  rubber_die_number   VARCHAR(100),
  wax_resin_weight    DECIMAL(10,4),
  -- Electro Forming
  ef_batch_number     VARCHAR(100),
  zinc_surface        VARCHAR(100),
  zinc_die_number     VARCHAR(100),
  zinc_weight         DECIMAL(10,4),
  -- E-Commerce
  seo_words           TEXT,
  usp                 TEXT,
  short_description   TEXT,
  long_description    TEXT,
  retail_brand        VARCHAR(100),
  keywords_tags       TEXT,
  product_title       VARCHAR(300),
  -- Media
  video_upload        VARCHAR(500),
  video_360           VARCHAR(500),
  is_active           BOOLEAN   DEFAULT TRUE,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ══════════════════════════════════════════════════════════════
-- 4. METAL BOM
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS item_metal_bom (
  id              SERIAL PRIMARY KEY,
  variant_id      INT          NOT NULL REFERENCES item_variant(id) ON DELETE CASCADE,
  seq_no          INT          DEFAULT 1,
  metal_type      VARCHAR(100) NOT NULL,
  purity_karat    VARCHAR(50),
  weight          DECIMAL(10,4),
  uom             VARCHAR(20)  DEFAULT 'gm',
  loss_percentage DECIMAL(5,2) DEFAULT 0,
  is_active       BOOLEAN      DEFAULT TRUE
);

-- ══════════════════════════════════════════════════════════════
-- 5. STONE BOM
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS item_stone_bom (
  id           SERIAL PRIMARY KEY,
  variant_id   INT          NOT NULL REFERENCES item_variant(id) ON DELETE CASCADE,
  seq_no       INT          DEFAULT 1,
  stone_type   VARCHAR(100) NOT NULL,
  shape        VARCHAR(50),
  size         VARCHAR(50),
  weight       DECIMAL(10,4),
  quantity     INT          DEFAULT 0,
  setting_type VARCHAR(50),
  is_active    BOOLEAN      DEFAULT TRUE
);

-- ══════════════════════════════════════════════════════════════
-- 6. SAMPLE DESIGN DATA
-- ══════════════════════════════════════════════════════════════
INSERT INTO design_master
  (design_code, design_no, collection_name, product_name, manufacturing_name, design_attributes)
VALUES
  ('DES-001','DN-2024-001','Bridal Gold',  'Necklace', 'Traditional Choker Necklace', '{"style":"Traditional","occasion":"Bridal","complexity":"High"}'),
  ('DES-002','DN-2024-002','Daily Wear',   'Ring',     'Solitaire Ring Design',        '{"style":"Modern","occasion":"Casual","complexity":"Medium"}'),
  ('DES-003','DN-2024-003','Festive',      'Earring',  'Jhumka Earring Design',        '{"style":"Ethnic","occasion":"Festive","complexity":"Medium"}'),
  ('DES-004','DN-2024-004','Premium',      'Bracelet', 'Tennis Bracelet Design',       '{"style":"Contemporary","occasion":"Party","complexity":"High"}'),
  ('DES-005','DN-2024-005','Kids',         'Pendant',  'Cartoon Pendant Design',       '{"style":"Cute","occasion":"Casual","complexity":"Low"}')
ON CONFLICT (design_code) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 7. LOOKUP DATA
-- ══════════════════════════════════════════════════════════════
INSERT INTO master_lookup
  (lookup_type, lookup_code, lookup_name, display_order, is_active)
VALUES
  -- Karat / Color
  ('KARAT_COLOR','YG22',  '22KT Yellow Gold',  1, TRUE),
  ('KARAT_COLOR','YG18',  '18KT Yellow Gold',  2, TRUE),
  ('KARAT_COLOR','WG18',  '18KT White Gold',   3, TRUE),
  ('KARAT_COLOR','RG18',  '18KT Rose Gold',    4, TRUE),
  ('KARAT_COLOR','PT950', 'Platinum 950',      5, TRUE),
  ('KARAT_COLOR','SLV925','Silver 925',        6, TRUE),
  -- Weight Band
  ('WEIGHT_BAND','LT2G',  'Below 2 gm',        1, TRUE),
  ('WEIGHT_BAND','2_5G',  '2 to 5 gm',         2, TRUE),
  ('WEIGHT_BAND','5_10G', '5 to 10 gm',        3, TRUE),
  ('WEIGHT_BAND','10_20G','10 to 20 gm',       4, TRUE),
  ('WEIGHT_BAND','GT20G', 'Above 20 gm',       5, TRUE),
  -- Jewellery Type
  ('JEWELLERY_TYPE','RING',    'Ring',     1, TRUE),
  ('JEWELLERY_TYPE','NECKLACE','Necklace', 2, TRUE),
  ('JEWELLERY_TYPE','EARRING', 'Earring',  3, TRUE),
  ('JEWELLERY_TYPE','BRACELET','Bracelet', 4, TRUE),
  ('JEWELLERY_TYPE','PENDANT', 'Pendant',  5, TRUE),
  ('JEWELLERY_TYPE','BANGLE',  'Bangle',   6, TRUE),
  ('JEWELLERY_TYPE','ANKLET',  'Anklet',   7, TRUE),
  ('JEWELLERY_TYPE','BROOCH',  'Brooch',   8, TRUE),
  -- SKU Type
  ('SKU_TYPE','STD',    'Standard',     1, TRUE),
  ('SKU_TYPE','CUSTOM', 'Custom Made',  2, TRUE),
  ('SKU_TYPE','PROMO',  'Promotional',  3, TRUE),
  -- Gender
  ('GENDER','LADIES', 'Ladies',  1, TRUE),
  ('GENDER','GENTS',  'Gents',   2, TRUE),
  ('GENDER','KIDS',   'Kids',    3, TRUE),
  ('GENDER','UNISEX', 'Unisex',  4, TRUE),
  -- Tech Type
  ('TECH_TYPE','CASTING',  'Casting',       1, TRUE),
  ('TECH_TYPE','HANDMADE', 'Handmade',      2, TRUE),
  ('TECH_TYPE','MACHINE',  'Machine Made',  3, TRUE),
  ('TECH_TYPE','EF',       'Electroforming',4, TRUE),
  ('TECH_TYPE','STAMPING', 'Stamping',      5, TRUE),
  -- Manufacturing Level
  ('MFG_LEVEL','L1','Level 1 – Basic',        1, TRUE),
  ('MFG_LEVEL','L2','Level 2 – Intermediate', 2, TRUE),
  ('MFG_LEVEL','L3','Level 3 – Advanced',     3, TRUE),
  -- Occasion
  ('OCCASION','WEDDING','Wedding',       1, TRUE),
  ('OCCASION','BRIDAL', 'Bridal',        2, TRUE),
  ('OCCASION','FESTIVE','Festive',       3, TRUE),
  ('OCCASION','CASUAL', 'Casual Wear',   4, TRUE),
  ('OCCASION','PARTY',  'Party Wear',    5, TRUE),
  -- Group Sales
  ('GROUP_SALES','RETAIL',    'Retail',    1, TRUE),
  ('GROUP_SALES','WHOLESALE', 'Wholesale', 2, TRUE),
  ('GROUP_SALES','EXPORT',    'Export',    3, TRUE),
  -- Sub Category
  ('SUB_CATEGORY','PLAIN',     'Plain Gold',  1, TRUE),
  ('SUB_CATEGORY','STUDDED',   'Studded',     2, TRUE),
  ('SUB_CATEGORY','DIAMOND',   'Diamond',     3, TRUE),
  ('SUB_CATEGORY','KUNDAN',    'Kundan',      4, TRUE),
  ('SUB_CATEGORY','MEENAKARI', 'Meenakari',   5, TRUE),
  -- Style Tone
  ('STYLE_TONE','SINGLE',    'Single Tone',  1, TRUE),
  ('STYLE_TONE','TWO_TONE',  'Two Tone',     2, TRUE),
  ('STYLE_TONE','THREE_TONE','Three Tone',   3, TRUE),
  -- Shape
  ('SHAPE','FLAT',       'Flat',        1, TRUE),
  ('SHAPE','ROUND',      'Round',       2, TRUE),
  ('SHAPE','OVAL',       'Oval',        3, TRUE),
  ('SHAPE','SQUARE',     'Square',      4, TRUE),
  ('SHAPE','RECTANGULAR','Rectangular', 5, TRUE),
  -- Metal Type (BOM)
  ('METAL_TYPE','GOLD',     'Gold',     1, TRUE),
  ('METAL_TYPE','SILVER',   'Silver',   2, TRUE),
  ('METAL_TYPE','PLATINUM', 'Platinum', 3, TRUE),
  ('METAL_TYPE','RHODIUM',  'Rhodium',  4, TRUE),
  -- UOM
  ('UOM','GM', 'Gram',     1, TRUE),
  ('UOM','CT', 'Carat',    2, TRUE),
  ('UOM','PCS','Pieces',   3, TRUE),
  ('UOM','KG', 'Kilogram', 4, TRUE),
  -- Stone Type (BOM)
  ('STONE_TYPE','DIAMOND',    'Diamond',         1, TRUE),
  ('STONE_TYPE','RUBY',       'Ruby',            2, TRUE),
  ('STONE_TYPE','EMERALD',    'Emerald',         3, TRUE),
  ('STONE_TYPE','SAPPHIRE',   'Sapphire',        4, TRUE),
  ('STONE_TYPE','CZ',         'Cubic Zirconia',  5, TRUE),
  ('STONE_TYPE','PEARL',      'Pearl',           6, TRUE),
  ('STONE_TYPE','MOISSANITE', 'Moissanite',      7, TRUE),
  -- Setting Type
  ('SETTING_TYPE','PRONG',    'Prong Setting',    1, TRUE),
  ('SETTING_TYPE','BEZEL',    'Bezel Setting',    2, TRUE),
  ('SETTING_TYPE','CHANNEL',  'Channel Setting',  3, TRUE),
  ('SETTING_TYPE','PAVE',     'Pavé Setting',     4, TRUE),
  ('SETTING_TYPE','INVISIBLE','Invisible Setting', 5, TRUE),
  ('SETTING_TYPE','FLUSH',    'Flush Setting',    6, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 8. PROJECT CONFIG  (dynamic API query store)
-- ══════════════════════════════════════════════════════════════
INSERT INTO project_config (key_code, key_value, description, config_type, is_active) VALUES

('design_list_get',
 'SELECT id, design_code, design_no, collection_name, product_name, manufacturing_name, design_attributes::text AS design_attributes FROM design_master WHERE is_active = TRUE ORDER BY design_code',
 'Design master LOV', 'query', TRUE),

('fg_item_list_get',
 'SELECT i.id, i.item_code, i.design_code, i.manufacturing_name, i.collection_name, i.product_name, i.sub_category, i.jewellery_type, i.sku_type, i.gender, i.tech_type, i.manufacturing_level, i.occasion, i.group_sales, i.status, i.is_active, i.created_at, COUNT(v.id)::int AS variant_count FROM item_master i LEFT JOIN item_variant v ON v.item_id = i.id AND v.is_active = TRUE GROUP BY i.id ORDER BY i.item_code',
 'FG items worklist', 'query', TRUE),

('fg_item_get_by_id',
 'SELECT i.*, d.design_attributes::text AS design_attributes_json FROM item_master i LEFT JOIN design_master d ON d.design_code = i.design_code WHERE i.id = :id',
 'FG item by id', 'query', TRUE),

('fg_item_create',
 E'INSERT INTO item_master (item_code, design_id, design_code, design_no, collection_name, product_name, manufacturing_name, jewellery_type, sku_type, gender, tech_type, manufacturing_level, occasion, group_sales, sub_category) VALUES (\'FG-\' || TO_CHAR(CURRENT_DATE, \'YYYYMM\') || \'-\' || LPAD(nextval(\'item_code_seq\')::text, 4, \'0\'), :design_id, :design_code, :design_no, :collection_name, :product_name, :manufacturing_name, :jewellery_type, :sku_type, :gender, :tech_type, :manufacturing_level, :occasion, :group_sales, :sub_category) RETURNING *',
 'Create FG item', 'query', TRUE),

('fg_item_update',
 'UPDATE item_master SET jewellery_type=:jewellery_type, sku_type=:sku_type, gender=:gender, tech_type=:tech_type, manufacturing_level=:manufacturing_level, occasion=:occasion, group_sales=:group_sales, sub_category=:sub_category, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *',
 'Update FG item', 'query', TRUE),

('fg_item_toggle',
 'UPDATE item_master SET is_active = NOT is_active, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING id, item_code, is_active',
 'Toggle FG item status', 'query', TRUE),

-- Variants
('fg_variant_list_get',
 'SELECT * FROM item_variant WHERE item_id=:item_id AND is_active=TRUE ORDER BY sku_code',
 'Variants for an item', 'query', TRUE),

('fg_variant_create',
 'INSERT INTO item_variant (item_id, sku_code, karat_color, weight_band, size, width_size, style_tone, client_variant_code, client_variant_name, vendor_variant_code, vendor_variant_name, shape, product_description, pipe_thickness, diamond_cut, squeezing, setting_size, wire_size, hammering, combination_line, compacting, machine_used, kada_salai_size, rfid_chip_number, file_link, rubber_die_number, wax_resin_weight, ef_batch_number, zinc_surface, zinc_die_number, zinc_weight, seo_words, usp, short_description, long_description, retail_brand, keywords_tags, product_title, video_upload, video_360) VALUES (:item_id, :sku_code, :karat_color, :weight_band, :size, :width_size, :style_tone, :client_variant_code, :client_variant_name, :vendor_variant_code, :vendor_variant_name, :shape, :product_description, :pipe_thickness, :diamond_cut, :squeezing, :setting_size, :wire_size, :hammering, :combination_line, :compacting, :machine_used, :kada_salai_size, :rfid_chip_number, :file_link, :rubber_die_number, :wax_resin_weight, :ef_batch_number, :zinc_surface, :zinc_die_number, :zinc_weight, :seo_words, :usp, :short_description, :long_description, :retail_brand, :keywords_tags, :product_title, :video_upload, :video_360) RETURNING *',
 'Create variant', 'query', TRUE),

('fg_variant_update',
 'UPDATE item_variant SET karat_color=:karat_color, weight_band=:weight_band, size=:size, width_size=:width_size, style_tone=:style_tone, client_variant_code=:client_variant_code, client_variant_name=:client_variant_name, vendor_variant_code=:vendor_variant_code, vendor_variant_name=:vendor_variant_name, shape=:shape, product_description=:product_description, pipe_thickness=:pipe_thickness, diamond_cut=:diamond_cut, squeezing=:squeezing, setting_size=:setting_size, wire_size=:wire_size, hammering=:hammering, combination_line=:combination_line, compacting=:compacting, machine_used=:machine_used, kada_salai_size=:kada_salai_size, rfid_chip_number=:rfid_chip_number, file_link=:file_link, rubber_die_number=:rubber_die_number, wax_resin_weight=:wax_resin_weight, ef_batch_number=:ef_batch_number, zinc_surface=:zinc_surface, zinc_die_number=:zinc_die_number, zinc_weight=:zinc_weight, seo_words=:seo_words, usp=:usp, short_description=:short_description, long_description=:long_description, retail_brand=:retail_brand, keywords_tags=:keywords_tags, product_title=:product_title, video_upload=:video_upload, video_360=:video_360, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *',
 'Update variant', 'query', TRUE),

('fg_variant_toggle',
 'UPDATE item_variant SET is_active = NOT is_active, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING id, sku_code, is_active',
 'Toggle variant status', 'query', TRUE),

-- Metal BOM
('fg_metal_bom_get',
 'SELECT id, variant_id, seq_no, metal_type, purity_karat, weight, uom, loss_percentage FROM item_metal_bom WHERE variant_id=:variant_id AND is_active=TRUE ORDER BY seq_no',
 'Metal BOM for variant', 'query', TRUE),

('fg_metal_bom_delete_all',
 'DELETE FROM item_metal_bom WHERE variant_id=:variant_id',
 'Delete all metal BOM rows for variant', 'query', TRUE),

('fg_metal_bom_create',
 'INSERT INTO item_metal_bom (variant_id, seq_no, metal_type, purity_karat, weight, uom, loss_percentage) VALUES (:variant_id, :seq_no, :metal_type, :purity_karat, :weight, :uom, :loss_percentage) RETURNING *',
 'Create metal BOM row', 'query', TRUE),

-- Stone BOM
('fg_stone_bom_get',
 'SELECT id, variant_id, seq_no, stone_type, shape, size, weight, quantity, setting_type FROM item_stone_bom WHERE variant_id=:variant_id AND is_active=TRUE ORDER BY seq_no',
 'Stone BOM for variant', 'query', TRUE),

('fg_stone_bom_delete_all',
 'DELETE FROM item_stone_bom WHERE variant_id=:variant_id',
 'Delete all stone BOM rows for variant', 'query', TRUE),

('fg_stone_bom_create',
 'INSERT INTO item_stone_bom (variant_id, seq_no, stone_type, shape, size, weight, quantity, setting_type) VALUES (:variant_id, :seq_no, :stone_type, :shape, :size, :weight, :quantity, :setting_type) RETURNING *',
 'Create stone BOM row', 'query', TRUE)

ON CONFLICT (key_code) DO UPDATE SET
  key_value   = EXCLUDED.key_value,
  description = EXCLUDED.description,
  updated_at  = CURRENT_TIMESTAMP;

-- ══════════════════════════════════════════════════════════════
-- 9. ROLE PERMISSIONS  (menu MM_FG_ITEMS, id=22, already exists)
-- ══════════════════════════════════════════════════════════════
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT 1, id, TRUE, TRUE, TRUE, TRUE FROM menu_master WHERE menu_code = 'MM_FG_ITEMS'
ON CONFLICT (role_id, menu_id) DO NOTHING;

INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT 2, id, TRUE, TRUE, TRUE, FALSE FROM menu_master WHERE menu_code = 'MM_FG_ITEMS'
ON CONFLICT (role_id, menu_id) DO NOTHING;

COMMIT;
