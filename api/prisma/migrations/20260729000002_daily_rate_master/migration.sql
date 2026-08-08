-- ============================================================
-- 128_daily_rate_master.sql
-- Master Management → Daily Rate
--
-- The day's metal rates, one sheet per date:
--
--   daily_rate_hdr  (one per rate_date)  → daily_rate_line  (one per metal+purity)
--   daily_rate_config                     (single row, id = 1)
--
-- Rates are ALWAYS ₹ per gram. There is deliberately no UOM column: a rate
-- master whose unit varies per row is the kind of thing that silently prices an
-- order 10× wrong, so the unit is fixed by the schema instead of by data.
--
-- A sheet reaches the table one of three ways, recorded in hdr.update_mode:
--   MANUAL     — typed on the Daily Rate screen
--   AUTO       — pulled from the configured rate feed
--   CARRY_FWD  — copied forward from the previous sheet because the feed is off
--                or its last attempt failed
--
-- Sales Order percentage pricing strikes against the sheet line named by
-- daily_rate_config.pricing_metal_type / pricing_purity — replacing the
-- GOLD_RATE constant that used to live in salesOrder.controller.ts.
-- Run after 127_customer_price_header_detail.sql
-- ============================================================

-- ── 1. Rate sheet header ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_rate_hdr (
  id                  SERIAL PRIMARY KEY,
  rate_date           DATE         NOT NULL UNIQUE,
  update_mode         VARCHAR(20)  NOT NULL DEFAULT 'MANUAL',
  -- Where the numbers came from: a provider name, 'Manual entry', or
  -- 'Carried forward from <date>'. Free text so a new source needs no DDL.
  source              VARCHAR(200),
  currency_code       VARCHAR(10)  DEFAULT 'INR',
  remarks             VARCHAR(500),
  is_active           BOOLEAN   DEFAULT TRUE,
  deactivation_reason VARCHAR(500),
  deactivated_at      TIMESTAMP,
  created_by          INTEGER,
  updated_by          INTEGER,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_daily_rate_update_mode
    CHECK (update_mode IN ('MANUAL', 'AUTO', 'CARRY_FWD'))
);

CREATE INDEX IF NOT EXISTS idx_daily_rate_hdr_date ON daily_rate_hdr(rate_date DESC);

-- ── 2. Rate lines ────────────────────────────────────────────
-- metal_type and purity are master_lookup codes (METAL_TYPE / PURITY), the same
-- pair Metal Master keys its rows on.
CREATE TABLE IF NOT EXISTS daily_rate_line (
  id            SERIAL PRIMARY KEY,
  hdr_id        INTEGER       NOT NULL REFERENCES daily_rate_hdr(id) ON DELETE CASCADE,
  line_no       INTEGER       NOT NULL DEFAULT 1,
  metal_type    VARCHAR(50)   NOT NULL,
  purity        VARCHAR(50)   NOT NULL,
  rate_per_gram NUMERIC(18,4) NOT NULL DEFAULT 0,
  -- Same line on the previous sheet, copied in at save time so the movement
  -- chips on the grid and the dashboard need no self-join at read time.
  prev_rate     NUMERIC(18,4),
  change_pct    NUMERIC(9,4),
  remarks       VARCHAR(500),
  CONSTRAINT uq_daily_rate_line_hdr_metal UNIQUE (hdr_id, metal_type, purity),
  CONSTRAINT chk_daily_rate_line_non_negative CHECK (rate_per_gram >= 0)
);

CREATE INDEX IF NOT EXISTS idx_daily_rate_line_hdr   ON daily_rate_line(hdr_id);
CREATE INDEX IF NOT EXISTS idx_daily_rate_line_metal ON daily_rate_line(metal_type, purity);

