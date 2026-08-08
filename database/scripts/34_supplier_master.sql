-- ============================================================
-- 34_supplier_master.sql
-- Supplier Master: tables, trigger, lookup seeds
-- Menu MM_SUPPLIER already exists at /master-mgmt/supplier
-- Run after 33_component_item_master.sql
-- ============================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════
-- 1. TABLES
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS supplier_master (
    id                    SERIAL PRIMARY KEY,
    vendor_code           VARCHAR(20) UNIQUE,
    vendor_company_name   VARCHAR(255),
    bus_relationship      VARCHAR(100),
    country_code          VARCHAR(10),
    pan_card              VARCHAR(20),
    organization_type     VARCHAR(100),
    vendor_type           VARCHAR(100),
    is_msme_reg           BOOLEAN   DEFAULT TRUE,
    vendor_url            VARCHAR(500),
    upload_doc            TEXT,
    gstin_uin_number      VARCHAR(20),
    place_of_supply       VARCHAR(100),
    msme_udyam_reg_number VARCHAR(50),
    gst_treatment         VARCHAR(100),
    is_active             BOOLEAN   DEFAULT TRUE,
    created_by            INT,
    updated_by            INT,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_contact_info (
    id                      SERIAL PRIMARY KEY,
    supplier_id             INT NOT NULL REFERENCES supplier_master(id) ON DELETE CASCADE,
    cont_first_name         VARCHAR(100),
    cont_last_name          VARCHAR(100),
    cont_email              VARCHAR(255),
    cont_job_title          VARCHAR(100),
    cont_country_code       VARCHAR(10),
    cont_mobile             VARCHAR(20),
    cont_is_admin           BOOLEAN DEFAULT TRUE,
    cont_is_supplier_portal BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supplier_address_info (
    id                             SERIAL PRIMARY KEY,
    supplier_id                    INT NOT NULL REFERENCES supplier_master(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS supplier_bank_detail (
    id                         SERIAL PRIMARY KEY,
    supplier_id                INT NOT NULL REFERENCES supplier_master(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_supplier_code    ON supplier_master(vendor_code);
CREATE INDEX IF NOT EXISTS idx_supplier_name    ON supplier_master(vendor_company_name);
CREATE INDEX IF NOT EXISTS idx_supplier_active  ON supplier_master(is_active);
CREATE INDEX IF NOT EXISTS idx_supp_contact_sid ON supplier_contact_info(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supp_address_sid ON supplier_address_info(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supp_bank_sid    ON supplier_bank_detail(supplier_id);

-- ══════════════════════════════════════════════════════════════
-- 3. AUTO-GENERATE vendor_code TRIGGER
--    Format: SUP-000001, SUP-000002, ...
-- ══════════════════════════════════════════════════════════════

CREATE SEQUENCE IF NOT EXISTS supplier_vendor_code_seq START 1;

CREATE OR REPLACE FUNCTION fn_supplier_gen_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.vendor_code IS NULL OR TRIM(NEW.vendor_code) = '' THEN
        NEW.vendor_code := 'SUP-' || LPAD(nextval('supplier_vendor_code_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_supplier_code
BEFORE INSERT ON supplier_master
FOR EACH ROW EXECUTE FUNCTION fn_supplier_gen_code();

-- ══════════════════════════════════════════════════════════════
-- 4. LOOKUP SEEDS
-- ══════════════════════════════════════════════════════════════

-- Business Relationship
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('BUSINESS_RELATIONSHIP', 'SUPPLIER',         'Supplier',         1, TRUE),
  ('BUSINESS_RELATIONSHIP', 'CONTRACTOR',       'Contractor',       2, TRUE),
  ('BUSINESS_RELATIONSHIP', 'SERVICE_PROVIDER', 'Service Provider', 3, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

-- Organization Type
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('ORGANIZATION_TYPE', 'PROPRIETORSHIP',  'Proprietorship',  1, TRUE),
  ('ORGANIZATION_TYPE', 'PARTNERSHIP',     'Partnership',     2, TRUE),
  ('ORGANIZATION_TYPE', 'PRIVATE_LIMITED', 'Private Limited', 3, TRUE),
  ('ORGANIZATION_TYPE', 'PUBLIC_LIMITED',  'Public Limited',  4, TRUE),
  ('ORGANIZATION_TYPE', 'LLP',             'LLP',             5, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

-- GST Treatment
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('GST_TREATMENT', 'REGISTERED',   'Registered Business',   1, TRUE),
  ('GST_TREATMENT', 'UNREGISTERED', 'Unregistered Business', 2, TRUE),
  ('GST_TREATMENT', 'OVERSEAS',     'Overseas',              3, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

-- Account Type
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('ACCOUNT_TYPE', 'SAVINGS',   'Savings',   1, TRUE),
  ('ACCOUNT_TYPE', 'CURRENT',   'Current',   2, TRUE),
  ('ACCOUNT_TYPE', 'CORPORATE', 'Corporate', 3, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

-- Countries (lookup_name includes dial code so same LOV works for phone prefix)
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('COUNTRY', 'IN', 'India (+91)',          1,  TRUE),
  ('COUNTRY', 'US', 'United States (+1)',   2,  TRUE),
  ('COUNTRY', 'GB', 'United Kingdom (+44)', 3,  TRUE),
  ('COUNTRY', 'AE', 'UAE (+971)',            4,  TRUE),
  ('COUNTRY', 'AU', 'Australia (+61)',       5,  TRUE),
  ('COUNTRY', 'CA', 'Canada (+1)',           6,  TRUE),
  ('COUNTRY', 'SG', 'Singapore (+65)',       7,  TRUE),
  ('COUNTRY', 'HK', 'Hong Kong (+852)',      8,  TRUE),
  ('COUNTRY', 'JP', 'Japan (+81)',           9,  TRUE),
  ('COUNTRY', 'DE', 'Germany (+49)',         10, TRUE),
  ('COUNTRY', 'FR', 'France (+33)',          11, TRUE),
  ('COUNTRY', 'IT', 'Italy (+39)',           12, TRUE),
  ('COUNTRY', 'CH', 'Switzerland (+41)',     13, TRUE),
  ('COUNTRY', 'ZA', 'South Africa (+27)',    14, TRUE),
  ('COUNTRY', 'NL', 'Netherlands (+31)',     15, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

-- Indian States / Union Territories
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('STATE', 'AP',  'Andhra Pradesh',       1,  TRUE),
  ('STATE', 'AR',  'Arunachal Pradesh',    2,  TRUE),
  ('STATE', 'AS',  'Assam',               3,  TRUE),
  ('STATE', 'BR',  'Bihar',               4,  TRUE),
  ('STATE', 'CG',  'Chhattisgarh',        5,  TRUE),
  ('STATE', 'GA',  'Goa',                 6,  TRUE),
  ('STATE', 'GJ',  'Gujarat',             7,  TRUE),
  ('STATE', 'HR',  'Haryana',             8,  TRUE),
  ('STATE', 'HP',  'Himachal Pradesh',    9,  TRUE),
  ('STATE', 'JH',  'Jharkhand',           10, TRUE),
  ('STATE', 'KA',  'Karnataka',           11, TRUE),
  ('STATE', 'KL',  'Kerala',              12, TRUE),
  ('STATE', 'MP',  'Madhya Pradesh',      13, TRUE),
  ('STATE', 'MH',  'Maharashtra',         14, TRUE),
  ('STATE', 'MN',  'Manipur',             15, TRUE),
  ('STATE', 'ML',  'Meghalaya',           16, TRUE),
  ('STATE', 'MZ',  'Mizoram',             17, TRUE),
  ('STATE', 'NGA', 'Nagaland',            18, TRUE),
  ('STATE', 'OD',  'Odisha',              19, TRUE),
  ('STATE', 'PB',  'Punjab',              20, TRUE),
  ('STATE', 'RJ',  'Rajasthan',           21, TRUE),
  ('STATE', 'SK',  'Sikkim',              22, TRUE),
  ('STATE', 'TN',  'Tamil Nadu',          23, TRUE),
  ('STATE', 'TS',  'Telangana',           24, TRUE),
  ('STATE', 'TR',  'Tripura',             25, TRUE),
  ('STATE', 'UP',  'Uttar Pradesh',       26, TRUE),
  ('STATE', 'UT',  'Uttarakhand',         27, TRUE),
  ('STATE', 'WB',  'West Bengal',         28, TRUE),
  ('STATE', 'AN',  'Andaman & Nicobar',   29, TRUE),
  ('STATE', 'CHD', 'Chandigarh',          30, TRUE),
  ('STATE', 'DL',  'Delhi',               31, TRUE),
  ('STATE', 'JK',  'Jammu & Kashmir',     32, TRUE),
  ('STATE', 'LA',  'Ladakh',              33, TRUE),
  ('STATE', 'LD',  'Lakshadweep',         34, TRUE),
  ('STATE', 'PY',  'Puducherry',          35, TRUE),
  ('STATE', 'DDN', 'Dadra & Nagar Haveli & Daman & Diu', 36, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

COMMIT;
