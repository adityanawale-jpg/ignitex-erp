-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."alloy_master" (
    "id" SERIAL NOT NULL,
    "alloy_code" VARCHAR(50) NOT NULL,
    "alloy_name" VARCHAR(200) NOT NULL,
    "karat" VARCHAR(20),
    "purity_pct" DECIMAL(5,2) DEFAULT 0,
    "description" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivation_reason" VARCHAR(500),
    "deactivated_at" TIMESTAMP(6),
    "metal_category" VARCHAR(100),
    "purity_target" VARCHAR(200),
    "application_type" VARCHAR(200),
    "alloy_status" VARCHAR(50),
    "with_silver" VARCHAR(10),
    "silver_percentage" DECIMAL(5,2),
    "alloy_additives_type" VARCHAR(100),
    "alloy_density" DECIMAL(8,3),
    "composition_remark" VARCHAR(500),
    "alloy_hardness" VARCHAR(100),
    "tensile_strength" VARCHAR(100),
    "ductility_elongation" VARCHAR(100),
    "melting_range" VARCHAR(100),
    "color_tone" VARCHAR(100),
    "finish_behaviour" VARCHAR(100),
    "max_drawing_reduction" VARCHAR(100),
    "alloy_required" VARCHAR(200),
    "breakage_sensitivity" VARCHAR(100),
    "melting_method" VARCHAR(100),
    "alloy_cost_per_gram" DECIMAL(12,4),
    "indicative_alloy_cost_per_gram" DECIMAL(12,4),
    "supplier_name" VARCHAR(255),
    "alloy_brand" VARCHAR(200),
    "alloy_hazardous" BOOLEAN DEFAULT false,

    CONSTRAINT "alloy_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_log" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "employee_id" VARCHAR(50),
    "full_name" VARCHAR(200),
    "action" VARCHAR(50) NOT NULL,
    "module" VARCHAR(100) NOT NULL,
    "record_id" VARCHAR(100),
    "description" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(50),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bom_fg" (
    "id" SERIAL NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "bom_version" VARCHAR(20) NOT NULL DEFAULT '1.0',
    "bom_status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "gross_weight" DECIMAL(12,6) DEFAULT 0,
    "net_weight" DECIMAL(12,6) DEFAULT 0,
    "min_weight" DECIMAL(12,6),
    "max_weight" DECIMAL(12,6),
    "stone_cts" DECIMAL(12,6) DEFAULT 0,
    "stone_gms" DECIMAL(12,6) DEFAULT 0,
    "effective_from" DATE,
    "effective_to" DATE,
    "remarks" TEXT,
    "submitted_by" INTEGER,
    "submitted_at" TIMESTAMP(6),
    "approved_by" INTEGER,
    "approved_at" TIMESTAMP(6),
    "rejected_by" INTEGER,
    "rejected_at" TIMESTAMP(6),
    "rejection_reason" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "component_weight" DECIMAL(12,6) DEFAULT 0,

    CONSTRAINT "bom_fg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bom_fg_detail" (
    "id" SERIAL NOT NULL,
    "bom_id" INTEGER NOT NULL,
    "bom_type" VARCHAR(50) NOT NULL,
    "seq_no" INTEGER NOT NULL DEFAULT 1,
    "item_id" INTEGER NOT NULL,
    "item_code" VARCHAR(300),
    "item_name" VARCHAR(300),
    "item_quantity" DECIMAL(12,4) DEFAULT 1,
    "uom1_code" VARCHAR(50),
    "item_weight" DECIMAL(12,6),
    "uom2_code" VARCHAR(50),
    "purity_code" VARCHAR(50),
    "pure_weight" DECIMAL(12,6),
    "weight_gms" DECIMAL(12,6),
    "remarks" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "gross_weight" DECIMAL(12,6) DEFAULT 0,
    "net_weight" DECIMAL(12,6) DEFAULT 0,
    "stone_cts" DECIMAL(12,6) DEFAULT 0,
    "stone_gms" DECIMAL(12,6) DEFAULT 0,
    "item_type" VARCHAR(50),
    "component_weight" DECIMAL(12,6) DEFAULT 0,

    CONSTRAINT "bom_fg_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bom_fin" (
    "id" SERIAL NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "bom_version" VARCHAR(20) NOT NULL DEFAULT '1.0',
    "bom_status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "gross_weight" DECIMAL(12,6) DEFAULT 0,
    "net_weight" DECIMAL(12,6) DEFAULT 0,
    "component_weight" DECIMAL(12,6) DEFAULT 0,
    "min_weight" DECIMAL(12,6),
    "max_weight" DECIMAL(12,6),
    "stone_cts" DECIMAL(12,6) DEFAULT 0,
    "stone_gms" DECIMAL(12,6) DEFAULT 0,
    "effective_from" DATE,
    "effective_to" DATE,
    "remarks" TEXT,
    "submitted_by" INTEGER,
    "submitted_at" TIMESTAMP(6),
    "approved_by" INTEGER,
    "approved_at" TIMESTAMP(6),
    "rejected_by" INTEGER,
    "rejected_at" TIMESTAMP(6),
    "rejection_reason" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bom_fin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bom_fin_detail" (
    "id" SERIAL NOT NULL,
    "bom_id" INTEGER NOT NULL,
    "bom_type" VARCHAR(50) NOT NULL,
    "item_type" VARCHAR(50),
    "seq_no" INTEGER NOT NULL DEFAULT 1,
    "item_id" INTEGER NOT NULL,
    "item_code" VARCHAR(300),
    "item_name" VARCHAR(300),
    "item_quantity" DECIMAL(12,4) DEFAULT 1,
    "uom1_code" VARCHAR(50),
    "item_weight" DECIMAL(12,6),
    "uom2_code" VARCHAR(50),
    "purity_code" VARCHAR(50),
    "pure_weight" DECIMAL(12,6),
    "weight_gms" DECIMAL(12,6),
    "gross_weight" DECIMAL(12,6),
    "net_weight" DECIMAL(12,6),
    "stone_cts" DECIMAL(12,6),
    "stone_gms" DECIMAL(12,6),
    "component_weight" DECIMAL(12,6) DEFAULT 0,
    "remarks" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bom_fin_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."component_master" (
    "id" SERIAL NOT NULL,
    "component_code" VARCHAR(500),
    "component_type" VARCHAR(100),
    "component_name" VARCHAR(100),
    "component_desc" VARCHAR(100),
    "is_active" BOOLEAN DEFAULT true,
    "deactivation_reason" VARCHAR(500),
    "deactivated_at" TIMESTAMP(6),
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "component_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer_address_info" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "adrs_name" VARCHAR(255),
    "adrs_country_code" VARCHAR(10),
    "adrs_1" VARCHAR(255),
    "adrs_2" VARCHAR(255),
    "adrs_3" VARCHAR(255),
    "adrs_city_name" VARCHAR(100),
    "adrs_state_code" VARCHAR(10),
    "adrs_pincode" VARCHAR(20),
    "adrs_email" VARCHAR(255),
    "adrs_phone_number_country_code" VARCHAR(10),
    "adrs_phone_number" VARCHAR(20),
    "adrs_extension" VARCHAR(10),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_address_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer_contact_info" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "cont_first_name" VARCHAR(100),
    "cont_last_name" VARCHAR(100),
    "cont_email" VARCHAR(255),
    "cont_job_title" VARCHAR(100),
    "cont_country_code" VARCHAR(10),
    "cont_mobile" VARCHAR(20),
    "cont_is_admin" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_contact_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer_master" (
    "id" SERIAL NOT NULL,
    "customer_code" VARCHAR(20),
    "customer_name" VARCHAR(255),
    "customer_company_name" VARCHAR(255),
    "customer_display_name" VARCHAR(255),
    "bus_relationship" VARCHAR(100),
    "country_code" VARCHAR(10),
    "pan_card" VARCHAR(20),
    "organization_type" VARCHAR(100),
    "customer_type" VARCHAR(100),
    "is_msme_reg" BOOLEAN DEFAULT false,
    "website_url" VARCHAR(500),
    "upload_doc" TEXT,
    "tax_payer_type" VARCHAR(100),
    "gstin_status" VARCHAR(100),
    "gstin_uin_number" VARCHAR(20),
    "place_of_supply" VARCHAR(100),
    "gst_treatment" VARCHAR(100),
    "credit_limit_by_value" DECIMAL(18,2) DEFAULT 0,
    "credit_limit_by_grams" DECIMAL(14,4) DEFAULT 0,
    "payment_terms" VARCHAR(255),
    "is_active" BOOLEAN DEFAULT true,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deactivation_reason" VARCHAR(500),
    "deactivated_at" TIMESTAMP(6),

    CONSTRAINT "customer_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer_price_master_metal" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "sales_group_code" VARCHAR(50) NOT NULL,
    "itemtype" VARCHAR(50) NOT NULL,
    "sku_code" VARCHAR(300) NOT NULL,
    "karatage" VARCHAR(50),
    "rate_basis" VARCHAR(20) NOT NULL DEFAULT 'PER_GM',
    "rate_type" VARCHAR(20) NOT NULL DEFAULT 'AMOUNT',
    "rate_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "uom" VARCHAR(10) NOT NULL DEFAULT 'GMS',
    "rhodium_perc" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tricolor_rhodium_perc" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "lobster_perc" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "silky_rope_perc" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "hallmark_amt" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "remarks" VARCHAR(500),
    "is_active" BOOLEAN DEFAULT true,
    "deactivation_reason" VARCHAR(500),
    "deactivated_at" TIMESTAMP(6),
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_price_master_metal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer_price_master_stone" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "stone_name" VARCHAR(50) NOT NULL,
    "stone_code" VARCHAR(300) NOT NULL DEFAULT 'ALL',
    "rate_basis" VARCHAR(20) NOT NULL DEFAULT 'PER_GM',
    "rate_type" VARCHAR(20) NOT NULL DEFAULT 'AMOUNT',
    "rate_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "uom" VARCHAR(10) NOT NULL DEFAULT 'CTS',
    "remarks" VARCHAR(500),
    "is_active" BOOLEAN DEFAULT true,
    "deactivation_reason" VARCHAR(500),
    "deactivated_at" TIMESTAMP(6),
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_price_master_stone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dept_master" (
    "id" SERIAL NOT NULL,
    "dept_code" VARCHAR(50) NOT NULL,
    "dept_name" VARCHAR(200) NOT NULL,
    "sub_dept" VARCHAR(200),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivation_reason" VARCHAR(500),
    "deactivated_at" TIMESTAMP(6),

    CONSTRAINT "dept_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."design_images" (
    "id" SERIAL NOT NULL,
    "design_id" INTEGER NOT NULL,
    "image_name" VARCHAR(200),
    "image_url" VARCHAR(500) NOT NULL,
    "is_default" BOOLEAN DEFAULT false,
    "sort_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "design_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."design_master" (
    "id" SERIAL NOT NULL,
    "design_code" VARCHAR(50) NOT NULL,
    "design_no" VARCHAR(50) NOT NULL,
    "collection_name" VARCHAR(100),
    "product_name" VARCHAR(100),
    "design_attributes" JSONB DEFAULT '{}',
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "design_image" VARCHAR(500),

    CONSTRAINT "design_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."erp_settings" (
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "erp_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."fg_item_master" (
    "id" SERIAL NOT NULL,
    "design_id" INTEGER,
    "design_code" VARCHAR(50) NOT NULL,
    "design_no" VARCHAR(50),
    "collection_name" VARCHAR(100),
    "product_name" VARCHAR(100),
    "manufacturing_name" VARCHAR(200),
    "item_image" VARCHAR(500),
    "jewellery_type" VARCHAR(50),
    "sku_type" VARCHAR(50),
    "gender" VARCHAR(20),
    "tech_type" VARCHAR(50),
    "manufacturing_level" VARCHAR(50),
    "occasion" VARCHAR(100),
    "group_sales" VARCHAR(100),
    "sub_category" VARCHAR(100),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "uom1" VARCHAR(50),
    "uom2" VARCHAR(50),
    "status" VARCHAR(20) DEFAULT 'DRAFT',
    "deactivation_reason" VARCHAR(500),
    "deactivated_at" TIMESTAMP(6),
    "video_upload" VARCHAR(500),
    "video_360" VARCHAR(500),

    CONSTRAINT "item_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fg_item_variant" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "sku_code" VARCHAR(150) NOT NULL,
    "karat_color" VARCHAR(50),
    "weight_band" VARCHAR(50),
    "size" VARCHAR(50),
    "width_size" VARCHAR(50),
    "style_tone" VARCHAR(50),
    "vendor_variant_code" VARCHAR(100),
    "vendor_variant_name" VARCHAR(200),
    "shape" VARCHAR(50),
    "product_description" TEXT,
    "pipe_thickness" VARCHAR(50),
    "diamond_cut" VARCHAR(50),
    "squeezing" VARCHAR(50),
    "setting_size" VARCHAR(50),
    "wire_size" VARCHAR(50),
    "hammering" VARCHAR(50),
    "combination_line" VARCHAR(50),
    "compacting" VARCHAR(50),
    "machine_used" VARCHAR(100),
    "kada_salai_size" VARCHAR(50),
    "rfid_chip_number" VARCHAR(100),
    "file_link" VARCHAR(500),
    "rubber_die_number" VARCHAR(100),
    "wax_resin_weight" DECIMAL(10,4),
    "ef_batch_number" VARCHAR(100),
    "zinc_surface" VARCHAR(100),
    "zinc_die_number" VARCHAR(100),
    "zinc_weight" DECIMAL(10,4),
    "seo_words" TEXT,
    "usp" TEXT,
    "short_description" TEXT,
    "long_description" TEXT,
    "retail_brand" VARCHAR(100),
    "keywords_tags" TEXT,
    "product_title" VARCHAR(300),
    "video_upload" VARCHAR(500),
    "video_360" VARCHAR(500),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "vendor_name" VARCHAR(255),
    "sku_type" VARCHAR(50),
    "group_sales" VARCHAR(100),
    "old_erp_variant" VARCHAR(100),
    "standard_alloy" VARCHAR(100),
    "design_source" VARCHAR(100),
    "catalogue_reference" VARCHAR(200),

    CONSTRAINT "item_variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fg_item_variant_client" (
    "id" SERIAL NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "customer_name" VARCHAR(255),
    "customer_variant_code" VARCHAR(100),
    "customer_variant_name" VARCHAR(200),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "alloy_code" VARCHAR(50),
    "group_sales" VARCHAR(100),

    CONSTRAINT "item_variant_client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fin_item_master" (
    "id" SERIAL NOT NULL,
    "design_id" INTEGER,
    "design_code" VARCHAR(50) NOT NULL,
    "design_no" VARCHAR(50),
    "collection_name" VARCHAR(100),
    "product_name" VARCHAR(100),
    "manufacturing_name" VARCHAR(200),
    "item_image" VARCHAR(500),
    "jewellery_type" VARCHAR(50),
    "sku_type" VARCHAR(50),
    "gender" VARCHAR(20),
    "tech_type" VARCHAR(50),
    "manufacturing_level" VARCHAR(50),
    "occasion" VARCHAR(100),
    "group_sales" VARCHAR(100),
    "sub_category" VARCHAR(100),
    "status" VARCHAR(50) DEFAULT 'DRAFT',
    "uom1" VARCHAR(20),
    "uom2" VARCHAR(20),
    "video_upload" VARCHAR(500),
    "video_360" VARCHAR(500),
    "is_active" BOOLEAN DEFAULT true,
    "deactivation_reason" VARCHAR(500),
    "deactivated_at" TIMESTAMP(6),
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_item_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fin_item_variant" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "sku_code" VARCHAR(150) NOT NULL,
    "karat_color" VARCHAR(50),
    "sku_type" VARCHAR(50),
    "group_sales" VARCHAR(100),
    "old_erp_variant" VARCHAR(100),
    "weight_band" VARCHAR(50),
    "size" VARCHAR(50),
    "width_size" VARCHAR(50),
    "style_tone" VARCHAR(50),
    "design_source" VARCHAR(100),
    "standard_alloy" VARCHAR(100),
    "vendor_name" VARCHAR(200),
    "vendor_variant_code" VARCHAR(100),
    "vendor_variant_name" VARCHAR(200),
    "shape" VARCHAR(50),
    "product_description" TEXT,
    "pipe_thickness" VARCHAR(50),
    "diamond_cut" VARCHAR(50),
    "squeezing" VARCHAR(50),
    "setting_size" VARCHAR(50),
    "wire_size" VARCHAR(50),
    "hammering" VARCHAR(50),
    "combination_line" VARCHAR(50),
    "compacting" VARCHAR(50),
    "machine_used" VARCHAR(100),
    "kada_salai_size" VARCHAR(50),
    "rfid_chip_number" VARCHAR(100),
    "file_link" VARCHAR(500),
    "rubber_die_number" VARCHAR(100),
    "wax_resin_weight" DECIMAL(10,4),
    "ef_batch_number" VARCHAR(100),
    "zinc_surface" VARCHAR(100),
    "zinc_die_number" VARCHAR(100),
    "zinc_weight" DECIMAL(10,4),
    "seo_words" TEXT,
    "usp" TEXT,
    "short_description" TEXT,
    "long_description" TEXT,
    "retail_brand" VARCHAR(100),
    "keywords_tags" TEXT,
    "product_title" VARCHAR(300),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "gross_weight" DECIMAL(12,4),
    "net_weight" DECIMAL(12,4),
    "catalogue_reference" VARCHAR(200),

    CONSTRAINT "fin_item_variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fin_item_variant_client" (
    "id" SERIAL NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "customer_name" VARCHAR(255),
    "customer_variant_code" VARCHAR(100),
    "customer_variant_name" VARCHAR(200),
    "alloy_code" VARCHAR(50),
    "group_sales" VARCHAR(100),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fin_item_variant_client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventory_structure" (
    "id" SERIAL NOT NULL,
    "inv_bu_code" VARCHAR(50) NOT NULL,
    "inv_org_code" VARCHAR(50) NOT NULL,
    "sub_inv_code" VARCHAR(100) NOT NULL,
    "sub_inv_name" VARCHAR(200) NOT NULL,
    "store_type" VARCHAR(50),
    "is_tracks_gold" BOOLEAN DEFAULT false,
    "is_tracks_wt" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "deactivation_reason" VARCHAR(500),
    "deactivated_at" TIMESTAMP(6),
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_structure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."login_history" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "employee_id" VARCHAR(20),
    "login_time" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "logout_time" TIMESTAMP(6),
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "status" VARCHAR(20) DEFAULT 'success',
    "remarks" VARCHAR(500),

    CONSTRAINT "login_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."machine_master" (
    "id" SERIAL NOT NULL,
    "machine_code" VARCHAR(50) NOT NULL,
    "machine_name" VARCHAR(200) NOT NULL,
    "machine_type" VARCHAR(100) NOT NULL,
    "dept_id" INTEGER NOT NULL,
    "make_brand" VARCHAR(100) NOT NULL,
    "capacity_speed" VARCHAR(100) NOT NULL,
    "machine_remarks" VARCHAR(500),
    "deactivation_reason" VARCHAR(500),
    "deactivated_at" TIMESTAMP(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "machine_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."master_lookup" (
    "id" SERIAL NOT NULL,
    "lookup_type" VARCHAR(100) NOT NULL,
    "lookup_code" VARCHAR(100) NOT NULL,
    "lookup_name" VARCHAR(200) NOT NULL,
    "lookup_value" VARCHAR(500),
    "display_order" INTEGER DEFAULT 0,
    "parent_code" VARCHAR(100),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deactivation_reason" VARCHAR(500),
    "deactivated_at" TIMESTAMP(6),

    CONSTRAINT "master_lookup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."menu_master" (
    "id" SERIAL NOT NULL,
    "parent_id" INTEGER,
    "menu_code" VARCHAR(100) NOT NULL,
    "menu_name" VARCHAR(200) NOT NULL,
    "menu_url" VARCHAR(500),
    "menu_icon" VARCHAR(100),
    "menu_order" INTEGER DEFAULT 0,
    "menu_level" INTEGER DEFAULT 1,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."metal_master" (
    "id" SERIAL NOT NULL,
    "metal_code" VARCHAR(500),
    "metal_type" VARCHAR(100),
    "karat_color" VARCHAR(100),
    "purity" VARCHAR(100),
    "metal_name" VARCHAR(100),
    "is_active" BOOLEAN DEFAULT true,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deactivation_reason" VARCHAR(500),
    "deactivated_at" TIMESTAMP(6),

    CONSTRAINT "component_item_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."min_max_planning_master" (
    "id" SERIAL NOT NULL,
    "itemtype" VARCHAR(50) NOT NULL,
    "sku_code" VARCHAR(300) NOT NULL,
    "item_name" VARCHAR(500),
    "min_quantity" DECIMAL(12,4) DEFAULT 0,
    "max_quantity" DECIMAL(12,4) DEFAULT 0,
    "moq_quantity" DECIMAL(12,4) DEFAULT 0,
    "min_weight" DECIMAL(12,4) DEFAULT 0,
    "max_weight" DECIMAL(12,4) DEFAULT 0,
    "moq_weight" DECIMAL(12,4) DEFAULT 0,
    "order_base" VARCHAR(20) NOT NULL DEFAULT 'QUANTITY',
    "remarks" VARCHAR(500),
    "is_active" BOOLEAN DEFAULT true,
    "deactivation_reason" VARCHAR(500),
    "deactivated_at" TIMESTAMP(6),
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "min_max_planning_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."operation_master" (
    "id" SERIAL NOT NULL,
    "operation_code" VARCHAR(50) NOT NULL,
    "operation_name" VARCHAR(200) NOT NULL,
    "dept_id" INTEGER NOT NULL,
    "std_time" DECIMAL(8,2) NOT NULL,
    "yield_percentage" DECIMAL(5,2),
    "process_by" VARCHAR(100),
    "deactivation_reason" VARCHAR(500),
    "deactivated_at" TIMESTAMP(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "machine_ids" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "operation_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."party_master" (
    "id" SERIAL NOT NULL,
    "party_code" VARCHAR(50) NOT NULL,
    "party_name" VARCHAR(200) NOT NULL,
    "party_type" VARCHAR(20) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(200),
    "address" TEXT,
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "pincode" VARCHAR(20),
    "gstin" VARCHAR(20),
    "pan" VARCHAR(20),
    "credit_limit" DECIMAL(15,2) DEFAULT 0,
    "opening_balance" DECIMAL(15,2) DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "party_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_config" (
    "id" SERIAL NOT NULL,
    "key_code" VARCHAR(100) NOT NULL,
    "key_value" TEXT NOT NULL,
    "description" TEXT,
    "config_type" VARCHAR(50) DEFAULT 'query',
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."role_master" (
    "id" SERIAL NOT NULL,
    "role_code" VARCHAR(50) NOT NULL,
    "role_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."role_menu_mapping" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "menu_id" INTEGER NOT NULL,
    "can_view" BOOLEAN NOT NULL DEFAULT true,
    "can_create" BOOLEAN NOT NULL DEFAULT false,
    "can_update" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "can_print" BOOLEAN NOT NULL DEFAULT false,
    "can_export" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "role_menu_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stone_item_master" (
    "id" SERIAL NOT NULL,
    "stn_code" VARCHAR(300) NOT NULL,
    "stn_type" VARCHAR(100),
    "stn_shape" VARCHAR(100),
    "stn_quality" VARCHAR(100),
    "stn_color" VARCHAR(100),
    "stn_size" VARCHAR(100),
    "is_active" BOOLEAN DEFAULT true,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deactivation_reason" VARCHAR(500),
    "deactivated_at" TIMESTAMP(6),
    "std_cts" DECIMAL(12,4),

    CONSTRAINT "stone_item_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."supplier_address_info" (
    "id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "adrs_name" VARCHAR(255),
    "adrs_country_code" VARCHAR(10),
    "adrs_1" VARCHAR(255),
    "adrs_2" VARCHAR(255),
    "adrs_3" VARCHAR(255),
    "adrs_city_name" VARCHAR(100),
    "adrs_state_code" VARCHAR(10),
    "adrs_pincode" VARCHAR(20),
    "adrs_email" VARCHAR(255),
    "adrs_phone_number_country_code" VARCHAR(10),
    "adrs_phone_number" VARCHAR(20),
    "adrs_extension" VARCHAR(10),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_address_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."supplier_bank_detail" (
    "id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "bank_country_code" VARCHAR(10),
    "bank_name" VARCHAR(255),
    "bank_branch_name" VARCHAR(255),
    "bank_account_number" VARCHAR(50),
    "bank_account_holder" VARCHAR(255),
    "bank_account_type" VARCHAR(50),
    "bank_account_currency_code" VARCHAR(10),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_bank_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."supplier_contact_info" (
    "id" SERIAL NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "cont_first_name" VARCHAR(100),
    "cont_last_name" VARCHAR(100),
    "cont_email" VARCHAR(255),
    "cont_job_title" VARCHAR(100),
    "cont_country_code" VARCHAR(10),
    "cont_mobile" VARCHAR(20),
    "cont_is_admin" BOOLEAN DEFAULT true,
    "cont_is_supplier_portal" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_contact_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."supplier_master" (
    "id" SERIAL NOT NULL,
    "vendor_code" VARCHAR(20),
    "vendor_company_name" VARCHAR(255),
    "bus_relationship" VARCHAR(100),
    "country_code" VARCHAR(10),
    "pan_card" VARCHAR(20),
    "organization_type" VARCHAR(100),
    "vendor_type" VARCHAR(100),
    "is_msme_reg" BOOLEAN DEFAULT true,
    "vendor_url" VARCHAR(500),
    "upload_doc" TEXT,
    "gstin_uin_number" VARCHAR(20),
    "place_of_supply" VARCHAR(100),
    "msme_udyam_reg_number" VARCHAR(50),
    "gst_treatment" VARCHAR(100),
    "is_active" BOOLEAN DEFAULT true,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deactivation_reason" VARCHAR(500),
    "deactivated_at" TIMESTAMP(6),

    CONSTRAINT "supplier_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."supplier_rate_contract" (
    "id" SERIAL NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "itemtype" VARCHAR(50) NOT NULL,
    "sku_code" VARCHAR(300) NOT NULL,
    "rate_basis" VARCHAR(20) NOT NULL DEFAULT 'PER_GM',
    "rate_type" VARCHAR(20) NOT NULL DEFAULT 'AMOUNT',
    "rate_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "uom" VARCHAR(10) NOT NULL DEFAULT 'GMS',
    "remarks" VARCHAR(500),
    "is_active" BOOLEAN DEFAULT true,
    "deactivation_reason" VARCHAR(500),
    "deactivated_at" TIMESTAMP(6),
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_rate_contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_error_log" (
    "id" SERIAL NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'ERROR',
    "error_type" VARCHAR(200),
    "message" TEXT NOT NULL,
    "stack_trace" TEXT,
    "request_path" VARCHAR(500),
    "request_method" VARCHAR(10),
    "user_id" INTEGER,
    "employee_id" VARCHAR(50),
    "ip_address" VARCHAR(50),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_error_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_master" (
    "user_id" SERIAL NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(50) NOT NULL,
    "last_name" VARCHAR(50),
    "emp_email" VARCHAR(255),
    "mobile_number" VARCHAR(20),
    "profile_image" VARCHAR(500),
    "department_id" VARCHAR(50),
    "designation" VARCHAR(100),
    "manager_id" INTEGER,
    "user_status" BOOLEAN DEFAULT true,
    "jwt_token" TEXT,
    "jwt_token_update" TIMESTAMPTZ(6),
    "start_date" DATE,
    "expiry_date" DATE,
    "timezone" VARCHAR(50) DEFAULT 'Asia/Kolkata',
    "language" VARCHAR(10) DEFAULT 'en',
    "last_login_at" TIMESTAMPTZ(6),
    "login_ip" VARCHAR(50),
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "inactive_date" DATE,
    "inactive_reason" VARCHAR(500),
    "reset_otp_hash" VARCHAR(255),
    "reset_otp_expiry" TIMESTAMP(6),
    "reset_otp_attempts" INTEGER DEFAULT 0,
    "reset_token" VARCHAR(255),
    "reset_token_expiry" TIMESTAMP(6),
    "activation_token" VARCHAR(255),
    "activation_token_expiry" TIMESTAMP(6),

    CONSTRAINT "user_master_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."user_menu_mapping" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "menu_id" INTEGER NOT NULL,
    "can_view" BOOLEAN,
    "can_create" BOOLEAN,
    "can_update" BOOLEAN,
    "can_delete" BOOLEAN,
    "can_print" BOOLEAN,
    "can_export" BOOLEAN,
    "is_active" BOOLEAN DEFAULT true,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_menu_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_role" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "is_default" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wf_config" (
    "id" SERIAL NOT NULL,
    "wf_code" VARCHAR(50) NOT NULL,
    "wf_name" VARCHAR(200) NOT NULL,
    "module_code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "self_approval" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "wf_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wf_history" (
    "id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "step_no" INTEGER NOT NULL,
    "step_name" VARCHAR(200),
    "action" VARCHAR(50) NOT NULL,
    "action_by" INTEGER NOT NULL,
    "action_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,

    CONSTRAINT "wf_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wf_request" (
    "id" SERIAL NOT NULL,
    "config_id" INTEGER NOT NULL,
    "record_type" VARCHAR(50) NOT NULL,
    "record_id" INTEGER NOT NULL,
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "wf_status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wf_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wf_step" (
    "id" SERIAL NOT NULL,
    "config_id" INTEGER NOT NULL,
    "step_no" INTEGER NOT NULL,
    "step_name" VARCHAR(200) NOT NULL,
    "role_id" INTEGER,
    "user_id" INTEGER,
    "can_submit" BOOLEAN DEFAULT false,
    "can_approve" BOOLEAN DEFAULT false,
    "can_reject" BOOLEAN DEFAULT false,
    "can_rfc" BOOLEAN DEFAULT false,
    "rfc_to_step" INTEGER DEFAULT 1,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wf_step_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alloy_master_alloy_code_key" ON "public"."alloy_master"("alloy_code" ASC);

-- CreateIndex
CREATE INDEX "idx_alloy_active" ON "public"."alloy_master"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_alloy_code" ON "public"."alloy_master"("alloy_code" ASC);

-- CreateIndex
CREATE INDEX "idx_bom_fg_status" ON "public"."bom_fg"("bom_status" ASC);

-- CreateIndex
CREATE INDEX "idx_bom_fg_variant" ON "public"."bom_fg"("variant_id" ASC);

-- CreateIndex
CREATE INDEX "idx_bom_fg_detail_bom" ON "public"."bom_fg_detail"("bom_id" ASC);

-- CreateIndex
CREATE INDEX "idx_bom_fg_detail_type" ON "public"."bom_fg_detail"("bom_type" ASC);

-- CreateIndex
CREATE INDEX "idx_bom_fin_status" ON "public"."bom_fin"("bom_status" ASC);

-- CreateIndex
CREATE INDEX "idx_bom_fin_variant" ON "public"."bom_fin"("variant_id" ASC);

-- CreateIndex
CREATE INDEX "idx_bom_fin_detail_bom" ON "public"."bom_fin_detail"("bom_id" ASC);

-- CreateIndex
CREATE INDEX "idx_bom_fin_detail_type" ON "public"."bom_fin_detail"("bom_type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "component_master_component_code_key" ON "public"."component_master"("component_code" ASC);

-- CreateIndex
CREATE INDEX "idx_comp_master_active" ON "public"."component_master"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_comp_master_code" ON "public"."component_master"("component_code" ASC);

-- CreateIndex
CREATE INDEX "idx_comp_master_type" ON "public"."component_master"("component_type" ASC);

-- CreateIndex
CREATE INDEX "idx_cust_address_cid" ON "public"."customer_address_info"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "idx_cust_contact_cid" ON "public"."customer_contact_info"("customer_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "customer_master_customer_code_key" ON "public"."customer_master"("customer_code" ASC);

-- CreateIndex
CREATE INDEX "idx_customer_active" ON "public"."customer_master"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_customer_code" ON "public"."customer_master"("customer_code" ASC);

-- CreateIndex
CREATE INDEX "idx_customer_name" ON "public"."customer_master"("customer_company_name" ASC);

-- CreateIndex
CREATE INDEX "idx_cust_price_metal_active" ON "public"."customer_price_master_metal"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_cust_price_metal_customer" ON "public"."customer_price_master_metal"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "idx_cust_price_metal_itemtype" ON "public"."customer_price_master_metal"("itemtype" ASC);

-- CreateIndex
CREATE INDEX "idx_cust_price_metal_sku" ON "public"."customer_price_master_metal"("sku_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_cust_price_metal_cust_item_sku_karat" ON "public"."customer_price_master_metal"("customer_id" ASC, "itemtype" ASC, "sku_code" ASC, "karatage" ASC);

-- CreateIndex
CREATE INDEX "idx_cust_price_stone_active" ON "public"."customer_price_master_stone"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_cust_price_stone_customer" ON "public"."customer_price_master_stone"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "idx_cust_price_stone_name" ON "public"."customer_price_master_stone"("stone_name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_cust_price_stone_cust_name_code" ON "public"."customer_price_master_stone"("customer_id" ASC, "stone_name" ASC, "stone_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "dept_master_dept_code_key" ON "public"."dept_master"("dept_code" ASC);

-- CreateIndex
CREATE INDEX "idx_dept_active" ON "public"."dept_master"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_dept_code" ON "public"."dept_master"("dept_code" ASC);

-- CreateIndex
CREATE INDEX "idx_design_images_design" ON "public"."design_images"("design_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "design_master_design_code_key" ON "public"."design_master"("design_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "item_variant_sku_code_key" ON "public"."fg_item_variant"("sku_code" ASC);

-- CreateIndex
CREATE INDEX "idx_fg_ivc_variant" ON "public"."fg_item_variant_client"("variant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "fin_item_variant_sku_code_key" ON "public"."fin_item_variant"("sku_code" ASC);

-- CreateIndex
CREATE INDEX "idx_fin_variant_item" ON "public"."fin_item_variant"("item_id" ASC);

-- CreateIndex
CREATE INDEX "idx_fin_ivc_variant" ON "public"."fin_item_variant_client"("variant_id" ASC);

-- CreateIndex
CREATE INDEX "idx_inv_struct_active" ON "public"."inventory_structure"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_inv_struct_bu" ON "public"."inventory_structure"("inv_bu_code" ASC);

-- CreateIndex
CREATE INDEX "idx_inv_struct_org" ON "public"."inventory_structure"("inv_org_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_inv_struct_bu_org_subinv" ON "public"."inventory_structure"("inv_bu_code" ASC, "inv_org_code" ASC, "sub_inv_code" ASC);

-- CreateIndex
CREATE INDEX "idx_login_history_time" ON "public"."login_history"("login_time" ASC);

-- CreateIndex
CREATE INDEX "idx_login_history_user" ON "public"."login_history"("user_id" ASC);

-- CreateIndex
CREATE INDEX "idx_machine_active" ON "public"."machine_master"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_machine_code" ON "public"."machine_master"("machine_code" ASC);

-- CreateIndex
CREATE INDEX "idx_machine_dept" ON "public"."machine_master"("dept_id" ASC);

-- CreateIndex
CREATE INDEX "idx_machine_type" ON "public"."machine_master"("machine_type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "machine_master_machine_code_key" ON "public"."machine_master"("machine_code" ASC);

-- CreateIndex
CREATE INDEX "idx_master_lookup_type" ON "public"."master_lookup"("lookup_type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "master_lookup_lookup_type_lookup_code_key" ON "public"."master_lookup"("lookup_type" ASC, "lookup_code" ASC);

-- CreateIndex
CREATE INDEX "idx_menu_master_parent" ON "public"."menu_master"("parent_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "menu_master_menu_code_key" ON "public"."menu_master"("menu_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "component_item_master_comp_code_key" ON "public"."metal_master"("metal_code" ASC);

-- CreateIndex
CREATE INDEX "idx_metal_master_active" ON "public"."metal_master"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_metal_master_code" ON "public"."metal_master"("metal_code" ASC);

-- CreateIndex
CREATE INDEX "idx_min_max_active" ON "public"."min_max_planning_master"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_min_max_itemtype" ON "public"."min_max_planning_master"("itemtype" ASC);

-- CreateIndex
CREATE INDEX "idx_min_max_sku" ON "public"."min_max_planning_master"("sku_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_min_max_itemtype_sku" ON "public"."min_max_planning_master"("itemtype" ASC, "sku_code" ASC);

-- CreateIndex
CREATE INDEX "idx_op_active" ON "public"."operation_master"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_op_code" ON "public"."operation_master"("operation_code" ASC);

-- CreateIndex
CREATE INDEX "idx_op_dept" ON "public"."operation_master"("dept_id" ASC);

-- CreateIndex
CREATE INDEX "idx_op_machine_ids" ON "public"."operation_master" USING GIN ("machine_ids" array_ops);

-- CreateIndex
CREATE UNIQUE INDEX "operation_master_operation_code_key" ON "public"."operation_master"("operation_code" ASC);

-- CreateIndex
CREATE INDEX "idx_party_master_code" ON "public"."party_master"("party_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "party_master_party_code_key" ON "public"."party_master"("party_code" ASC);

-- CreateIndex
CREATE INDEX "idx_project_config_key" ON "public"."project_config"("key_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "project_config_key_code_key" ON "public"."project_config"("key_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "role_master_role_code_key" ON "public"."role_master"("role_code" ASC);

-- CreateIndex
CREATE INDEX "idx_role_menu_role" ON "public"."role_menu_mapping"("role_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "role_menu_mapping_role_id_menu_id_key" ON "public"."role_menu_mapping"("role_id" ASC, "menu_id" ASC);

-- CreateIndex
CREATE INDEX "idx_stone_item_active" ON "public"."stone_item_master"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_stone_item_code" ON "public"."stone_item_master"("stn_code" ASC);

-- CreateIndex
CREATE INDEX "idx_stone_item_type" ON "public"."stone_item_master"("stn_type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "stone_item_master_stn_code_key" ON "public"."stone_item_master"("stn_code" ASC);

-- CreateIndex
CREATE INDEX "idx_supp_address_sid" ON "public"."supplier_address_info"("supplier_id" ASC);

-- CreateIndex
CREATE INDEX "idx_supp_bank_sid" ON "public"."supplier_bank_detail"("supplier_id" ASC);

-- CreateIndex
CREATE INDEX "idx_supp_contact_sid" ON "public"."supplier_contact_info"("supplier_id" ASC);

-- CreateIndex
CREATE INDEX "idx_supplier_active" ON "public"."supplier_master"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_supplier_code" ON "public"."supplier_master"("vendor_code" ASC);

-- CreateIndex
CREATE INDEX "idx_supplier_name" ON "public"."supplier_master"("vendor_company_name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_master_vendor_code_key" ON "public"."supplier_master"("vendor_code" ASC);

-- CreateIndex
CREATE INDEX "idx_supp_rate_active" ON "public"."supplier_rate_contract"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_supp_rate_itemtype" ON "public"."supplier_rate_contract"("itemtype" ASC);

-- CreateIndex
CREATE INDEX "idx_supp_rate_sku" ON "public"."supplier_rate_contract"("sku_code" ASC);

-- CreateIndex
CREATE INDEX "idx_supp_rate_vendor" ON "public"."supplier_rate_contract"("vendor_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "uq_supp_rate_vendor_item_sku" ON "public"."supplier_rate_contract"("vendor_id" ASC, "itemtype" ASC, "sku_code" ASC);

-- CreateIndex
CREATE INDEX "idx_error_log_created" ON "public"."system_error_log"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_error_log_severity" ON "public"."system_error_log"("severity" ASC);

-- CreateIndex
CREATE INDEX "idx_user_master_employeeid" ON "public"."user_master"("employee_id" ASC);

-- CreateIndex
CREATE INDEX "idx_user_master_jwt_token" ON "public"."user_master"("jwt_token" ASC);

-- CreateIndex
CREATE INDEX "idx_user_master_token" ON "public"."user_master"("jwt_token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_master_employee_id_key" ON "public"."user_master"("employee_id" ASC);

-- CreateIndex
CREATE INDEX "idx_user_menu_mapping_user" ON "public"."user_menu_mapping"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_menu_mapping_user_id_menu_id_key" ON "public"."user_menu_mapping"("user_id" ASC, "menu_id" ASC);

-- CreateIndex
CREATE INDEX "idx_user_role_user" ON "public"."user_role"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "user_role_user_id_role_id_key" ON "public"."user_role"("user_id" ASC, "role_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "wf_config_wf_code_key" ON "public"."wf_config"("wf_code" ASC);

-- CreateIndex
CREATE INDEX "idx_wf_history_request" ON "public"."wf_history"("request_id" ASC);

-- CreateIndex
CREATE INDEX "idx_wf_request_record" ON "public"."wf_request"("record_type" ASC, "record_id" ASC);

-- CreateIndex
CREATE INDEX "idx_wf_request_status" ON "public"."wf_request"("wf_status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "wf_request_record_type_record_id_key" ON "public"."wf_request"("record_type" ASC, "record_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "wf_step_config_id_step_no_key" ON "public"."wf_step"("config_id" ASC, "step_no" ASC);

-- AddForeignKey
ALTER TABLE "public"."audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_master"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."bom_fg" ADD CONSTRAINT "bom_fg_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."fg_item_variant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."bom_fg_detail" ADD CONSTRAINT "bom_fg_detail_bom_id_fkey" FOREIGN KEY ("bom_id") REFERENCES "public"."bom_fg"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."bom_fin" ADD CONSTRAINT "bom_fin_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."fin_item_variant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."bom_fin_detail" ADD CONSTRAINT "bom_fin_detail_bom_id_fkey" FOREIGN KEY ("bom_id") REFERENCES "public"."bom_fin"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."customer_address_info" ADD CONSTRAINT "customer_address_info_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer_master"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."customer_contact_info" ADD CONSTRAINT "customer_contact_info_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer_master"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."customer_price_master_metal" ADD CONSTRAINT "customer_price_master_metal_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer_master"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."customer_price_master_stone" ADD CONSTRAINT "customer_price_master_stone_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer_master"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."design_images" ADD CONSTRAINT "design_images_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "public"."design_master"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."fg_item_master" ADD CONSTRAINT "item_master_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "public"."design_master"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."fg_item_variant" ADD CONSTRAINT "item_variant_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."fg_item_master"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."fg_item_variant_client" ADD CONSTRAINT "item_variant_client_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."fg_item_variant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."fin_item_master" ADD CONSTRAINT "fin_item_master_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "public"."design_master"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."fin_item_variant" ADD CONSTRAINT "fin_item_variant_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."fin_item_master"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."fin_item_variant_client" ADD CONSTRAINT "fin_item_variant_client_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."fin_item_variant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."login_history" ADD CONSTRAINT "login_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_master"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."menu_master" ADD CONSTRAINT "menu_master_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."menu_master"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."role_menu_mapping" ADD CONSTRAINT "role_menu_mapping_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "public"."menu_master"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."role_menu_mapping" ADD CONSTRAINT "role_menu_mapping_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."role_master"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."supplier_address_info" ADD CONSTRAINT "supplier_address_info_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier_master"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."supplier_bank_detail" ADD CONSTRAINT "supplier_bank_detail_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier_master"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."supplier_contact_info" ADD CONSTRAINT "supplier_contact_info_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."supplier_master"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."supplier_rate_contract" ADD CONSTRAINT "supplier_rate_contract_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."supplier_master"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."system_error_log" ADD CONSTRAINT "system_error_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_master"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_master" ADD CONSTRAINT "user_master_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_master"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_master" ADD CONSTRAINT "user_master_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "public"."user_master"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_master" ADD CONSTRAINT "user_master_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."user_master"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_menu_mapping" ADD CONSTRAINT "user_menu_mapping_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "public"."menu_master"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_menu_mapping" ADD CONSTRAINT "user_menu_mapping_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_master"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_role" ADD CONSTRAINT "user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."role_master"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_master"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."wf_history" ADD CONSTRAINT "wf_history_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."wf_request"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."wf_request" ADD CONSTRAINT "wf_request_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."wf_config"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."wf_step" ADD CONSTRAINT "wf_step_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "public"."wf_config"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."wf_step" ADD CONSTRAINT "wf_step_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."role_master"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."wf_step" ADD CONSTRAINT "wf_step_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_master"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