-- ── 3. Auto-update configuration (single row) ────────────────
CREATE TABLE IF NOT EXISTS daily_rate_config (
  id                 INTEGER PRIMARY KEY DEFAULT 1,
  auto_enabled       BOOLEAN       DEFAULT FALSE,
  provider_name      VARCHAR(100),
  provider_url       VARCHAR(500),
  -- Sent as a request header when set; the value is never read back to the
  -- browser (the controller masks it), only overwritten.
  auth_header_name   VARCHAR(100),
  auth_header_value  VARCHAR(500),
  -- HH:MM on the database clock. The scheduler compares against NOW() in SQL
  -- rather than a JS Date so a server/DB timezone gap can't shift the run.
  run_at             VARCHAR(5)    DEFAULT '09:00',
  -- Applied to every fetched rate, e.g. 1.5 to add the dealer premium.
  markup_pct         NUMERIC(9,4)  DEFAULT 0,
  -- Copy the last sheet forward when the feed is off or its fetch failed, so a
  -- Sales Order raised on a holiday still has a rate to price against.
  carry_forward      BOOLEAN       DEFAULT TRUE,
  -- Off by default: a hand-corrected sheet outranks the feed.
  overwrite_manual   BOOLEAN       DEFAULT FALSE,
  -- Which line Sales Order percentage pricing multiplies against.
  pricing_metal_type VARCHAR(50)   DEFAULT 'GO',
  pricing_purity     VARCHAR(50)   DEFAULT '916',
  -- [{ metal_type, purity, json_path, multiplier }] — how to read one rate out
  -- of the provider's JSON response.
  field_map          JSONB         DEFAULT '[]'::jsonb,
  last_run_at        TIMESTAMP,
  last_run_status    VARCHAR(20),
  last_run_message   VARCHAR(1000),
  updated_by         INTEGER,
  updated_at         TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_daily_rate_config_singleton CHECK (id = 1),
  CONSTRAINT chk_daily_rate_config_run_at    CHECK (run_at ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);

INSERT INTO daily_rate_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── 4. Seed the rate Sales Order pricing needs ───────────────
-- Percentage-based customer prices used to multiply a GOLD_RATE = 147500
-- constant hardcoded in salesOrder.controller.ts. That constant is gone; this
-- row takes over so pricing keeps working from the first request after deploy.
-- 147500 read as ₹ per 10 g, which is the only reading that makes it a
-- plausible gold rate — hence 14750 per gram here.
INSERT INTO daily_rate_hdr (rate_date, update_mode, source, currency_code, remarks, is_active)
VALUES (
  CURRENT_DATE,
  'MANUAL',
  'Migration seed',
  'INR',
  'Seeded from the retired GOLD_RATE pricing constant (147500 per 10 g). Replace with the actual market rate.',
  TRUE
)
ON CONFLICT (rate_date) DO NOTHING;

INSERT INTO daily_rate_line (hdr_id, line_no, metal_type, purity, rate_per_gram, remarks)
SELECT h.id, 1, 'GO', '916', 14750.0000, 'Seeded — verify against today''s market rate'
FROM   daily_rate_hdr h
WHERE  h.rate_date = CURRENT_DATE
ON CONFLICT (hdr_id, metal_type, purity) DO NOTHING;

-- ── 5. Menu entry ────────────────────────────────────────────
-- Slot 12 under Master Management (parent 2) — after Customer Price Master (11)
-- and before Capacity Master (13), keeping rate-related masters together.
INSERT INTO menu_master (parent_id, menu_code, menu_name, menu_url, menu_icon, menu_order, menu_level, is_active)
VALUES (2, 'MM_DAILY_RATE', 'Daily Rate', '/master-mgmt/daily-rate', 'CurrencyRupeeIcon', 12, 2, TRUE)
ON CONFLICT (menu_code) DO NOTHING;

-- Mirror Customer Price Master's grants so roles that already maintain pricing
-- can maintain the rate it is struck against, without a trip to Permissions.
INSERT INTO role_menu_mapping (role_id, menu_id, can_view, can_create, can_update, can_delete, can_print, can_export)
SELECT src.role_id, mm.id, src.can_view, src.can_create, src.can_update, src.can_delete, src.can_print, src.can_export
FROM   role_menu_mapping src
JOIN   menu_master mm ON mm.menu_code = 'MM_DAILY_RATE'
WHERE  src.menu_id = (SELECT id FROM menu_master WHERE menu_code = 'MM_CUST_PRICE')
ON CONFLICT (role_id, menu_id) DO NOTHING;
