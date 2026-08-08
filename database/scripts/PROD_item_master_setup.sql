-- ============================================================
-- PROD_item_master_setup.sql
-- Item Master — complete production deployment
-- Covers: design_master, item_master, item_variant,
--         item_metal_bom, item_stone_bom, all lookups,
--         all project_config queries, role permissions
--
-- Safe to run on a fresh DB or one already partially migrated.
-- All statements use IF NOT EXISTS / ON CONFLICT — fully idempotent.
-- Date: 2026-06-13
-- ============================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════
-- SECTION 1 : TABLES
-- ══════════════════════════════════════════════════════════════

-- ── 1a. Design Master ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS design_master (
  id              SERIAL       PRIMARY KEY,
  design_code     VARCHAR(50)  UNIQUE NOT NULL,
  design_no       VARCHAR(50)  NOT NULL,
  collection_name VARCHAR(100),
  product_name    VARCHAR(100),
  design_attributes JSONB      DEFAULT '{}',
  design_image    VARCHAR(500),
  is_active       BOOLEAN      DEFAULT TRUE,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
-- Remove legacy columns if they exist from earlier local migrations
ALTER TABLE design_master DROP COLUMN IF EXISTS production_code;
ALTER TABLE design_master DROP COLUMN IF EXISTS manufacturing_name;
-- Add design_image if the table already existed without it
ALTER TABLE design_master ADD COLUMN IF NOT EXISTS design_image VARCHAR(500);

-- ── 1b. Item Master ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS item_master (
  id                  SERIAL       PRIMARY KEY,
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
  is_active           BOOLEAN      DEFAULT TRUE,
  created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  created_by          INT,
  updated_by          INT
);
-- Remove legacy item_code column & sequence if they exist
ALTER TABLE item_master DROP COLUMN IF EXISTS item_code;
DROP SEQUENCE IF EXISTS item_code_seq;
-- Restore status column if it was dropped
ALTER TABLE item_master ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'DRAFT';

-- ── 1c. Item Variant ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS item_variant (
  id                  SERIAL       PRIMARY KEY,
  item_id             INT          NOT NULL REFERENCES item_master(id) ON DELETE CASCADE,
  sku_code            VARCHAR(150) UNIQUE NOT NULL,
  karat_color         VARCHAR(50),
  weight_band         VARCHAR(50),
  size                VARCHAR(50),
  -- General
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

-- ── 1d. Metal BOM ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS item_metal_bom (
  id              SERIAL       PRIMARY KEY,
  variant_id      INT          NOT NULL REFERENCES item_variant(id) ON DELETE CASCADE,
  seq_no          INT          DEFAULT 1,
  metal_type      VARCHAR(100) NOT NULL,
  purity_karat    VARCHAR(50),
  weight          DECIMAL(10,4),
  uom             VARCHAR(20)  DEFAULT 'gm',
  loss_percentage DECIMAL(5,2) DEFAULT 0,
  is_active       BOOLEAN      DEFAULT TRUE
);

-- ── 1e. Stone BOM ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS item_stone_bom (
  id           SERIAL       PRIMARY KEY,
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
-- SECTION 2 : LOOKUP DATA
-- ══════════════════════════════════════════════════════════════
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES

  -- ── Karat / Color (SKU Info > Karat/Color) ──────────────────
  ('KARAT_COLOR', 'YG22',   '22KT Yellow Gold',  1, TRUE),
  ('KARAT_COLOR', 'YG18',   '18KT Yellow Gold',  2, TRUE),
  ('KARAT_COLOR', 'WG18',   '18KT White Gold',   3, TRUE),
  ('KARAT_COLOR', 'RG18',   '18KT Rose Gold',    4, TRUE),
  ('KARAT_COLOR', 'PT950',  'Platinum 950',      5, TRUE),
  ('KARAT_COLOR', 'SLV925', 'Silver 925',        6, TRUE),

  -- ── Weight Band (SKU Info > Weight Band) ────────────────────
  ('WEIGHT_BAND', 'LT2G',   'Below 2 gm',   1, TRUE),
  ('WEIGHT_BAND', '2_5G',   '2 to 5 gm',    2, TRUE),
  ('WEIGHT_BAND', '5_10G',  '5 to 10 gm',   3, TRUE),
  ('WEIGHT_BAND', '10_20G', '10 to 20 gm',  4, TRUE),
  ('WEIGHT_BAND', 'GT20G',  'Above 20 gm',  5, TRUE),

  -- ── Wire / Ring Size (SKU Info > Size) ──────────────────────
  ('WIRE_SIZE', 'XS',  'XS',          1, TRUE),
  ('WIRE_SIZE', 'S',   'S',           2, TRUE),
  ('WIRE_SIZE', 'M',   'M',           3, TRUE),
  ('WIRE_SIZE', 'L',   'L',           4, TRUE),
  ('WIRE_SIZE', 'XL',  'XL',          5, TRUE),
  ('WIRE_SIZE', 'FS',  'Free Size',   6, TRUE),

  -- ── Jewellery Type ───────────────────────────────────────────
  ('JEWELLERY_TYPE', 'RING',     'Ring',     1, TRUE),
  ('JEWELLERY_TYPE', 'NECKLACE', 'Necklace', 2, TRUE),
  ('JEWELLERY_TYPE', 'EARRING',  'Earring',  3, TRUE),
  ('JEWELLERY_TYPE', 'BRACELET', 'Bracelet', 4, TRUE),
  ('JEWELLERY_TYPE', 'PENDANT',  'Pendant',  5, TRUE),
  ('JEWELLERY_TYPE', 'BANGLE',   'Bangle',   6, TRUE),
  ('JEWELLERY_TYPE', 'ANKLET',   'Anklet',   7, TRUE),
  ('JEWELLERY_TYPE', 'BROOCH',   'Brooch',   8, TRUE),

  -- ── SKU Type ─────────────────────────────────────────────────
  ('SKU_TYPE', 'STD',    'Standard',    1, TRUE),
  ('SKU_TYPE', 'CUSTOM', 'Custom Made', 2, TRUE),
  ('SKU_TYPE', 'PROMO',  'Promotional', 3, TRUE),

  -- ── Gender ───────────────────────────────────────────────────
  ('GENDER', 'LADIES', 'Ladies', 1, TRUE),
  ('GENDER', 'GENTS',  'Gents',  2, TRUE),
  ('GENDER', 'KIDS',   'Kids',   3, TRUE),
  ('GENDER', 'UNISEX', 'Unisex', 4, TRUE),

  -- ── Tech Type ────────────────────────────────────────────────
  ('TECH_TYPE', 'CASTING',  'Casting',        1, TRUE),
  ('TECH_TYPE', 'HANDMADE', 'Handmade',       2, TRUE),
  ('TECH_TYPE', 'MACHINE',  'Machine Made',   3, TRUE),
  ('TECH_TYPE', 'EF',       'Electroforming', 4, TRUE),
  ('TECH_TYPE', 'STAMPING', 'Stamping',       5, TRUE),

  -- ── Manufacturing Level ──────────────────────────────────────
  ('MFG_LEVEL', 'L1', 'Level 1 – Basic',        1, TRUE),
  ('MFG_LEVEL', 'L2', 'Level 2 – Intermediate', 2, TRUE),
  ('MFG_LEVEL', 'L3', 'Level 3 – Advanced',     3, TRUE),

  -- ── Occasion ─────────────────────────────────────────────────
  ('OCCASION', 'WEDDING', 'Wedding',     1, TRUE),
  ('OCCASION', 'BRIDAL',  'Bridal',      2, TRUE),
  ('OCCASION', 'FESTIVE', 'Festive',     3, TRUE),
  ('OCCASION', 'CASUAL',  'Casual Wear', 4, TRUE),
  ('OCCASION', 'PARTY',   'Party Wear',  5, TRUE),

  -- ── Group Sales ──────────────────────────────────────────────
  ('GROUP_SALES', 'RETAIL',     'Retail',    1, TRUE),
  ('GROUP_SALES', 'WHOLESALE',  'Wholesale', 2, TRUE),
  ('GROUP_SALES', 'EXPORT',     'Export',    3, TRUE),

  -- ── Sub Category ─────────────────────────────────────────────
  ('SUB_CATEGORY', 'PLAIN',      'Plain Gold', 1, TRUE),
  ('SUB_CATEGORY', 'STUDDED',    'Studded',    2, TRUE),
  ('SUB_CATEGORY', 'DIAMOND',    'Diamond',    3, TRUE),
  ('SUB_CATEGORY', 'KUNDAN',     'Kundan',     4, TRUE),
  ('SUB_CATEGORY', 'MEENAKARI',  'Meenakari',  5, TRUE),

  -- ── Style Tone (Variant > General) ───────────────────────────
  ('STYLE_TONE', 'SINGLE',     'Single Tone', 1, TRUE),
  ('STYLE_TONE', 'TWO_TONE',   'Two Tone',    2, TRUE),
  ('STYLE_TONE', 'THREE_TONE', 'Three Tone',  3, TRUE),

  -- ── Shape (Variant > General) ────────────────────────────────
  ('SHAPE', 'FLAT',        'Flat',        1, TRUE),
  ('SHAPE', 'ROUND',       'Round',       2, TRUE),
  ('SHAPE', 'OVAL',        'Oval',        3, TRUE),
  ('SHAPE', 'SQUARE',      'Square',      4, TRUE),
  ('SHAPE', 'RECTANGULAR', 'Rectangular', 5, TRUE),

  -- ── Metal Type (Metal BOM) ───────────────────────────────────
  ('METAL_TYPE', 'GOLD',     'Gold',     1, TRUE),
  ('METAL_TYPE', 'SILVER',   'Silver',   2, TRUE),
  ('METAL_TYPE', 'PLATINUM', 'Platinum', 3, TRUE),
  ('METAL_TYPE', 'RHODIUM',  'Rhodium',  4, TRUE),

  -- ── Purity / Karat (Metal BOM) ───────────────────────────────
  ('PURITY_KARAT', '22K',  '22 Karat',    1, TRUE),
  ('PURITY_KARAT', '18K',  '18 Karat',    2, TRUE),
  ('PURITY_KARAT', '14K',  '14 Karat',    3, TRUE),
  ('PURITY_KARAT', 'PT95', 'Platinum 950',4, TRUE),
  ('PURITY_KARAT', '925',  'Silver 925',  5, TRUE),

  -- ── UOM (Metal BOM) ──────────────────────────────────────────
  ('UOM', 'GM',  'Gram',     1, TRUE),
  ('UOM', 'CT',  'Carat',    2, TRUE),
  ('UOM', 'PCS', 'Pieces',   3, TRUE),
  ('UOM', 'KG',  'Kilogram', 4, TRUE),

  -- ── Stone Type (Stone BOM) ───────────────────────────────────
  ('STONE_TYPE', 'DIAMOND',    'Diamond',        1, TRUE),
  ('STONE_TYPE', 'RUBY',       'Ruby',           2, TRUE),
  ('STONE_TYPE', 'EMERALD',    'Emerald',        3, TRUE),
  ('STONE_TYPE', 'SAPPHIRE',   'Sapphire',       4, TRUE),
  ('STONE_TYPE', 'CZ',         'Cubic Zirconia', 5, TRUE),
  ('STONE_TYPE', 'PEARL',      'Pearl',          6, TRUE),
  ('STONE_TYPE', 'MOISSANITE', 'Moissanite',     7, TRUE),

  -- ── Setting Type (Stone BOM) ─────────────────────────────────
  ('SETTING_TYPE', 'PRONG',     'Prong Setting',     1, TRUE),
  ('SETTING_TYPE', 'BEZEL',     'Bezel Setting',     2, TRUE),
  ('SETTING_TYPE', 'CHANNEL',   'Channel Setting',   3, TRUE),
  ('SETTING_TYPE', 'PAVE',      'Pavé Setting',      4, TRUE),
  ('SETTING_TYPE', 'INVISIBLE', 'Invisible Setting', 5, TRUE),
  ('SETTING_TYPE', 'FLUSH',     'Flush Setting',     6, TRUE),

  -- ── Item Status ───────────────────────────────────────────────
  ('STATUS', 'DRAFT',  'Draft',        1, TRUE),
  ('STATUS', 'ACTIVE', 'Active',       2, TRUE),
  ('STATUS', 'HOLD',   'On Hold',      3, TRUE),
  ('STATUS', 'DISC',   'Discontinued', 4, TRUE)

ON CONFLICT (lookup_type, lookup_code) DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- SECTION 3 : PROJECT CONFIG — all queries (final state)
-- Dollar-quoting avoids nested single-quote escaping.
-- ON CONFLICT updates existing rows, so re-running is safe.
-- ══════════════════════════════════════════════════════════════
INSERT INTO project_config (key_code, key_value, description, config_type, is_active) VALUES

-- ── Design Master ─────────────────────────────────────────────
('design_list_get',
 $q$SELECT id, design_code, design_no, collection_name, product_name, design_attributes::text AS design_attributes, design_image FROM design_master WHERE is_active = TRUE ORDER BY design_code$q$,
 'List all active designs', 'query', TRUE),

('design_create',
 $q$INSERT INTO design_master (design_code, design_no, collection_name, product_name, design_attributes) VALUES (:design_code, :design_no, :collection_name, :product_name, :design_attributes::jsonb) RETURNING *$q$,
 'Create a new design record', 'query', TRUE),

('design_update',
 $q$UPDATE design_master SET design_no=:design_no, collection_name=:collection_name, product_name=:product_name, design_attributes=:design_attributes::jsonb, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *$q$,
 'Update a design record', 'query', TRUE),

('design_next_no',
 $q$SELECT LPAD((COALESCE(MAX(CASE WHEN design_no ~ '^[0-9]+$' THEN design_no::integer ELSE 0 END), 0) + 1)::text, 3, '0') AS next_no FROM design_master WHERE product_name = :product_name AND collection_name = :collection_name AND is_active = TRUE$q$,
 'Next design_no for a product_name + collection_name combination', 'query', TRUE),

-- ── Item Master ───────────────────────────────────────────────
('fg_item_list_get',
 $q$SELECT i.id, i.design_code, i.design_no, i.manufacturing_name, i.collection_name, i.product_name, i.sub_category, i.jewellery_type, i.sku_type, i.gender, i.tech_type, i.manufacturing_level, i.occasion, i.group_sales, i.status, i.is_active, i.created_at, STRING_AGG(v.sku_code, ', ' ORDER BY v.sku_code) AS sku_code FROM item_master i LEFT JOIN item_variant v ON v.item_id = i.id AND v.is_active = TRUE WHERE (i.is_active = CASE WHEN :status = 'active' THEN TRUE WHEN :status = 'inactive' THEN FALSE ELSE i.is_active END) AND (COALESCE(:search, '') = '' OR i.design_code ILIKE '%' || :search || '%' OR i.product_name ILIKE '%' || :search || '%' OR i.manufacturing_name ILIKE '%' || :search || '%' OR i.collection_name ILIKE '%' || :search || '%') GROUP BY i.id ORDER BY i.design_code LIMIT :limit OFFSET :offset$q$,
 'FG items worklist — paginated, searchable, sku_code aggregated from variants', 'query', TRUE),

('fg_item_list_count',
 $q$SELECT COUNT(*)::int AS total FROM item_master i WHERE (i.is_active = CASE WHEN :status = 'active' THEN TRUE WHEN :status = 'inactive' THEN FALSE ELSE i.is_active END) AND (COALESCE(:search, '') = '' OR i.design_code ILIKE '%' || :search || '%' OR i.product_name ILIKE '%' || :search || '%' OR i.manufacturing_name ILIKE '%' || :search || '%' OR i.collection_name ILIKE '%' || :search || '%')$q$,
 'Count FG items with search + status filter', 'query', TRUE),

('fg_item_stats',
 $q$SELECT COUNT(CASE WHEN is_active = TRUE THEN 1 END)::int AS active, COUNT(CASE WHEN is_active = FALSE THEN 1 END)::int AS inactive FROM item_master$q$,
 'FG item active / inactive summary counts', 'query', TRUE),

('fg_item_get_by_id',
 $q$SELECT i.*, d.design_attributes::text AS design_attributes_json FROM item_master i LEFT JOIN design_master d ON d.design_code = i.design_code WHERE i.id = :id$q$,
 'FG item by id with design attributes', 'query', TRUE),

('fg_item_create',
 $q$INSERT INTO item_master (design_id, design_code, design_no, collection_name, product_name, manufacturing_name, jewellery_type, sku_type, gender, tech_type, manufacturing_level, occasion, group_sales, sub_category, status, uom1, uom2, video_upload, video_360) VALUES (:design_id, :design_code, :design_no, :collection_name, :product_name, :manufacturing_name, :jewellery_type, :sku_type, :gender, :tech_type, :manufacturing_level, :occasion, :group_sales, :sub_category, :status, :uom1, :uom2, :video_upload, :video_360) RETURNING *$q$,
 'Create FG item', 'query', TRUE),

('fg_item_update',
 $q$UPDATE item_master SET manufacturing_name=:manufacturing_name, jewellery_type=:jewellery_type, sku_type=:sku_type, gender=:gender, tech_type=:tech_type, manufacturing_level=:manufacturing_level, occasion=:occasion, group_sales=:group_sales, sub_category=:sub_category, status=:status, uom1=:uom1, uom2=:uom2, video_upload=:video_upload, video_360=:video_360, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *$q$,
 'Update FG item classification', 'query', TRUE),

('fg_item_toggle',
 $q$UPDATE item_master SET is_active = NOT is_active, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING id, design_code, is_active$q$,
 'Toggle FG item active status', 'query', TRUE),

-- ── Item Variants ─────────────────────────────────────────────
('fg_variant_list_get',
 $q$SELECT * FROM item_variant WHERE item_id=:item_id AND is_active=TRUE ORDER BY sku_code$q$,
 'Variants for an item', 'query', TRUE),

('fg_variant_create',
 $q$INSERT INTO item_variant (item_id, sku_code, karat_color, old_erp_variant, weight_band, size, width_size, style_tone, design_source, standard_alloy, client_variant_code, client_variant_name, vendor_variant_code, vendor_variant_name, shape, product_description, pipe_thickness, diamond_cut, squeezing, setting_size, wire_size, hammering, combination_line, compacting, machine_used, kada_salai_size, rfid_chip_number, file_link, rubber_die_number, wax_resin_weight, ef_batch_number, zinc_surface, zinc_die_number, zinc_weight, seo_words, usp, short_description, long_description, retail_brand, keywords_tags, product_title) VALUES (:item_id, :sku_code, :karat_color, :old_erp_variant, :weight_band, :size, :width_size, :style_tone, :design_source, :standard_alloy, :client_variant_code, :client_variant_name, :vendor_variant_code, :vendor_variant_name, :shape, :product_description, :pipe_thickness, :diamond_cut, :squeezing, :setting_size, :wire_size, :hammering, :combination_line, :compacting, :machine_used, :kada_salai_size, :rfid_chip_number, :file_link, :rubber_die_number, :wax_resin_weight, :ef_batch_number, :zinc_surface, :zinc_die_number, :zinc_weight, :seo_words, :usp, :short_description, :long_description, :retail_brand, :keywords_tags, :product_title) RETURNING *$q$,
 'Create variant', 'query', TRUE),

('fg_variant_update',
 $q$UPDATE item_variant SET karat_color=:karat_color, old_erp_variant=:old_erp_variant, weight_band=:weight_band, size=:size, width_size=:width_size, style_tone=:style_tone, design_source=:design_source, standard_alloy=:standard_alloy, client_variant_code=:client_variant_code, client_variant_name=:client_variant_name, vendor_variant_code=:vendor_variant_code, vendor_variant_name=:vendor_variant_name, shape=:shape, product_description=:product_description, pipe_thickness=:pipe_thickness, diamond_cut=:diamond_cut, squeezing=:squeezing, setting_size=:setting_size, wire_size=:wire_size, hammering=:hammering, combination_line=:combination_line, compacting=:compacting, machine_used=:machine_used, kada_salai_size=:kada_salai_size, rfid_chip_number=:rfid_chip_number, file_link=:file_link, rubber_die_number=:rubber_die_number, wax_resin_weight=:wax_resin_weight, ef_batch_number=:ef_batch_number, zinc_surface=:zinc_surface, zinc_die_number=:zinc_die_number, zinc_weight=:zinc_weight, seo_words=:seo_words, usp=:usp, short_description=:short_description, long_description=:long_description, retail_brand=:retail_brand, keywords_tags=:keywords_tags, product_title=:product_title, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING *$q$,
 'Update variant', 'query', TRUE),

('fg_variant_toggle',
 $q$UPDATE item_variant SET is_active = NOT is_active, updated_at=CURRENT_TIMESTAMP WHERE id=:id RETURNING id, sku_code, is_active$q$,
 'Toggle variant active status', 'query', TRUE),

-- ── Metal BOM ─────────────────────────────────────────────────
('fg_metal_bom_get',
 $q$SELECT id, variant_id, seq_no, metal_type, purity_karat, weight, uom, loss_percentage FROM item_metal_bom WHERE variant_id=:variant_id AND is_active=TRUE ORDER BY seq_no$q$,
 'Metal BOM rows for a variant', 'query', TRUE),

('fg_metal_bom_delete_all',
 $q$DELETE FROM item_metal_bom WHERE variant_id=:variant_id$q$,
 'Delete all metal BOM rows for a variant (before re-save)', 'query', TRUE),

('fg_metal_bom_create',
 $q$INSERT INTO item_metal_bom (variant_id, seq_no, metal_type, purity_karat, weight, uom, loss_percentage) VALUES (:variant_id, :seq_no, :metal_type, :purity_karat, :weight, :uom, :loss_percentage) RETURNING *$q$,
 'Create a metal BOM row', 'query', TRUE),

-- ── Stone BOM ─────────────────────────────────────────────────
('fg_stone_bom_get',
 $q$SELECT id, variant_id, seq_no, stone_type, shape, size, weight, quantity, setting_type FROM item_stone_bom WHERE variant_id=:variant_id AND is_active=TRUE ORDER BY seq_no$q$,
 'Stone BOM rows for a variant', 'query', TRUE),

('fg_stone_bom_delete_all',
 $q$DELETE FROM item_stone_bom WHERE variant_id=:variant_id$q$,
 'Delete all stone BOM rows for a variant (before re-save)', 'query', TRUE),

('fg_stone_bom_create',
 $q$INSERT INTO item_stone_bom (variant_id, seq_no, stone_type, shape, size, weight, quantity, setting_type) VALUES (:variant_id, :seq_no, :stone_type, :shape, :size, :weight, :quantity, :setting_type) RETURNING *$q$,
 'Create a stone BOM row', 'query', TRUE)

ON CONFLICT (key_code) DO UPDATE SET
  key_value   = EXCLUDED.key_value,
  description = EXCLUDED.description,
  updated_at  = CURRENT_TIMESTAMP;


-- ══════════════════════════════════════════════════════════════
-- SECTION 4 : ROLE PERMISSIONS  (menu MM_FG_ITEMS)
-- ══════════════════════════════════════════════════════════════
DO $perm$
DECLARE
  v_menu_id INT;
BEGIN
  SELECT id INTO v_menu_id FROM menu_master WHERE menu_code = 'MM_FG_ITEMS';

  IF v_menu_id IS NULL THEN
    RAISE EXCEPTION 'MM_FG_ITEMS not found in menu_master — run base menu seed first';
  END IF;

  -- SYS_ADMIN (1): full access
  INSERT INTO role_menu_mapping
    (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export)
  VALUES (1, v_menu_id, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
  ON CONFLICT (role_id, menu_id) DO UPDATE SET
    can_view=TRUE, can_create=TRUE, can_update=TRUE, can_delete=TRUE, can_print=TRUE, can_export=TRUE;

  -- PROCESS_ADMIN (2): full access
  INSERT INTO role_menu_mapping
    (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export)
  VALUES (2, v_menu_id, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
  ON CONFLICT (role_id, menu_id) DO UPDATE SET
    can_view=TRUE, can_create=TRUE, can_update=TRUE, can_delete=TRUE, can_print=TRUE, can_export=TRUE;

  -- MANAGER (3): view / create / update / print / export — no delete
  INSERT INTO role_menu_mapping
    (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export)
  VALUES (3, v_menu_id, TRUE, TRUE, TRUE, FALSE, TRUE, TRUE)
  ON CONFLICT (role_id, menu_id) DO UPDATE SET
    can_view=TRUE, can_create=TRUE, can_update=TRUE, can_delete=FALSE, can_print=TRUE, can_export=TRUE;

  -- SUPERVISOR (4): view / create — no update / delete
  INSERT INTO role_menu_mapping
    (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export)
  VALUES (4, v_menu_id, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE)
  ON CONFLICT (role_id, menu_id) DO UPDATE SET
    can_view=TRUE, can_create=TRUE, can_update=FALSE, can_delete=FALSE, can_print=FALSE, can_export=FALSE;

  -- OPERATOR (5): view only
  INSERT INTO role_menu_mapping
    (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export)
  VALUES (5, v_menu_id, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE)
  ON CONFLICT (role_id, menu_id) DO UPDATE SET
    can_view=TRUE, can_create=FALSE, can_update=FALSE, can_delete=FALSE, can_print=FALSE, can_export=FALSE;

  -- VIEWER (6): view only
  INSERT INTO role_menu_mapping
    (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export)
  VALUES (6, v_menu_id, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE)
  ON CONFLICT (role_id, menu_id) DO UPDATE SET
    can_view=TRUE, can_create=FALSE, can_update=FALSE, can_delete=FALSE, can_print=FALSE, can_export=FALSE;

  RAISE NOTICE 'Role permissions set for MM_FG_ITEMS (menu_id=%)', v_menu_id;
END
$perm$;


COMMIT;
-- ── END OF FILE ───────────────────────────────────────────────
