import { Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { AUDIT_MODULE } from '../constants/auditModules';
import { BOM_STATUS, WF_ACTION } from '../constants/bomWorkflow';
import { ORDER_STATUS, ORDER_STATUSES, ORDER_EDITABLE, ORDER_RECORD_TYPE } from '../constants/orderWorkflow';
import { runWorkflowAction } from '../services/workflow.service';
import { resolvePricingRate, getDailyRateConfig } from '../services/dailyRate.service';

const SORT_COLS: Record<string, string> = {
  order_no:              'order_no',
  customer_company_name: 'customer_company_name',
  buss_unit_id:          'buss_unit_id',
  order_type:            'order_type',
  order_date:            'order_date',
  customer_po:           'customer_po',
  currency_code:         'currency_code',
  total_amount:          'total_amount',
  order_status:          'order_status',
  created_at:            'created_at',
};

const STATUSES = ORDER_STATUSES;

const str = (v: unknown, max = 500): string | null => {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, max) : null;
};
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const dateOrNull = (v: unknown): Date | null => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const d = new Date(s.slice(0, 10));
  return isNaN(d.getTime()) ? null : d;
};

// A metal rate per gram, or null for an empty cell. A negative or unparseable
// figure is treated as "no rate" rather than as zero, which would silently
// price the metal out of a per-weight line.
const rateOrNull = (v: unknown): number | null => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

interface LineInput {
  item_name:           string | null;
  customer_item:       string | null;
  sales_group:         string | null;
  item_qty:            number;
  item_uom:            string | null;
  gold_rate:           number | null;
  item_price:          number;
  item_amount:         number;
  item_status:         string;
  inventory_org:       string | null;
  supply_subinventory: string | null;
  pay_term:            string | null;
  requested_date:      Date | null;
  line_no:             number;
}

// Validates header + lines from the request body. Returns error string or parsed payload.
// Always parses to a DRAFT: submitting is the workflow engine's job, so a
// "Save & Submit" writes the draft first and then runs the SUBMIT action.
function parseOrderBody(body: Record<string, unknown>):
  { error: string } | { header: Record<string, unknown>; lines: LineInput[]; totals: { qty: number; amount: number } } {

  const buss_unit_id = str(body.buss_unit_id, 50);
  const customer_id  = parseInt(String(body.customer_id ?? ''), 10);
  const order_date   = dateOrNull(body.order_date);
  // No fallback type any more — it decides which master feeds the line items,
  // so the caller has to say which one.
  const order_type   = str(body.order_type, 50);

  if (!buss_unit_id)          return { error: 'Business Unit is required' };
  if (!customer_id)           return { error: 'Customer is required' };
  if (!order_date)            return { error: 'Order Date is required' };
  if (!order_type)            return { error: 'Order Type is required' };

  const rawLines = Array.isArray(body.lines) ? body.lines as Record<string, unknown>[] : [];
  const lines: LineInput[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i];
    const item_name     = str(l.item_name, 300);
    // Carries the client variant's code and name together, so it is sized for
    // both rather than for customer_variant_code alone.
    const customer_item = str(l.customer_item, 320);
    const item_qty      = Math.trunc(num(l.item_qty));
    const item_price    = num(l.item_price);

    // silently drop fully-empty rows
    if (!item_name && !customer_item && !item_qty && !item_price) continue;

    // Item and a positive Qty are required on drafts too, not just on submit —
    // the Sales Order screen enforces the same rules on Save Draft, and a
    // half-filled line is no more useful persisted as a draft. Customer Item is
    // not checked: it is derived from the picked Item and stays empty for a
    // variant with no client row on file.
    if (!item_name)     return { error: `Line ${i + 1}: Item is required` };
    if (item_qty <= 0)  return { error: `Line ${i + 1}: Qty must be greater than 0` };
    if (item_price < 0) return { error: `Line ${i + 1}: Price cannot be negative` };

    lines.push({
      item_name,
      customer_item,
      sales_group:         str(l.sales_group, 100),
      item_qty,
      item_uom:            str(l.item_uom, 20),
      // The rate the line was priced against, kept because the row stores the
      // resulting price and not its working — a reopened order has to explain
      // its own price rather than today's.
      gold_rate:           rateOrNull(l.gold_rate),
      item_price,
      item_amount:         Math.round(item_qty * item_price * 100) / 100,
      item_status:         ORDER_STATUS.DRAFT,
      inventory_org:       str(l.inventory_org, 50),
      supply_subinventory: str(l.supply_subinventory, 100),
      // PAYMENT_TERM lookup code, defaulted from the customer on the screen —
      // no server-side fallback, or an unset term would save as a stale literal.
      pay_term:            str(l.pay_term, 50),
      requested_date:      dateOrNull(l.requested_date),
      line_no:             lines.length + 1,
    });
  }

  if (lines.length === 0) return { error: 'At least one order line is required' };

  const totals = {
    qty:    lines.reduce((s, l) => s + l.item_qty, 0),
    amount: Math.round(lines.reduce((s, l) => s + l.item_amount, 0) * 100) / 100,
  };

  const header = {
    buss_unit_id,
    customer_id,
    bill_to_address: str(body.bill_to_address, 2000),
    ship_to_address: str(body.ship_to_address, 2000),
    customer_po:     str(body.customer_po, 100),
    order_type,
    order_date,
    currency_code:   str(body.currency_code, 10) || 'INR',
    sales_credit:    num(body.sales_credit),
    order_status:    ORDER_STATUS.DRAFT,
    total_qty:       totals.qty,
    total_amount:    totals.amount,
  };

  return { header, lines, totals };
}

