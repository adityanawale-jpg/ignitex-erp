-- ============================================================
-- 36_customer_master.sql
-- Customer Master: tables, trigger, lookup seeds
-- Menu MM_CUSTOMER already exists at /master-mgmt/customer
-- Run after 35_fix_fg_item_get_by_id_design_image.sql
-- ============================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════
-- 1. TABLES
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS customer_master (
    id                    SERIAL PRIMARY KEY,
    customer_code         VARCHAR(20) UNIQUE,
    customer_name         VARCHAR(255),
    customer_company_name VARCHAR(255),
    customer_display_name VARCHAR(255),
    bus_relationship      VARCHAR(100),
    country_code          VARCHAR(10),
    pan_card              VARCHAR(20),
    organization_type     VARCHAR(100),
    customer_type         VARCHAR(100),
    is_msme_reg           BOOLEAN   DEFAULT FALSE,
    website_url           VARCHAR(500),
    upload_doc            TEXT,
    tax_payer_type        VARCHAR(100),
    gstin_status          VARCHAR(100),
    gstin_uin_number      VARCHAR(20),
    place_of_supply       VARCHAR(100),
    gst_treatment         VARCHAR(100),
    credit_limit_by_value NUMERIC(18,2) DEFAULT 0,
    credit_limit_by_grams NUMERIC(14,4) DEFAULT 0,
    payment_terms         VARCHAR(255),
    is_active             BOOLEAN   DEFAULT TRUE,
    created_by            INT,
    updated_by            INT,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_contact_info (
    id                SERIAL PRIMARY KEY,
    customer_id       INT NOT NULL REFERENCES customer_master(id) ON DELETE CASCADE,
    cont_first_name   VARCHAR(100),
    cont_last_name    VARCHAR(100),
    cont_email        VARCHAR(255),
    cont_job_title    VARCHAR(100),
    cont_country_code VARCHAR(10),
    cont_mobile       VARCHAR(20),
    cont_is_admin     BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_address_info (
    id                             SERIAL PRIMARY KEY,
    customer_id                    INT NOT NULL REFERENCES customer_master(id) ON DELETE CASCADE,
    adrs_name                      VARCHAR(255),
    adrs_country_code              VARCHAR(10),
    adrs_1                         VARCHAR(255),
    adrs_2                         VARCHAR(255),
    adrs_3                         VARCHAR(255),
    adrs_city_name                 VARCHAR(100),
    adrs_state_code                VARCHAR(10),
    adrs_pincode                   VARCHAR(20),
    adrs_email                     VARCHAR(255),
    adrs_phone_number_country_code VARCHAR(10),
    adrs_phone_number              VARCHAR(20),
    adrs_extension                 VARCHAR(10),
    created_at                     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_bank_detail (
    id                         SERIAL PRIMARY KEY,
    customer_id                INT NOT NULL REFERENCES customer_master(id) ON DELETE CASCADE,
    bank_country_code          VARCHAR(10),
    bank_name                  VARCHAR(255),
    bank_branch_name           VARCHAR(255),
    bank_account_number        VARCHAR(50),
    bank_account_holder        VARCHAR(255),
    bank_account_type          VARCHAR(50),
    bank_account_currency_code VARCHAR(10),
    created_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ══════════════════════════════════════════════════════════════
-- 2. INDEXES
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_customer_code    ON customer_master(customer_code);
CREATE INDEX IF NOT EXISTS idx_customer_name    ON customer_master(customer_company_name);
CREATE INDEX IF NOT EXISTS idx_customer_active  ON customer_master(is_active);
CREATE INDEX IF NOT EXISTS idx_cust_contact_cid ON customer_contact_info(customer_id);
CREATE INDEX IF NOT EXISTS idx_cust_address_cid ON customer_address_info(customer_id);
CREATE INDEX IF NOT EXISTS idx_cust_bank_cid    ON customer_bank_detail(customer_id);

-- ══════════════════════════════════════════════════════════════
-- 3. AUTO-GENERATE customer_code TRIGGER
--    Format: CUST-000001, CUST-000002, ...
-- ══════════════════════════════════════════════════════════════

CREATE SEQUENCE IF NOT EXISTS customer_code_seq START 1;

CREATE OR REPLACE FUNCTION fn_customer_gen_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.customer_code IS NULL OR TRIM(NEW.customer_code) = '' THEN
        NEW.customer_code := 'CUST-' || LPAD(nextval('customer_code_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_customer_code
BEFORE INSERT ON customer_master
FOR EACH ROW EXECUTE FUNCTION fn_customer_gen_code();

-- ══════════════════════════════════════════════════════════════
-- 4. LOOKUP SEEDS (new types only — COUNTRY, STATE, BUSINESS_RELATIONSHIP,
--    ORGANIZATION_TYPE, GST_TREATMENT, ACCOUNT_TYPE already seeded in
--    34_supplier_master.sql)
-- ══════════════════════════════════════════════════════════════

-- Customer Type
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('CUSTOMER_TYPE', 'RETAIL',    'Retail',    1, TRUE),
  ('CUSTOMER_TYPE', 'WHOLESALE', 'Wholesale', 2, TRUE),
  ('CUSTOMER_TYPE', 'CORPORATE', 'Corporate', 3, TRUE),
  ('CUSTOMER_TYPE', 'ONLINE',    'Online',    4, TRUE),
  ('CUSTOMER_TYPE', 'WALK_IN',   'Walk-In',   5, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

-- Tax Payer Type
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('TAX_PAYER_TYPE', 'REGULAR',      'Regular',      1, TRUE),
  ('TAX_PAYER_TYPE', 'COMPOSITION',  'Composition',  2, TRUE),
  ('TAX_PAYER_TYPE', 'CONSUMER',     'Consumer',     3, TRUE),
  ('TAX_PAYER_TYPE', 'UNREGISTERED', 'Unregistered', 4, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

-- GSTIN Status
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('GSTIN_STATUS', 'ACTIVE',      'Active',      1, TRUE),
  ('GSTIN_STATUS', 'CANCELLED',   'Cancelled',   2, TRUE),
  ('GSTIN_STATUS', 'SUSPENDED',   'Suspended',   3, TRUE),
  ('GSTIN_STATUS', 'PROVISIONAL', 'Provisional', 4, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

COMMIT;
