-- ══════════════════════════════════════════════════════════════
-- 20260805000001_stock_ledger
--
--   1. stock_ledger  — append-only movement log (source of truth)
--   2. stock_balance — running position per sub-inv + SKU + UID,
--                      kept current by stock.service.ts in the same
--                      transaction as every ledger insert
--
-- Nothing posts here yet on its own: Metal Receipt approval / cancel
-- (workflow.service.ts, metalReceipt.controller.ts) call
-- stock.service.ts -> postStockMovement() as of this same change, which is
-- the only writer these tables are meant to have. A future BOM issue /
-- Sales dispatch / PO receipt integration posts through the same helper
-- rather than writing either table directly.
--
-- Run after 20260804000001_metal_receipt
-- ══════════════════════════════════════════════════════════════

-- ── 1. Ledger ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_ledger (
    id                   BIGSERIAL PRIMARY KEY,
    txn_date             TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- RECEIPT | ISSUE | REVERSAL | ADJUSTMENT | TRANSFER_IN | TRANSFER_OUT
    txn_type             VARCHAR(20)  NOT NULL,

    -- module_code this movement was posted from, so new sources need no
    -- schema change. source_id is that module's own record id (e.g.
    -- metal_receipt.id) — no FK, since source_module varies what it points at.
    source_module        VARCHAR(50)  NOT NULL,
    source_id            INTEGER      NOT NULL,

    -- Set on a REVERSAL row: the ledger.id of the RECEIPT it backs out.
    reverses_ledger_id   BIGINT REFERENCES stock_ledger(id),

    inv_org_code         VARCHAR(50),
    sub_inv_code         VARCHAR(100) NOT NULL,

    -- METAL today; FG / FINDING / STONE / COMPONENT once those modules post.
    item_type            VARCHAR(20)  NOT NULL,
    item_id              INTEGER,
    sku_code             VARCHAR(300) NOT NULL,
    uid                  VARCHAR(100),
    purity               VARCHAR(50),

    -- Signed: +in, -out. Grams for METAL today.
    quantity              NUMERIC(14,4) NOT NULL,
    -- Signed fine-metal content of quantity. NULL where purity does not apply.
    pure_quantity          NUMERIC(14,4),

    remarks               VARCHAR(500),
    created_by             INTEGER,
    created_at             TIMESTAMP DEFAULT NOW(),

    CONSTRAINT chk_sl_txn_type CHECK (txn_type IN
        ('RECEIPT', 'ISSUE', 'REVERSAL', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT'))
);

CREATE INDEX IF NOT EXISTS idx_stock_ledger_position ON stock_ledger(sub_inv_code, sku_code, uid);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_source   ON stock_ledger(source_module, source_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_date     ON stock_ledger(txn_date DESC);

-- ── 2. Balance ────────────────────────────────────────────────
-- uid is NOT NULL (default '') though stock_ledger.uid is nullable: untagged
-- lots of the same SKU at the same sub-inventory pool into one balance row,
-- and Postgres treats every NULL as distinct for uniqueness, which would give
-- each untagged receipt its own row instead of accumulating.
CREATE TABLE IF NOT EXISTS stock_balance (
    id             SERIAL PRIMARY KEY,
    inv_org_code   VARCHAR(50),
    sub_inv_code   VARCHAR(100) NOT NULL,
    item_type      VARCHAR(20)  NOT NULL,
    item_id        INTEGER,
    sku_code       VARCHAR(300) NOT NULL,
    uid            VARCHAR(100) NOT NULL DEFAULT '',
    purity         VARCHAR(50),
    quantity       NUMERIC(14,4) NOT NULL DEFAULT 0,
    pure_quantity  NUMERIC(14,4) DEFAULT 0,
    last_ledger_id BIGINT,
    updated_at     TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_stock_balance_position UNIQUE (sub_inv_code, sku_code, uid)
);

CREATE INDEX IF NOT EXISTS idx_stock_balance_sku ON stock_balance(sku_code);
