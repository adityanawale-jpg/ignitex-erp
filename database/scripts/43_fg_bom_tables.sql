-- ============================================================
-- 43_fg_bom_tables.sql
-- FG BOM: header + detail tables, LOV seeds, role permissions
-- Run after 42_menu_bom_update.sql
-- ============================================================

BEGIN;

-- ── 1. BOM_FG  (one header per variant) ─────────────────────────
CREATE TABLE IF NOT EXISTS bom_fg (
  id               SERIAL        PRIMARY KEY,
  variant_id       INT           NOT NULL REFERENCES item_variant(id),
  bom_version      VARCHAR(20)   NOT NULL DEFAULT '1.0',
  bom_status       VARCHAR(50)   NOT NULL DEFAULT 'DRAFT',
    -- DRAFT | PENDING_APPROVAL | ACTIVE | REJECTED
  gross_weight     DECIMAL(12,6) DEFAULT 0,
  net_weight       DECIMAL(12,6) DEFAULT 0,
  min_weight       DECIMAL(12,6),
  max_weight       DECIMAL(12,6),
  stone_cts        DECIMAL(12,6) DEFAULT 0,
  stone_gms        DECIMAL(12,6) DEFAULT 0,
  effective_from   DATE,
  effective_to     DATE,
  remarks          TEXT,
  -- Workflow audit
  submitted_by     INT,
  submitted_at     TIMESTAMP,
  approved_by      INT,
  approved_at      TIMESTAMP,
  rejected_by      INT,
  rejected_at      TIMESTAMP,
  rejection_reason TEXT,
  -- Standard audit
  is_active        BOOLEAN       DEFAULT TRUE,
  created_by       INT           NOT NULL,
  updated_by       INT,
  created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bom_fg_variant ON bom_fg(variant_id);
CREATE INDEX IF NOT EXISTS idx_bom_fg_status  ON bom_fg(bom_status);

-- ── 2. BOM_FG_DETAIL  (many lines per header) ────────────────────
CREATE TABLE IF NOT EXISTS bom_fg_detail (
  id            SERIAL        PRIMARY KEY,
  bom_id        INT           NOT NULL REFERENCES bom_fg(id) ON DELETE CASCADE,
  bom_type      VARCHAR(50)   NOT NULL,
    -- SFG_BOM | METAL_BOM | STONE_BOM
  seq_no        INT           NOT NULL DEFAULT 1,
  item_id       INT           NOT NULL,
    -- item_variant.id (SFG_BOM) | component_item_master.id (METAL_BOM) | stone_item_master.id (STONE_BOM)
  item_code     VARCHAR(300),
  item_name     VARCHAR(300),
  item_quantity DECIMAL(12,4) DEFAULT 1,
  uom1_code     VARCHAR(50),
  item_weight   DECIMAL(12,6),
  uom2_code     VARCHAR(50),
  purity_code   VARCHAR(50),
  pure_weight   DECIMAL(12,6),   -- item_weight * purity fraction
  weight_gms    DECIMAL(12,6),   -- stone only: item_weight (ct) / 5
  remarks       TEXT,
  is_active     BOOLEAN       DEFAULT TRUE,
  created_by    INT,
  updated_by    INT,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bom_fg_detail_bom  ON bom_fg_detail(bom_id);
CREATE INDEX IF NOT EXISTS idx_bom_fg_detail_type ON bom_fg_detail(bom_type);

-- ── 3. LOV: Purity ───────────────────────────────────────────────
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('PURITY', '999', '99.9% (24KT Pure)',    1, TRUE),
  ('PURITY', '916', '91.6% (22KT)',          2, TRUE),
  ('PURITY', '750', '75.0% (18KT)',          3, TRUE),
  ('PURITY', '585', '58.5% (14KT)',          4, TRUE),
  ('PURITY', '375', '37.5% (9KT)',           5, TRUE),
  ('PURITY', '925', '92.5% (Silver)',        6, TRUE),
  ('PURITY', '950', '95.0% (Platinum)',      7, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

-- ── 4. LOV: FG / SFG sku_type values ────────────────────────────
INSERT INTO master_lookup (lookup_type, lookup_code, lookup_name, display_order, is_active) VALUES
  ('SKU_TYPE', 'FG',  'Finished Goods', 4, TRUE),
  ('SKU_TYPE', 'SFG', 'Semi-Finished',  5, TRUE)
ON CONFLICT (lookup_type, lookup_code) DO NOTHING;

-- ── 5. Role permissions for FG BOM menu (id = 27) ───────────────
-- Admin (role_id=1) already set in 42_menu_bom_update.sql
-- Re-run is safe due to ON CONFLICT DO NOTHING

-- Grant all roles that have view on Master Management access to FG BOM
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete)
SELECT DISTINCT rmm.role_id, 27, TRUE, TRUE, TRUE, FALSE
FROM role_menu_mapping rmm
WHERE rmm.menu_id = 2   -- Master Management parent
  AND rmm.can_view = TRUE
ON CONFLICT (role_id, menu_id) DO NOTHING;

COMMIT;
