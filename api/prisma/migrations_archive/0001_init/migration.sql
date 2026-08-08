-- CreateSchema

-- CreateTable
CREATE TABLE "audit_log" (
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
CREATE TABLE "bom_fg" (
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

    CONSTRAINT "bom_fg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom_fg_detail" (
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

    CONSTRAINT "bom_fg_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_master" (
    "id" SERIAL NOT NULL,
    "category_code" VARCHAR(50) NOT NULL,
    "category_name" VARCHAR(200) NOT NULL,
    "parent_id" INTEGER,
    "description" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "component_item_master" (
    "id" SERIAL NOT NULL,
    "comp_code" VARCHAR(500),
    "comp_metal_type" VARCHAR(100),
    "comp_type" VARCHAR(100),
    "comp_karat_color" VARCHAR(100),
    "comp_purity" VARCHAR(100),
    "comp_name" VARCHAR(100),
    "is_active" BOOLEAN DEFAULT true,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "component_item_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_address_info" (
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
CREATE TABLE "customer_contact_info" (
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
CREATE TABLE "customer_master" (
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

    CONSTRAINT "customer_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_master" (
    "id" SERIAL NOT NULL,
    "design_code" VARCHAR(50) NOT NULL,
    "design_no" VARCHAR(50) NOT NULL,
    "collection_name" VARCHAR(100),
    "product_name" VARCHAR(100),
    "design_attributes" JSONB DEFAULT '{}',
    "design_image" VARCHAR(500),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "design_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "erp_settings" (
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "erp_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "item_master" (
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
    "status" VARCHAR(20) DEFAULT 'DRAFT',
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "uom1" VARCHAR(50),
    "uom2" VARCHAR(50),

    CONSTRAINT "item_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_variant" (
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

    CONSTRAINT "item_variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_variant_client" (
    "id" SERIAL NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "customer_name" VARCHAR(255),
    "customer_variant_code" VARCHAR(100),
    "customer_variant_name" VARCHAR(200),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_variant_client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_history" (
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
CREATE TABLE "master_lookup" (
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

    CONSTRAINT "master_lookup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_master" (
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
CREATE TABLE "metal_master" (
    "id" SERIAL NOT NULL,
    "metal_code" VARCHAR(50) NOT NULL,
    "metal_name" VARCHAR(100) NOT NULL,
    "purity_code" VARCHAR(20),
    "purity_percentage" DECIMAL(5,2),
    "current_rate" DECIMAL(15,4),
    "unit" VARCHAR(20) DEFAULT 'gram',
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metal_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_master" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "notification_type" VARCHAR(50) DEFAULT 'info',
    "is_read" BOOLEAN DEFAULT false,
    "action_url" VARCHAR(500),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_master" (
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
CREATE TABLE "product_master" (
    "id" SERIAL NOT NULL,
    "product_code" VARCHAR(100) NOT NULL,
    "product_name" VARCHAR(200) NOT NULL,
    "category_id" INTEGER,
    "metal_id" INTEGER,
    "gross_weight" DECIMAL(10,4),
    "net_weight" DECIMAL(10,4),
    "stone_weight" DECIMAL(10,4),
    "making_charge" DECIMAL(10,2),
    "wastage_percentage" DECIMAL(5,2),
    "hsn_code" VARCHAR(20),
    "description" TEXT,
    "image_url" VARCHAR(500),
    "barcode" VARCHAR(100),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_config" (
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
CREATE TABLE "purchase_order" (
    "id" SERIAL NOT NULL,
    "order_no" VARCHAR(50) NOT NULL,
    "order_date" DATE NOT NULL,
    "party_id" INTEGER,
    "total_amount" DECIMAL(15,2) DEFAULT 0,
    "tax_amount" DECIMAL(15,2) DEFAULT 0,
    "net_amount" DECIMAL(15,2) DEFAULT 0,
    "status" VARCHAR(20) DEFAULT 'PENDING',
    "remarks" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_master" (
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
CREATE TABLE "role_menu_mapping" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "menu_id" INTEGER NOT NULL,
    "can_view" BOOLEAN NOT NULL DEFAULT true,
    "can_create" BOOLEAN NOT NULL DEFAULT false,
    "can_update" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "can_print" BOOLEAN NOT NULL DEFAULT false,
    "can_export" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "role_menu_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order" (
    "id" SERIAL NOT NULL,
    "order_no" VARCHAR(50) NOT NULL,
    "order_date" DATE NOT NULL,
    "party_id" INTEGER,
    "total_amount" DECIMAL(15,2) DEFAULT 0,
    "discount_amount" DECIMAL(15,2) DEFAULT 0,
    "tax_amount" DECIMAL(15,2) DEFAULT 0,
    "net_amount" DECIMAL(15,2) DEFAULT 0,
    "advance_amount" DECIMAL(15,2) DEFAULT 0,
    "status" VARCHAR(20) DEFAULT 'PENDING',
    "remarks" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_items" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER,
    "product_id" INTEGER,
    "quantity" INTEGER DEFAULT 1,
    "gross_weight" DECIMAL(10,4),
    "net_weight" DECIMAL(10,4),
    "rate" DECIMAL(15,4),
    "making_charge" DECIMAL(10,2),
    "amount" DECIMAL(15,2),
    "remarks" TEXT,

    CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_ledger" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER,
    "transaction_type" VARCHAR(20) NOT NULL,
    "transaction_no" VARCHAR(50),
    "transaction_date" DATE NOT NULL,
    "in_quantity" INTEGER DEFAULT 0,
    "out_quantity" INTEGER DEFAULT 0,
    "in_weight" DECIMAL(10,4) DEFAULT 0,
    "out_weight" DECIMAL(10,4) DEFAULT 0,
    "balance_quantity" INTEGER DEFAULT 0,
    "balance_weight" DECIMAL(10,4) DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stone_item_master" (
    "id" SERIAL NOT NULL,
    "stn_code" VARCHAR(300),
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

    CONSTRAINT "stone_item_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_address_info" (
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
CREATE TABLE "supplier_bank_detail" (
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
CREATE TABLE "supplier_contact_info" (
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
CREATE TABLE "supplier_master" (
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

    CONSTRAINT "supplier_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_error_log" (
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
CREATE TABLE "user_master" (
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
CREATE TABLE "user_role" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,
    "is_default" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wf_config" (
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

    CONSTRAINT "wf_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wf_history" (
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
CREATE TABLE "wf_request" (
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
CREATE TABLE "wf_step" (
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
CREATE INDEX "idx_audit_log_action" ON "audit_log"("action");

-- CreateIndex
CREATE INDEX "idx_audit_log_created" ON "audit_log"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_log_module" ON "audit_log"("module");

-- CreateIndex
CREATE INDEX "idx_audit_log_user" ON "audit_log"("user_id");

-- CreateIndex
CREATE INDEX "idx_bom_fg_status" ON "bom_fg"("bom_status");

-- CreateIndex
CREATE INDEX "idx_bom_fg_variant" ON "bom_fg"("variant_id");

-- CreateIndex
CREATE INDEX "idx_bom_fg_detail_bom" ON "bom_fg_detail"("bom_id");

-- CreateIndex
CREATE INDEX "idx_bom_fg_detail_type" ON "bom_fg_detail"("bom_type");

-- CreateIndex
CREATE UNIQUE INDEX "category_master_category_code_key" ON "category_master"("category_code");

-- CreateIndex
CREATE UNIQUE INDEX "component_item_master_comp_code_key" ON "component_item_master"("comp_code");

-- CreateIndex
CREATE INDEX "idx_comp_item_active" ON "component_item_master"("is_active");

-- CreateIndex
CREATE INDEX "idx_comp_item_code" ON "component_item_master"("comp_code");

-- CreateIndex
CREATE INDEX "idx_comp_item_type" ON "component_item_master"("comp_type");

-- CreateIndex
CREATE INDEX "idx_cust_address_cid" ON "customer_address_info"("customer_id");

-- CreateIndex
CREATE INDEX "idx_cust_contact_cid" ON "customer_contact_info"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_master_customer_code_key" ON "customer_master"("customer_code");

-- CreateIndex
CREATE INDEX "idx_customer_active" ON "customer_master"("is_active");

-- CreateIndex
CREATE INDEX "idx_customer_code" ON "customer_master"("customer_code");

-- CreateIndex
CREATE INDEX "idx_customer_name" ON "customer_master"("customer_company_name");

-- CreateIndex
CREATE UNIQUE INDEX "design_master_design_code_key" ON "design_master"("design_code");

-- CreateIndex
CREATE UNIQUE INDEX "item_variant_sku_code_key" ON "item_variant"("sku_code");

-- CreateIndex
CREATE INDEX "idx_ivc_variant" ON "item_variant_client"("variant_id");

-- CreateIndex
CREATE INDEX "idx_login_history_time" ON "login_history"("login_time");

-- CreateIndex
CREATE INDEX "idx_login_history_user" ON "login_history"("user_id");

-- CreateIndex
CREATE INDEX "idx_master_lookup_type" ON "master_lookup"("lookup_type");

-- CreateIndex
CREATE UNIQUE INDEX "master_lookup_lookup_type_lookup_code_key" ON "master_lookup"("lookup_type", "lookup_code");

-- CreateIndex
CREATE UNIQUE INDEX "menu_master_menu_code_key" ON "menu_master"("menu_code");

-- CreateIndex
CREATE INDEX "idx_menu_master_parent" ON "menu_master"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "metal_master_metal_code_key" ON "metal_master"("metal_code");

-- CreateIndex
CREATE UNIQUE INDEX "party_master_party_code_key" ON "party_master"("party_code");

-- CreateIndex
CREATE INDEX "idx_party_master_code" ON "party_master"("party_code");

-- CreateIndex
CREATE UNIQUE INDEX "product_master_product_code_key" ON "product_master"("product_code");

-- CreateIndex
CREATE INDEX "idx_product_master_code" ON "product_master"("product_code");

-- CreateIndex
CREATE UNIQUE INDEX "project_config_key_code_key" ON "project_config"("key_code");

-- CreateIndex
CREATE INDEX "idx_project_config_key" ON "project_config"("key_code");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_order_no_key" ON "purchase_order"("order_no");

-- CreateIndex
CREATE UNIQUE INDEX "role_master_role_code_key" ON "role_master"("role_code");

-- CreateIndex
CREATE INDEX "idx_role_menu_role" ON "role_menu_mapping"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_menu_mapping_role_id_menu_id_key" ON "role_menu_mapping"("role_id", "menu_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_order_order_no_key" ON "sales_order"("order_no");

-- CreateIndex
CREATE INDEX "idx_sales_order_date" ON "sales_order"("order_date");

-- CreateIndex
CREATE INDEX "idx_stock_ledger_product" ON "stock_ledger"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "stone_item_master_stn_code_key" ON "stone_item_master"("stn_code");

-- CreateIndex
CREATE INDEX "idx_stone_item_active" ON "stone_item_master"("is_active");

-- CreateIndex
CREATE INDEX "idx_stone_item_code" ON "stone_item_master"("stn_code");

-- CreateIndex
CREATE INDEX "idx_stone_item_type" ON "stone_item_master"("stn_type");

-- CreateIndex
CREATE INDEX "idx_supp_address_sid" ON "supplier_address_info"("supplier_id");

-- CreateIndex
CREATE INDEX "idx_supp_bank_sid" ON "supplier_bank_detail"("supplier_id");

-- CreateIndex
CREATE INDEX "idx_supp_contact_sid" ON "supplier_contact_info"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_master_vendor_code_key" ON "supplier_master"("vendor_code");

-- CreateIndex
CREATE INDEX "idx_supplier_active" ON "supplier_master"("is_active");

-- CreateIndex
CREATE INDEX "idx_supplier_code" ON "supplier_master"("vendor_code");

-- CreateIndex
CREATE INDEX "idx_supplier_name" ON "supplier_master"("vendor_company_name");

-- CreateIndex
CREATE INDEX "idx_error_log_created" ON "system_error_log"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_error_log_severity" ON "system_error_log"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "user_master_employee_id_key" ON "user_master"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_master_emp_email_key" ON "user_master"("emp_email");

-- CreateIndex
CREATE INDEX "idx_user_master_employeeid" ON "user_master"("employee_id");

-- CreateIndex
CREATE INDEX "idx_user_master_jwt_token" ON "user_master"("jwt_token");

-- CreateIndex
CREATE INDEX "idx_user_role_user" ON "user_role"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_role_user_id_role_id_key" ON "user_role"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "wf_config_wf_code_key" ON "wf_config"("wf_code");

-- CreateIndex
CREATE INDEX "idx_wf_history_request" ON "wf_history"("request_id");

-- CreateIndex
CREATE INDEX "idx_wf_request_record" ON "wf_request"("record_type", "record_id");

-- CreateIndex
CREATE INDEX "idx_wf_request_status" ON "wf_request"("wf_status");

-- CreateIndex
CREATE UNIQUE INDEX "wf_request_record_type_record_id_key" ON "wf_request"("record_type", "record_id");

-- CreateIndex
CREATE UNIQUE INDEX "wf_step_config_id_step_no_key" ON "wf_step"("config_id", "step_no");

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_master"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bom_fg" ADD CONSTRAINT "bom_fg_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "item_variant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bom_fg_detail" ADD CONSTRAINT "bom_fg_detail_bom_id_fkey" FOREIGN KEY ("bom_id") REFERENCES "bom_fg"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "category_master" ADD CONSTRAINT "category_master_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "category_master"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_address_info" ADD CONSTRAINT "customer_address_info_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer_master"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_contact_info" ADD CONSTRAINT "customer_contact_info_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer_master"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "item_master" ADD CONSTRAINT "item_master_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "design_master"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "item_variant" ADD CONSTRAINT "item_variant_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item_master"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "item_variant_client" ADD CONSTRAINT "item_variant_client_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "item_variant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "login_history" ADD CONSTRAINT "login_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_master"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "menu_master" ADD CONSTRAINT "menu_master_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "menu_master"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notification_master" ADD CONSTRAINT "notification_master_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_master"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_master" ADD CONSTRAINT "product_master_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category_master"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_master" ADD CONSTRAINT "product_master_metal_id_fkey" FOREIGN KEY ("metal_id") REFERENCES "metal_master"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_master"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "party_master"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_menu_mapping" ADD CONSTRAINT "role_menu_mapping_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menu_master"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_menu_mapping" ADD CONSTRAINT "role_menu_mapping_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role_master"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_master"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "party_master"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "sales_order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product_master"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product_master"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supplier_address_info" ADD CONSTRAINT "supplier_address_info_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier_master"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supplier_bank_detail" ADD CONSTRAINT "supplier_bank_detail_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier_master"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supplier_contact_info" ADD CONSTRAINT "supplier_contact_info_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier_master"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "system_error_log" ADD CONSTRAINT "system_error_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_master"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_master" ADD CONSTRAINT "user_master_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_master"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_master" ADD CONSTRAINT "user_master_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "user_master"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_master" ADD CONSTRAINT "user_master_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user_master"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role_master"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_master"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wf_history" ADD CONSTRAINT "wf_history_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "wf_request"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wf_request" ADD CONSTRAINT "wf_request_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "wf_config"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wf_step" ADD CONSTRAINT "wf_step_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "wf_config"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wf_step" ADD CONSTRAINT "wf_step_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role_master"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wf_step" ADD CONSTRAINT "wf_step_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_master"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

