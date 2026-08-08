-- ============================================================
-- 127_customer_price_header_detail.sql
-- Master Management → Customer Price Master (Metal + Stone)
--
-- Restructures both tabs from one flat row per price into a customer header
-- with many detail lines:
--
--   customer_price_metal_hdr  (one per customer)  → customer_price_metal_line
--   customer_price_stone_hdr  (one per customer)  → customer_price_stone_line
--
-- The existing flat tables become the line tables (renamed in place, so no data
-- is copied or lost), with a header row derived per customer. Status now lives
-- on the header — a customer's price sheet is activated or deactivated as a
-- whole — so the line-level is_active / deactivation columns go away.
--
-- sales_group_code also becomes nullable on metal lines: it is now defaulted
-- from the picked item's master record rather than typed, and item types
-- outside FG / Finding carry no sales group at all.
-- Run after 126_customer_price_metal_drop_karatage.sql
-- ============================================================

-- ── 1. Metal header ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_price_metal_hdr (
  id                  SERIAL PRIMARY KEY,
  customer_id         INTEGER      NOT NULL UNIQUE REFERENCES customer_master(id),
  remarks             VARCHAR(500),
  is_active           BOOLEAN   DEFAULT TRUE,
  deactivation_reason VARCHAR(500),
  deactivated_at      TIMESTAMP,
  created_by          INTEGER,
  updated_by          INTEGER,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- One header per customer that already has prices. A customer whose rows were
-- all deactivated keeps that state; any active row makes the sheet active.
INSERT INTO customer_price_metal_hdr (customer_id, is_active, created_by, created_at, updated_at)
SELECT customer_id,
       COALESCE(bool_or(is_active), TRUE),
       MIN(created_by),
       MIN(created_at),
       MAX(updated_at)
FROM   customer_price_master_metal
GROUP  BY customer_id
ON CONFLICT (customer_id) DO NOTHING;

-- ── 2. Metal lines (the old flat table, renamed) ─────────────
ALTER TABLE customer_price_master_metal RENAME TO customer_price_metal_line;
ALTER TABLE customer_price_metal_line RENAME CONSTRAINT customer_price_master_metal_pkey TO customer_price_metal_line_pkey;

ALTER TABLE customer_price_metal_line
  ADD COLUMN IF NOT EXISTS hdr_id  INTEGER,
  ADD COLUMN IF NOT EXISTS line_no INTEGER NOT NULL DEFAULT 1;

UPDATE customer_price_metal_line l
SET    hdr_id = h.id
FROM   customer_price_metal_hdr h
WHERE  h.customer_id = l.customer_id;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY hdr_id ORDER BY id) AS rn
  FROM   customer_price_metal_line
)
UPDATE customer_price_metal_line l
SET    line_no = numbered.rn
FROM   numbered
WHERE  numbered.id = l.id;

ALTER TABLE customer_price_metal_line ALTER COLUMN hdr_id SET NOT NULL;
ALTER TABLE customer_price_metal_line
  ADD CONSTRAINT customer_price_metal_line_hdr_fkey
  FOREIGN KEY (hdr_id) REFERENCES customer_price_metal_hdr(id) ON DELETE CASCADE;

-- Customer and status are the header's business now.
ALTER TABLE customer_price_metal_line DROP CONSTRAINT IF EXISTS uq_cust_price_metal_cust_item_sku;
ALTER TABLE customer_price_metal_line DROP CONSTRAINT IF EXISTS customer_price_master_metal_customer_id_fkey;
ALTER TABLE customer_price_metal_line
  DROP COLUMN IF EXISTS customer_id,
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS deactivation_reason,
  DROP COLUMN IF EXISTS deactivated_at;

ALTER TABLE customer_price_metal_line ALTER COLUMN sales_group_code DROP NOT NULL;
ALTER TABLE customer_price_metal_line
  ADD CONSTRAINT uq_cust_price_metal_line_hdr_item_sku UNIQUE (hdr_id, itemtype, sku_code);

CREATE INDEX IF NOT EXISTS idx_cust_price_metal_line_hdr ON customer_price_metal_line(hdr_id);

-- ── 3. Stone header ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_price_stone_hdr (
  id                  SERIAL PRIMARY KEY,
  customer_id         INTEGER      NOT NULL UNIQUE REFERENCES customer_master(id),
  remarks             VARCHAR(500),
  is_active           BOOLEAN   DEFAULT TRUE,
  deactivation_reason VARCHAR(500),
  deactivated_at      TIMESTAMP,
  created_by          INTEGER,
  updated_by          INTEGER,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

INSERT INTO customer_price_stone_hdr (customer_id, is_active, created_by, created_at, updated_at)
SELECT customer_id,
       COALESCE(bool_or(is_active), TRUE),
       MIN(created_by),
       MIN(created_at),
       MAX(updated_at)
FROM   customer_price_master_stone
GROUP  BY customer_id
ON CONFLICT (customer_id) DO NOTHING;

-- ── 4. Stone lines (the old flat table, renamed) ─────────────
ALTER TABLE customer_price_master_stone RENAME TO customer_price_stone_line;
ALTER TABLE customer_price_stone_line RENAME CONSTRAINT customer_price_master_stone_pkey TO customer_price_stone_line_pkey;

ALTER TABLE customer_price_stone_line
  ADD COLUMN IF NOT EXISTS hdr_id  INTEGER,
  ADD COLUMN IF NOT EXISTS line_no INTEGER NOT NULL DEFAULT 1;

UPDATE customer_price_stone_line l
SET    hdr_id = h.id
FROM   customer_price_stone_hdr h
WHERE  h.customer_id = l.customer_id;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY hdr_id ORDER BY id) AS rn
  FROM   customer_price_stone_line
)
UPDATE customer_price_stone_line l
SET    line_no = numbered.rn
FROM   numbered
WHERE  numbered.id = l.id;

ALTER TABLE customer_price_stone_line ALTER COLUMN hdr_id SET NOT NULL;
ALTER TABLE customer_price_stone_line
  ADD CONSTRAINT customer_price_stone_line_hdr_fkey
  FOREIGN KEY (hdr_id) REFERENCES customer_price_stone_hdr(id) ON DELETE CASCADE;

ALTER TABLE customer_price_stone_line DROP CONSTRAINT IF EXISTS uq_cust_price_stone_cust_name_code;
ALTER TABLE customer_price_stone_line DROP CONSTRAINT IF EXISTS customer_price_master_stone_customer_id_fkey;
ALTER TABLE customer_price_stone_line
  DROP COLUMN IF EXISTS customer_id,
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS deactivation_reason,
  DROP COLUMN IF EXISTS deactivated_at;

ALTER TABLE customer_price_stone_line
  ADD CONSTRAINT uq_cust_price_stone_line_hdr_name_code UNIQUE (hdr_id, stone_name, stone_code);

CREATE INDEX IF NOT EXISTS idx_cust_price_stone_line_hdr ON customer_price_stone_line(hdr_id);

-- ── 5. Retire the dead flat-table query templates ────────────
-- project_config still carried cust_price_* SQL from script 106 that nothing
-- calls (both tabs run through Prisma) and that names tables which no longer
-- exist. Leaving broken SQL behind is a trap for the next person who greps
-- project_config for a customer-price query.
DELETE FROM project_config
WHERE key_code LIKE 'cust_price_metal_%' OR key_code LIKE 'cust_price_stone_%';