// ── GET /sales-orders ────────────────────────────────────────────
export const getSalesOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit   = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset  = (page - 1) * limit;
    const search  = ((req.query.search as string) || '').trim();
    const status  = ((req.query.status as string) || 'all').toUpperCase();
    const sortKey = SORT_COLS[req.query.sort_by as string] || 'created_at';
    const sortDir = req.query.sort_dir === 'asc' ? 'asc' : 'desc';

    let cfObj: Record<string, string> = {};
    try {
      if (req.query.col_filters) cfObj = JSON.parse(req.query.col_filters as string);
    } catch { /* ignore */ }

    const AND: Prisma.sales_order_hdrWhereInput[] = [];
    if ((STATUSES as readonly string[]).includes(status)) AND.push({ order_status: status });

    if (search) {
      AND.push({
        OR: [
          { order_no:    { contains: search, mode: 'insensitive' } },
          { customer_po: { contains: search, mode: 'insensitive' } },
          { customer_master: { customer_company_name: { contains: search, mode: 'insensitive' } } },
          { customer_master: { customer_code:         { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    const directCols = ['order_no', 'buss_unit_id', 'order_type', 'customer_po', 'currency_code', 'order_status'] as const;
    for (const col of directCols) {
      const val = (cfObj[col] || '').trim();
      if (val) AND.push({ [col]: { contains: val, mode: 'insensitive' } });
    }
    const custFilter = (cfObj.customer_company_name || '').trim();
    if (custFilter) AND.push({ customer_master: { customer_company_name: { contains: custFilter, mode: 'insensitive' } } });

    const where: Prisma.sales_order_hdrWhereInput = AND.length ? { AND } : {};

    const orderBy: Prisma.sales_order_hdrOrderByWithRelationInput =
      sortKey === 'customer_company_name'
        ? { customer_master: { customer_company_name: sortDir } }
        : { [sortKey]: sortDir };

    const [total, rows] = await Promise.all([
      prisma.sales_order_hdr.count({ where }),
      prisma.sales_order_hdr.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        select: {
          id: true, order_no: true, buss_unit_id: true, customer_id: true,
          customer_po: true, order_type: true, order_date: true, currency_code: true,
          sales_credit: true, order_status: true,
          total_qty: true, total_amount: true, cancel_reason: true, cancelled_at: true,
          created_at: true, updated_at: true,
          customer_master: { select: { customer_code: true, customer_company_name: true } },
          _count: { select: { sales_order_lines: true } },
        },
      }),
    ]);

    const dataRows = rows.map(({ customer_master, _count, ...rest }) => ({
      ...rest,
      customer_code:         customer_master.customer_code,
      customer_company_name: customer_master.customer_company_name,
      line_count:            _count.sales_order_lines,
    }));

    const total_pages = Math.ceil(total / limit) || 1;
    sendSuccess(res, dataRows, 'Sales orders fetched', 200, { total, total_pages, page, limit });
  } catch (error) {
    sendError(res, 'Failed to fetch sales orders', 500, (error as Error).message);
  }
};

// ── GET /sales-orders/stats ──────────────────────────────────────
export const getSalesOrderStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [draft, pending, approved, rejected, cancelled] = await Promise.all([
      prisma.sales_order_hdr.count({ where: { order_status: ORDER_STATUS.DRAFT } }),
      prisma.sales_order_hdr.count({ where: { order_status: ORDER_STATUS.PENDING_APPROVAL } }),
      prisma.sales_order_hdr.count({ where: { order_status: ORDER_STATUS.APPROVED } }),
      prisma.sales_order_hdr.count({ where: { order_status: ORDER_STATUS.REJECTED } }),
      prisma.sales_order_hdr.count({ where: { order_status: ORDER_STATUS.CANCELLED } }),
    ]);
    sendSuccess(res, { draft, pending, approved, rejected, cancelled }, 'Stats fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch stats', 500, (error as Error).message);
  }
};

// ── GET /sales-orders/inventory-structure/:bu ────────────────────
// Inventory Org / Subinventory on an order line are the Inventory Structure
// rows filed under the order's own Business Unit — one row per
// (BU, Inventory Org, Subinventory) triple. The screen splits the rows into the
// two dropdowns itself, so both cells stay consistent with the same list and a
// Subinventory can be narrowed to the Inventory Org picked on that line.
export const getSalesOrderInventoryStructure = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bu = String(req.params.bu || '').trim();
    if (!bu) { sendValidationError(res, 'Business Unit is required'); return; }

    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT ist.inv_org_code,
             COALESCE(org.lookup_name, ist.inv_org_code) AS inv_org_name,
             ist.sub_inv_code,
             ist.sub_inv_name
      FROM   inventory_structure ist
      LEFT   JOIN master_lookup org
             ON org.lookup_type = 'INV_ORG' AND org.lookup_code = ist.inv_org_code
      WHERE  ist.inv_bu_code = ${bu} AND ist.is_active = TRUE
      ORDER  BY inv_org_name, ist.sub_inv_name
    `);

    sendSuccess(res, rows, 'Inventory structure fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch inventory structure', 500, (error as Error).message);
  }
};

// ── GET /sales-orders/lov/:source — SKU picker for order lines ───
// source 'fg'  → FG Master variants      (order types STK / CUS)
// source 'fin' → Finding Master variants (order type FIO)
//
// Each row carries the variant's client-variant code, its Sales Group and its
// Lead Time, so the caller can fill Customer Item, Sales Group and Requested
// Date without a second round trip. A variant can have one client row per
// customer, so the LATERAL prefers the row matching the order's customer and
// otherwise falls back to the earliest one.
export const getSalesOrderItemLOV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const source   = String(req.params.source || '').toLowerCase();
    const search   = ((req.query.search as string) || '').trim();
    const customer = ((req.query.customer as string) || '').trim();
    // '%' alone means "show all" — same convention as the BOM LOVs
    const sp = (search && search !== '%') ? `%${search}%` : '%%';

    if (source !== 'fg' && source !== 'fin') {
      sendValidationError(res, `Unknown LOV source: ${source}`);
      return;
    }

    const rows = source === 'fg'
      ? await prisma.$queryRaw(Prisma.sql`
          SELECT iv.id,
                 iv.sku_code AS code,
                 iv.sku_code AS name,
                 iv.karat_color, iv.weight_band, iv.size, iv.lead_time,
                 im.collection_name,
                 NULLIF(COALESCE(NULLIF(iv.group_sales, ''), im.group_sales), '') AS group_sales,
                 c.customer_name,
                 c.customer_variant_code,
                 c.customer_variant_name
          FROM   fg_item_variant iv
          JOIN   fg_item_master  im ON im.id = iv.item_id
          LEFT   JOIN LATERAL (
                   SELECT vc.customer_name, vc.customer_variant_code, vc.customer_variant_name
                   FROM   fg_item_variant_client vc
                   WHERE  vc.variant_id = iv.id AND vc.is_active = TRUE
                   ORDER  BY (LOWER(COALESCE(vc.customer_name, '')) = LOWER(${customer})) DESC, vc.id
                   LIMIT  1
                 ) c ON TRUE
          WHERE  iv.is_active = TRUE AND im.is_active = TRUE
            AND (iv.sku_code ILIKE ${sp}
              OR COALESCE(c.customer_variant_code, '') ILIKE ${sp})
          ORDER  BY iv.sku_code
          LIMIT  60
        `)
      : await prisma.$queryRaw(Prisma.sql`
          SELECT iv.id,
                 iv.sku_code AS code,
                 iv.sku_code AS name,
                 iv.karat_color, iv.weight_band, iv.size, iv.lead_time,
                 im.collection_name,
                 NULLIF(COALESCE(NULLIF(iv.group_sales, ''), im.group_sales), '') AS group_sales,
                 c.customer_name,
                 c.customer_variant_code,
                 c.customer_variant_name
          FROM   fin_item_variant iv
          JOIN   fin_item_master  im ON im.id = iv.item_id
          LEFT   JOIN LATERAL (
                   SELECT vc.customer_name, vc.customer_variant_code, vc.customer_variant_name
                   FROM   fin_item_variant_client vc
                   WHERE  vc.variant_id = iv.id AND vc.is_active = TRUE
                   ORDER  BY (LOWER(COALESCE(vc.customer_name, '')) = LOWER(${customer})) DESC, vc.id
                   LIMIT  1
                 ) c ON TRUE
          WHERE  iv.is_active = TRUE AND im.is_active = TRUE
            AND (iv.sku_code ILIKE ${sp}
              OR COALESCE(c.customer_variant_code, '') ILIKE ${sp})
          ORDER  BY iv.sku_code
          LIMIT  60
        `);

    sendSuccess(res, rows, 'Item LOV fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch item LOV', 500, (error as Error).message);
  }
};

// ── Line pricing ─────────────────────────────────────────────────
// The metal rate percentage-based customer prices are struck against comes
// from the Daily Rate master — the sheet line named by
// daily_rate_config.pricing_metal_type / pricing_purity, taken from the most
// recent active sheet on or before today. This replaced a hardcoded
// GOLD_RATE = 147500 constant; see services/dailyRate.service.ts.
//
// The order line's own Gold Rate cell overrides that sheet when it carries a
// figure: a line may be struck at a negotiated rate. The override is passed
// back into this calculation rather than applied on the screen, so all four
// rate basis/type combinations stay in one place.

// Customer Price Master files FG SKUs under itemtype 'FG' and Finding SKUs under
// 'FINDING'; the order line's source master picks which of the two to read.
const PRICE_ITEMTYPE: Record<'fg' | 'fin', string> = { fg: 'FG', fin: 'FINDING' };

const round2 = (n: number) => Math.round(n * 100) / 100;

interface PriceLineRow {
  sku_code:             string;
  rate_basis:           string;
  rate_type:            string;
  rate_value:           Prisma.Decimal;
  uom:                  string;
  rhodium_amt:          Prisma.Decimal;
  tricolor_rhodium_amt: Prisma.Decimal;
  lobster_amt:          Prisma.Decimal;
  silky_rope_amt:       Prisma.Decimal;
  hallmark_amt:         Prisma.Decimal;
}

// ── GET /sales-orders/item-price ─────────────────────────────────
// Unit price for one order line, worked out from the customer's Metal price
// sheet and the item's own BOM net weight:
//
//   Per Weight + %      → (DAILY_RATE × rate% × NETWT) + add-ons
//   Per Pc     + %      → (DAILY_RATE × rate%)         + add-ons
//   Per Weight + Amount → (rate × NETWT)               + add-ons
//   Per Pc     + Amount → (rate × 1)                   + add-ons
//
// where add-ons are the sheet's Rhodium, Tricolour Rhodium, Lobster, Silky Rope
// and Hallmark amounts, NETWT is the ACTIVE BOM's net weight, and DAILY_RATE is
// the line's Gold Rate — the Daily Rate master's ₹/gram for the configured
// pricing metal, unless the caller passes a gold_rate of its own. A SKU with no
// ACTIVE BOM prices at net weight 0 rather than failing the lookup — the
// weight-based half simply drops out and the add-ons still apply.
//
// An AMOUNT price needs no metal rate at all, so a missing Daily Rate only
// blocks the percentage half; those lines come back with rate_missing set and
// no unit price, for the user to fill in by hand — or to price by typing a Gold
// Rate on the line.
//
// The whole breakdown is returned, not just the price, so the screen can show
// how the number was reached without a second round trip.
export const getSalesOrderItemPrice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const source      = String(req.query.source || '').toLowerCase();
    const sku_code    = String(req.query.sku_code || '').trim();
    const customer_id = parseInt(String(req.query.customer_id ?? ''), 10);
    // The line's own Gold Rate cell when it holds one; absent means "use the
    // Daily Rate master", which is also what clearing the cell asks for.
    const override    = rateOrNull(req.query.gold_rate);

    if (source !== 'fg' && source !== 'fin') { sendValidationError(res, `Unknown price source: ${source}`); return; }
    if (!sku_code)    { sendValidationError(res, 'SKU code is required'); return; }
    if (!customer_id) { sendValidationError(res, 'Customer is required'); return; }

    const itemtype = PRICE_ITEMTYPE[source];

    // Read for every line, not only the percentage ones: the Gold Rate cell
    // shows the day's rate whatever the price shape, and an amount-priced line
    // simply does not multiply by it.
    const daily     = await resolvePricingRate();
    const gold_rate = override ?? (daily ? daily.rate_per_gram : null);

    // Where the rate on this line came from, echoed back on every response so
    // the screen can fill the cell and name the sheet behind it.
    //
    // rate_overridden asks "is this line priced off something other than what
    // the master says today?" — not "did the caller pass a rate?". A saved line
    // sends its stored rate back on every reload, so testing for the parameter
    // alone would mark every reopened order as hand-edited; and a stored rate
    // that no longer matches the master is worth flagging even though nobody
    // typed it, because the line is priced off a rate that has since moved.
    const rateMeta = {
      gold_rate,
      rate_overridden: override !== null && (daily === null || override !== daily.rate_per_gram),
      // The master's own figure, kept alongside a departing rate so the
      // breakdown can say what the line differs from.
      master_rate: daily ? daily.rate_per_gram : null,
      rate_date:   daily ? daily.rate_date     : null,
      rate_metal:  daily ? daily.metal_type    : null,
      rate_purity: daily ? daily.purity        : null,
      rate_mode:   daily ? daily.update_mode   : null,
      rate_source: daily ? daily.source        : null,
    };

    // Net weight comes off the variant's ACTIVE BOM header — the same row the FG
    // BOM LOVs read. A variant with no ACTIVE BOM yields NULL, i.e. net weight 0.
    const wtRows = source === 'fg'
      ? await prisma.$queryRaw<{ net_weight: Prisma.Decimal | null }[]>(Prisma.sql`
          SELECT bf.net_weight
          FROM   fg_item_variant iv
          LEFT   JOIN LATERAL (
                   SELECT b.net_weight
                   FROM   bom_fg b
                   WHERE  b.variant_id = iv.id
                     AND  b.bom_status = ${BOM_STATUS.ACTIVE}
                     AND  b.is_active  = TRUE
                   ORDER  BY b.id DESC
                   LIMIT  1
                 ) bf ON TRUE
          WHERE  iv.sku_code = ${sku_code}
          LIMIT  1
        `)
      : await prisma.$queryRaw<{ net_weight: Prisma.Decimal | null }[]>(Prisma.sql`
          SELECT bf.net_weight
          FROM   fin_item_variant iv
          LEFT   JOIN LATERAL (
                   SELECT b.net_weight
                   FROM   bom_fin b
                   WHERE  b.variant_id = iv.id
                     AND  b.bom_status = ${BOM_STATUS.ACTIVE}
                     AND  b.is_active  = TRUE
                   ORDER  BY b.id DESC
                   LIMIT  1
                 ) bf ON TRUE
          WHERE  iv.sku_code = ${sku_code}
          LIMIT  1
        `);

    const variant_found = wtRows.length > 0;
    const has_bom       = variant_found && wtRows[0].net_weight !== null;
    const net_weight    = has_bom ? Number(wtRows[0].net_weight) : 0;

    // The sheet can price this exact SKU or carry a catch-all 'ALL' row for the
    // item type; the exact row wins when both exist.
    const priceRows = await prisma.$queryRaw<PriceLineRow[]>(Prisma.sql`
      SELECT l.sku_code, l.rate_basis, l.rate_type, l.rate_value, l.uom,
             l.rhodium_amt, l.tricolor_rhodium_amt, l.lobster_amt,
             l.silky_rope_amt, l.hallmark_amt
      FROM   customer_price_metal_line l
      JOIN   customer_price_metal_hdr  h ON h.id = l.hdr_id
      WHERE  h.customer_id = ${customer_id}
        AND  h.is_active   = TRUE
        AND  l.itemtype    = ${itemtype}
        AND  l.sku_code   IN (${sku_code}, 'ALL')
      ORDER  BY (l.sku_code = ${sku_code}) DESC, l.line_no
      LIMIT  1
    `);

    if (priceRows.length === 0) {
      sendSuccess(res, {
        sku_code, itemtype, price_found: false,
        variant_found, has_bom, net_weight,
        ...rateMeta,
        unit_price: null,
      }, 'No customer price on file for this item');
      return;
    }

    const p = priceRows[0];
    const rate_basis = p.rate_basis === 'PER_PC' ? 'PER_PC' : 'PER_GM';
    const rate_type  = p.rate_type  === 'PERCENTAGE' ? 'PERCENTAGE' : 'AMOUNT';
    const rate_value = Number(p.rate_value);

    // Only the percentage half needs a metal rate, so an AMOUNT price still
    // prices with no sheet on file and no Gold Rate typed on the line.
    if (rate_type === 'PERCENTAGE' && gold_rate === null) {
      const cfg = await getDailyRateConfig();
      sendSuccess(res, {
        sku_code, itemtype, price_found: true, matched_sku: p.sku_code,
        variant_found, has_bom, net_weight,
        rate_basis, rate_type, rate_value, uom: p.uom,
        ...rateMeta,
        rate_missing:       true,
        pricing_metal_type: cfg.pricing_metal_type,
        pricing_purity:     cfg.pricing_purity,
        unit_price: null,
      }, 'No Daily Rate on file for the configured pricing metal');
      return;
    }

    // Per Pc prices are struck for a single piece, so the weight factor is 1;
    // the line's own Qty multiplies the unit price further up the screen.
    const weight_factor = rate_basis === 'PER_GM' ? net_weight : 1;
    const base_rate     = rate_type === 'PERCENTAGE' ? gold_rate! * (rate_value / 100) : rate_value;
    const base_amount   = round2(base_rate * weight_factor);

    const addons = {
      rhodium_amt:          Number(p.rhodium_amt),
      tricolor_rhodium_amt: Number(p.tricolor_rhodium_amt),
      lobster_amt:          Number(p.lobster_amt),
      silky_rope_amt:       Number(p.silky_rope_amt),
      hallmark_amt:         Number(p.hallmark_amt),
    };
    const addons_total = round2(Object.values(addons).reduce((s, v) => s + v, 0));

    sendSuccess(res, {
      sku_code,
      itemtype,
      price_found:  true,
      // 'ALL' here tells the screen the price came from the item type's catch-all
      // row rather than a row naming this SKU.
      matched_sku:  p.sku_code,
      variant_found,
      has_bom,
      net_weight,
      rate_basis,
      rate_type,
      rate_value,
      uom:          p.uom,
      // The Gold Rate the line is priced against and which Daily Rate sheet it
      // came off, so the breakdown can say "Gold 916 · 29-Jul-2026" rather than
      // quoting a bare figure. Sent for an amount price too — the cell shows it
      // as the day's rate — but only a percentage price multiplies by it.
      ...rateMeta,
      rate_missing: false,
      base_rate:    round2(base_rate),
      weight_factor,
      base_amount,
      addons,
      addons_total,
      unit_price:   round2(base_amount + addons_total),
    }, 'Item price calculated');
  } catch (error) {
    sendError(res, 'Failed to calculate item price', 500, (error as Error).message);
  }
};

// ── GET /sales-orders/:id ────────────────────────────────────────
export const getSalesOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const order = await prisma.sales_order_hdr.findUnique({
      where: { id },
      include: {
        customer_master:   { select: { customer_code: true, customer_company_name: true, payment_terms: true } },
        sales_order_lines: { orderBy: { line_no: 'asc' } },
      },
    });
    if (!order) { sendError(res, 'Sales order not found', 404); return; }

    const { customer_master, sales_order_lines, ...header } = order;
    sendSuccess(res, {
      ...header,
      customer_code:          customer_master.customer_code,
      customer_company_name:  customer_master.customer_company_name,
      // Lets the screen default Pay Term on lines added to an existing draft
      // without re-fetching the customer.
      customer_payment_terms: customer_master.payment_terms,
      lines:                  sales_order_lines,
    }, 'Sales order fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch sales order', 500, (error as Error).message);
  }
};

// Runs the workflow's SUBMIT against a saved order and reports the status it
// landed on — PENDING_APPROVAL normally, or APPROVED when the workflow has Self
// Approval switched on. Failure is returned rather than thrown: a workflow that
// is missing or misconfigured must not cost the user the order they just typed.
async function startOrderWorkflow(
  id: number,
  userId: number,
): Promise<{ order_status: string } | { error: string }> {
  try {
    await runWorkflowAction({
      recordType: ORDER_RECORD_TYPE.SALES_ORDER,
      recordId:   id,
      action:     WF_ACTION.SUBMIT,
      userId,
    });
    const row = await prisma.sales_order_hdr.findUnique({ where: { id }, select: { order_status: true } });
    return { order_status: row?.order_status ?? ORDER_STATUS.PENDING_APPROVAL };
  } catch (error) {
    return { error: String((error as Error).message ?? error).replace('Error: ', '') };
  }
}

// ── POST /sales-orders  (action: draft | submit) ─────────────────
export const createSalesOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const submitting = body.action === 'submit';

    const parsed = parseOrderBody(body);
    if ('error' in parsed) { sendValidationError(res, parsed.error); return; }

    const created = await prisma.$transaction(async (tx) => {
      const hdr = await tx.sales_order_hdr.create({
        data: {
          ...(parsed.header as Prisma.sales_order_hdrUncheckedCreateInput),
          created_by: req.user?.id ?? null,
        },
        select: { id: true },
      });
      if (parsed.lines.length) {
        await tx.sales_order_lines.createMany({
          data: parsed.lines.map(l => ({ ...l, order_id: hdr.id })),
        });
      }
      return tx.sales_order_hdr.findUniqueOrThrow({
        where: { id: hdr.id },
        select: { id: true, order_no: true, order_status: true },
      });
    });

    // "Save & Submit" — the order exists as a draft first, then the workflow
    // takes it from there. A failure here leaves a usable draft rather than
    // losing the order, so it is reported without unwinding the save. The order
    // is audited either way: it was created regardless of how the submit went.
    let submitError: string | null = null;
    if (submitting) {
      const wf = await startOrderWorkflow(created.id, req.user?.id ?? 0);
      if ('error' in wf) submitError = wf.error;
      else created.order_status = wf.order_status;
    }
    const didSubmit = submitting && !submitError;

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'CREATE',
      module:      AUDIT_MODULE.SALES_ORDER,
      recordId:    created.id,
      description: `${didSubmit ? 'Created & submitted' : 'Created draft'} sales order: ${created.order_no}`,
      newValues:   body,
      ipAddress:   req.ip,
    });

    sendSuccess(res, created, submitError
      ? `Sales order ${created.order_no} saved as draft — could not submit: ${submitError}`
      : `Sales order ${created.order_no} ${didSubmit ? 'submitted for approval' : 'saved as draft'}`, 201);
  } catch (error) {
    const err = error as Prisma.PrismaClientKnownRequestError & Error;
    if (err.code === 'P2003') { sendValidationError(res, 'Selected customer does not exist'); return; }
    sendError(res, 'Failed to create sales order', 500, err.message);
  }
};

// ── PUT /sales-orders/:id  (drafts only; action: draft | submit) ─
export const updateSalesOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const body = req.body as Record<string, unknown>;
    const submitting = body.action === 'submit';

    const existing = await prisma.sales_order_hdr.findUnique({ where: { id }, select: { order_no: true, order_status: true } });
    if (!existing) { sendError(res, 'Sales order not found', 404); return; }
    // A rejected order is editable too — that is how the maker fixes it and
    // sends it back round.
    if (!ORDER_EDITABLE.includes(existing.order_status)) {
      sendValidationError(res, `Only draft or rejected orders can be edited (current status: ${existing.order_status})`);
      return;
    }

    const parsed = parseOrderBody(body);
    if ('error' in parsed) { sendValidationError(res, parsed.error); return; }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.sales_order_lines.deleteMany({ where: { order_id: id } });
      if (parsed.lines.length) {
        await tx.sales_order_lines.createMany({
          data: parsed.lines.map(l => ({ ...l, order_id: id })),
        });
      }
      return tx.sales_order_hdr.update({
        where: { id },
        data: {
          ...(parsed.header as Prisma.sales_order_hdrUncheckedUpdateInput),
          updated_by: req.user?.id ?? null,
          updated_at: new Date(),
        },
        select: { id: true, order_no: true, order_status: true },
      });
    });

    let submitError: string | null = null;
    if (submitting) {
      const wf = await startOrderWorkflow(id, req.user?.id ?? 0);
      if ('error' in wf) submitError = wf.error;
      else updated.order_status = wf.order_status;
    }
    const didSubmit = submitting && !submitError;

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'UPDATE',
      module:      AUDIT_MODULE.SALES_ORDER,
      recordId:    id,
      description: `${didSubmit ? 'Updated & submitted' : 'Updated draft'} sales order: ${updated.order_no}`,
      newValues:   body,
      ipAddress:   req.ip,
    });

    sendSuccess(res, updated, submitError
      ? `Sales order ${updated.order_no} saved — could not submit: ${submitError}`
      : `Sales order ${updated.order_no} ${didSubmit ? 'submitted for approval' : 'updated'}`);
  } catch (error) {
    const err = error as Prisma.PrismaClientKnownRequestError & Error;
    if (err.code === 'P2003') { sendValidationError(res, 'Selected customer does not exist'); return; }
    sendError(res, 'Failed to update sales order', 500, err.message);
  }
};

// ── POST /sales-orders/:id/submit ────────────────────────────────
export const submitSalesOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const existing = await prisma.sales_order_hdr.findUnique({
      where: { id },
      select: { order_no: true, order_status: true, _count: { select: { sales_order_lines: true } } },
    });
    if (!existing) { sendError(res, 'Sales order not found', 404); return; }
    if (!ORDER_EDITABLE.includes(existing.order_status)) {
      sendValidationError(res, `Only draft or rejected orders can be submitted (current status: ${existing.order_status})`);
      return;
    }
    if (existing._count.sales_order_lines === 0) {
      sendValidationError(res, 'At least one line item is required to submit the order');
      return;
    }

    // The status change is the workflow's to make — this endpoint only starts it.
    const wf = await startOrderWorkflow(id, req.user?.id ?? 0);
    if ('error' in wf) { sendValidationError(res, wf.error); return; }

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'UPDATE',
      module:      AUDIT_MODULE.SALES_ORDER,
      recordId:    id,
      description: `Submitted sales order: ${existing.order_no}`,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id, order_status: wf.order_status }, `Sales order ${existing.order_no} submitted for approval`);
  } catch (error) {
    sendError(res, 'Failed to submit sales order', 500, (error as Error).message);
  }
};

// ── DELETE /sales-orders/:id  (cancel with reason) ───────────────
export const cancelSalesOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const { reason } = req.body as { reason?: string };

    const existing = await prisma.sales_order_hdr.findUnique({ where: { id }, select: { order_no: true, order_status: true } });
    if (!existing) { sendError(res, 'Sales order not found', 404); return; }
    if (existing.order_status === ORDER_STATUS.CANCELLED) {
      sendValidationError(res, 'Sales order is already cancelled');
      return;
    }

    await prisma.$transaction([
      prisma.sales_order_hdr.update({
        where: { id },
        data: {
          order_status:  ORDER_STATUS.CANCELLED,
          cancel_reason: reason?.trim() || null,
          cancelled_at:  new Date(),
          updated_by:    req.user?.id ?? null,
          updated_at:    new Date(),
        },
      }),
      prisma.sales_order_lines.updateMany({
        where: { order_id: id },
        data: { item_status: ORDER_STATUS.CANCELLED, updated_at: new Date() },
      }),
    ]);

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'DELETE',
      module:      AUDIT_MODULE.SALES_ORDER,
      recordId:    id,
      description: `Cancelled sales order: ${existing.order_no}${reason ? ` — ${reason}` : ''}`,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id, order_status: ORDER_STATUS.CANCELLED }, `Sales order ${existing.order_no} cancelled`);
  } catch (error) {
    sendError(res, 'Failed to cancel sales order', 500, (error as Error).message);
  }
};
