import { Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { AUDIT_MODULE } from '../constants/auditModules';
import { WF_ACTION } from '../constants/bomWorkflow';
import { ORDER_STATUS, ORDER_STATUSES, ORDER_EDITABLE, ORDER_RECORD_TYPE } from '../constants/orderWorkflow';
import { runWorkflowAction } from '../services/workflow.service';
import { ITEM_TYPES, ItemType, isItemType, searchItemMaster } from '../services/itemLov.service';

const SORT_COLS: Record<string, string> = {
  po_number:           'po_number',
  vendor_company_name: 'vendor_company_name',
  buss_unit_id:        'buss_unit_id',
  po_date:             'po_date',
  expected_date:       'expected_date',
  currency_code:       'currency_code',
  total_qty:           'total_qty',
  ordered_amount:      'ordered_amount',
  total_value:         'total_value',
  po_status:           'po_status',
  created_at:          'created_at',
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

const round2 = (n: number) => Math.round(n * 100) / 100;
// Rates are stored to four decimals (NUMERIC(14,4)) because a metal rate is
// quoted per gram; rounding to paise before multiplying by a weight loses real
// money on a large line.
const round4 = (n: number) => Math.round(n * 10000) / 10000;

interface POLineInput {
  line_no:          number;
  itemtype:         ItemType;
  item_id:          number | null;
  sku_code:         string;
  item_description: string | null;
  item_qty:         number;
  uom:              string | null;
  gross_weight:     number;
  net_weight:       number;
  pure_weight:      number;
  rate_per_unit:    number;
  line_value:       number;
  tax_pct:          number;
  tax_amount:       number;
  line_total:       number;
  vendor_item_no:   string | null;
  req_number:       string | null;
  requested_date:   Date | null;
  line_status:      string;
  remarks:          string | null;
}

interface ParsedPO {
  header: Record<string, unknown>;
  lines:  POLineInput[];
}

// Validates header + lines from the request body. Returns an error string or the
// parsed payload.
//
// The same rules run on Save Draft and on Submit. A half-filled line is no more
// useful persisted as a draft than as a submitted order, and the Sales Order
// screen this one mirrors takes the same line.
// Always parses to a DRAFT: submitting is the workflow engine's job, so a
// "Save & Submit" writes the draft first and then runs the SUBMIT action.
function parsePOBody(body: Record<string, unknown>): { error: string } | ParsedPO {
  const buss_unit_id = str(body.buss_unit_id, 50);
  const supplier_id  = parseInt(String(body.supplier_id ?? ''), 10);
  const po_date      = dateOrNull(body.po_date);

  if (!buss_unit_id) return { error: 'Procurement BU is required' };
  if (!supplier_id)  return { error: 'Supplier is required' };
  if (!po_date)      return { error: 'Creation Date is required' };

  const rawLines = Array.isArray(body.lines) ? body.lines as Record<string, unknown>[] : [];
  const lines: POLineInput[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const l        = rawLines[i];
    const itemtype = String(l.itemtype ?? '').trim().toUpperCase();
    const sku_code = str(l.sku_code, 300);
    // Whole units only — the column is INTEGER, and Prisma would reject a
    // fractional value anyway. Truncating rather than rounding keeps a typed
    // "2.9" from silently becoming an order for 3.
    const item_qty = Math.trunc(num(l.item_qty));
    const rate     = num(l.rate_per_unit);

    // Silently drop rows the user added and never filled in.
    if (!sku_code && !item_qty && !rate) continue;

    if (!isItemType(itemtype)) {
      return { error: `Line ${i + 1}: Item Type must be one of ${ITEM_TYPES.join(', ')}` };
    }
    if (!sku_code)    return { error: `Line ${i + 1}: SKU / Item is required` };
    if (item_qty <= 0) return { error: `Line ${i + 1}: Qty must be a whole number greater than 0` };
    if (rate < 0)      return { error: `Line ${i + 1}: Rate / Unit cannot be negative` };

    const gross_weight = num(l.gross_weight);
    const net_weight   = num(l.net_weight);
    const pure_weight  = num(l.pure_weight);

    if (gross_weight < 0 || net_weight < 0 || pure_weight < 0) {
      return { error: `Line ${i + 1}: Weights cannot be negative` };
    }
    // Gross covers metal plus everything mounted on it, so a net above it means
    // one of the two was typed into the wrong cell. Pure is the fine-metal
    // content of the net, so it cannot exceed it either. Each is checked only
    // when the larger figure is actually present — a line may carry net alone.
    if (gross_weight > 0 && net_weight > gross_weight) {
      return { error: `Line ${i + 1}: Net Wt cannot be greater than Gr.Wt` };
    }
    if (net_weight > 0 && pure_weight > net_weight) {
      return { error: `Line ${i + 1}: Pure Wt cannot be greater than Net Wt` };
    }

    const tax_pct = num(l.tax_pct);
    if (tax_pct < 0 || tax_pct > 100) {
      return { error: `Line ${i + 1}: Tax % must be between 0 and 100` };
    }

    // Value and tax are computed here, never read from the request: the screen
    // shows them but they are the server's to derive, or a hand-crafted payload
    // could book a 10-lakh order at a total of zero.
    const rate_per_unit = round4(rate);
    const line_value    = round2(item_qty * rate_per_unit);
    const tax_amount    = round2(line_value * tax_pct / 100);

    const rawItemId = parseInt(String(l.item_id ?? ''), 10);

    lines.push({
      line_no:          lines.length + 1,
      itemtype,
      item_id:          Number.isFinite(rawItemId) && rawItemId > 0 ? rawItemId : null,
      sku_code,
      item_description: str(l.item_description, 500),
      item_qty,
      uom:              str(l.uom, 20),
      gross_weight,
      net_weight,
      pure_weight,
      rate_per_unit,
      line_value,
      tax_pct,
      tax_amount,
      line_total:       round2(line_value + tax_amount),
      vendor_item_no:   str(l.vendor_item_no, 100),
      req_number:       str(l.req_number, 100),
      requested_date:   dateOrNull(l.requested_date),
      line_status:      ORDER_STATUS.DRAFT,
      remarks:          str(l.remarks, 500),
    });
  }

  if (lines.length === 0) return { error: 'At least one order line is required' };

  const total_qty      = lines.reduce((s, l) => s + l.item_qty, 0);
  const ordered_amount = round2(lines.reduce((s, l) => s + l.line_value, 0));
  const tax_amount     = round2(lines.reduce((s, l) => s + l.tax_amount, 0));

  // The requisitions these lines came from, listed once each in the order they
  // appear. Derived rather than taken from the client so the header can never
  // claim a requisition no line actually references.
  const reqNumbers = [...new Set(lines.map(l => l.req_number).filter((v): v is string => !!v))];

  const header = {
    buss_unit_id,
    supplier_id,
    supplier_address: str(body.supplier_address, 2000),
    comm_email:       str(body.comm_email, 255),
    pay_term:         str(body.pay_term, 50),
    ship_to_location: str(body.ship_to_location, 2000),
    bill_to_location: str(body.bill_to_location, 2000),
    currency_code:    str(body.currency_code, 10) || 'INR',
    po_date,
    expected_date:    dateOrNull(body.expected_date),
    po_status:        ORDER_STATUS.DRAFT,
    req_number:       reqNumbers.length ? reqNumbers.join(', ').slice(0, 200) : null,
    remarks:          str(body.remarks, 1000),
    total_qty,
    ordered_amount,
    tax_amount,
    total_value:      round2(ordered_amount + tax_amount),
  };

  return { header, lines };
}

const audit = (
  req: AuthRequest,
  action: string,
  recordId: number,
  description: string,
  newValues?: Record<string, unknown>,
) => logAudit({
  userId:     req.user?.id,
  employeeId: req.user?.employee_id,
  fullName:   `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
  action,
  module:     AUDIT_MODULE.PURCHASE_ORDER,
  recordId,
  description,
  newValues,
  ipAddress:  req.ip,
});

// The buyer is whoever is holding the token — never a name sent up from the
// screen, which shows it read-only precisely because it is not the user's to set.
const buyerName = (req: AuthRequest): string | null => {
  const name = `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim();
  return name ? name.slice(0, 150) : (req.user?.employee_id ?? null);
};

// ── GET /purchase-orders ─────────────────────────────────────────
export const getPurchaseOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page    = Math.max(1, parseInt(req.query.page as string) || 1);
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

    const AND: Prisma.purchase_order_hdrWhereInput[] = [];
    if ((STATUSES as readonly string[]).includes(status)) AND.push({ po_status: status });

    if (search) {
      AND.push({
        OR: [
          { po_number:  { contains: search, mode: 'insensitive' } },
          { req_number: { contains: search, mode: 'insensitive' } },
          { buyer_name: { contains: search, mode: 'insensitive' } },
          { supplier_master: { vendor_company_name: { contains: search, mode: 'insensitive' } } },
          { supplier_master: { vendor_code:         { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    const directCols = [
      'po_number', 'buss_unit_id', 'currency_code', 'po_status', 'req_number',
      'buyer_name', 'pay_term',
    ] as const;
    for (const col of directCols) {
      const val = (cfObj[col] || '').trim();
      if (val) AND.push({ [col]: { contains: val, mode: 'insensitive' } });
    }
    const suppFilter = (cfObj.vendor_company_name || '').trim();
    if (suppFilter) {
      AND.push({ supplier_master: { vendor_company_name: { contains: suppFilter, mode: 'insensitive' } } });
    }

    const where: Prisma.purchase_order_hdrWhereInput = AND.length ? { AND } : {};

    const orderBy: Prisma.purchase_order_hdrOrderByWithRelationInput =
      sortKey === 'vendor_company_name'
        ? { supplier_master: { vendor_company_name: sortDir } }
        : { [sortKey]: sortDir };

    const [total, rows] = await Promise.all([
      prisma.purchase_order_hdr.count({ where }),
      prisma.purchase_order_hdr.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        select: {
          id: true, po_number: true, buss_unit_id: true, supplier_id: true,
          pay_term: true, currency_code: true, po_date: true, expected_date: true,
          po_status: true, buyer_name: true, req_number: true,
          total_qty: true, ordered_amount: true, tax_amount: true, total_value: true,
          cancel_reason: true, cancelled_at: true, created_at: true, updated_at: true,
          supplier_master: { select: { vendor_code: true, vendor_company_name: true } },
          _count: { select: { purchase_order_lines: true } },
        },
      }),
    ]);

    const dataRows = rows.map(({ supplier_master, _count, ...rest }) => ({
      ...rest,
      vendor_code:         supplier_master.vendor_code,
      vendor_company_name: supplier_master.vendor_company_name,
      line_count:          _count.purchase_order_lines,
    }));

    const total_pages = Math.ceil(total / limit) || 1;
    sendSuccess(res, dataRows, 'Purchase orders fetched', 200, { total, total_pages, page, limit });
  } catch (error) {
    sendError(res, 'Failed to fetch purchase orders', 500, (error as Error).message);
  }
};

// ── GET /purchase-orders/stats ───────────────────────────────────
export const getPurchaseOrderStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [draft, pending, approved, rejected, cancelled, pendingReqRows] = await Promise.all([
      prisma.purchase_order_hdr.count({ where: { po_status: ORDER_STATUS.DRAFT } }),
      prisma.purchase_order_hdr.count({ where: { po_status: ORDER_STATUS.PENDING_APPROVAL } }),
      prisma.purchase_order_hdr.count({ where: { po_status: ORDER_STATUS.APPROVED } }),
      prisma.purchase_order_hdr.count({ where: { po_status: ORDER_STATUS.REJECTED } }),
      prisma.purchase_order_hdr.count({ where: { po_status: ORDER_STATUS.CANCELLED } }),
      // Same "open requisition" predicate as getPORequisitionLOV / getPendingRequisitions
      // below — active and not yet pulled onto any live PO.
      prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM   purchase_requisition pr
        WHERE  pr.is_active = TRUE
          AND NOT EXISTS (
                SELECT 1
                FROM   purchase_order_lines pol
                JOIN   purchase_order_hdr   poh ON poh.id = pol.po_id
                WHERE  pol.req_number = pr.requisition_number
                  AND  poh.po_status <> 'CANCELLED'
              )
      `),
    ]);
    const pending_requisitions = Number(pendingReqRows[0]?.count ?? 0);
    sendSuccess(res, { draft, pending, approved, rejected, cancelled, pending_requisitions }, 'Stats fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch stats', 500, (error as Error).message);
  }
};

// ── GET /purchase-orders/lov/suppliers ───────────────────────────
// The supplier picker. Served from here rather than from /suppliers so a buyer
// needs no Supplier Master permission to raise a PO — the same reason the item
// picker below does not go through the item master screens.
export const getPOSupplierLOV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const search = ((req.query.search as string) || '').trim();
    const sp = (search && search !== '%') ? `%${search}%` : '%%';

    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT s.id,
             s.vendor_code         AS code,
             s.vendor_company_name AS name,
             s.gstin_uin_number,
             s.place_of_supply
      FROM   supplier_master s
      WHERE  s.is_active = TRUE
        AND (COALESCE(s.vendor_code, '')         ILIKE ${sp}
          OR COALESCE(s.vendor_company_name, '') ILIKE ${sp})
      ORDER  BY s.vendor_company_name
      LIMIT  60
    `);

    sendSuccess(res, rows, 'Supplier LOV fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch supplier LOV', 500, (error as Error).message);
  }
};

// ── GET /purchase-orders/suppliers/:id/defaults ──────────────────
// What the header fills in when a supplier is picked: the address block, the
// communication email and the GSTIN.
//
// Supplier Master keeps addresses as structured lines and stores email on both
// the address and the contact rows, so the address is flattened here and the
// email falls back from the address to the first contact carrying one — the
// screen should not have to know which of the two the data entry team used.
//
// supplier_master has no payment term column, so none is returned: Payment Term
// is a PAYMENT_TERM lookup the buyer picks, and inventing a default here would
// put a term on the order the supplier never agreed to.
export const getPOSupplierDefaults = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid supplier ID'); return; }

    const supplier = await prisma.supplier_master.findUnique({
      where: { id },
      select: {
        id: true, vendor_code: true, vendor_company_name: true,
        gstin_uin_number: true, place_of_supply: true,
        supplier_address_info: { orderBy: { id: 'asc' }, take: 1 },
        supplier_contact_info: { orderBy: { id: 'asc' } },
      },
    });
    if (!supplier) { sendError(res, 'Supplier not found', 404); return; }

    const a = supplier.supplier_address_info[0];
    const address = a
      ? [a.adrs_name, a.adrs_1, a.adrs_2, a.adrs_3, a.adrs_city_name, a.adrs_state_code, a.adrs_pincode]
          .map(v => String(v ?? '').trim()).filter(Boolean).join(', ')
      : '';

    const contactEmail = supplier.supplier_contact_info
      .map(c => String(c.cont_email ?? '').trim())
      .find(Boolean) ?? '';

    sendSuccess(res, {
      id:                  supplier.id,
      vendor_code:         supplier.vendor_code,
      vendor_company_name: supplier.vendor_company_name,
      gstin_uin_number:    supplier.gstin_uin_number,
      place_of_supply:     supplier.place_of_supply,
      supplier_address:    address,
      comm_email:          String(a?.adrs_email ?? '').trim() || contactEmail,
    }, 'Supplier defaults fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch supplier defaults', 500, (error as Error).message);
  }
};

// ── GET /purchase-orders/lov/items/:itemtype ─────────────────────
// The SKU picker, shared with Purchase Requisition — see
// services/itemLov.service.ts.
export const getPOItemLOV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const itemtype = String(req.params.itemtype || '').trim().toUpperCase();
    const search   = ((req.query.search as string) || '').trim();

    if (!isItemType(itemtype)) {
      sendValidationError(res, `Unknown item type: ${itemtype}`);
      return;
    }

    sendSuccess(res, await searchItemMaster(itemtype, search), 'Item LOV fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch item LOV', 500, (error as Error).message);
  }
};

// ── GET /purchase-orders/lov/requisitions ────────────────────────
// The Requisition Number picker — "Select Req and Populate lines below" on the
// form. Each active requisition names one item, so each becomes one PO line.
//
// Requisitions already pulled onto a PO are excluded, so the same demand is not
// ordered twice by two buyers working the same list. A requisition being edited
// back onto its own PO is still offered: `exclude_po` names that order, and its
// own lines are then not counted against it.
export const getPORequisitionLOV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const search    = ((req.query.search as string) || '').trim();
    const sp = (search && search !== '%') ? `%${search}%` : '%%';
    const excludeId = parseInt(String(req.query.exclude_po ?? ''), 10) || null;

    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT pr.id,
             pr.requisition_number,
             pr.requisition_date,
             pr.itemtype,
             pr.item_id,
             pr.sku_code,
             pr.item_description,
             pr.item_qty,
             pr.uom,
             pr.gross_weight,
             pr.net_weight,
             pr.pure_weight,
             pr.vendor_item_no,
             pr.required_date,
             pr.remarks
      FROM   purchase_requisition pr
      WHERE  pr.is_active = TRUE
        AND (pr.requisition_number             ILIKE ${sp}
          OR pr.sku_code                       ILIKE ${sp}
          OR COALESCE(pr.item_description, '') ILIKE ${sp})
        AND NOT EXISTS (
              SELECT 1
              FROM   purchase_order_lines pol
              JOIN   purchase_order_hdr   poh ON poh.id = pol.po_id
              WHERE  pol.req_number = pr.requisition_number
                AND  poh.po_status <> 'CANCELLED'
                AND (${excludeId}::int IS NULL OR poh.id <> ${excludeId})
            )
      ORDER  BY pr.requisition_date DESC, pr.requisition_number
      LIMIT  60
    `);

    sendSuccess(res, rows, 'Requisition LOV fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch requisition LOV', 500, (error as Error).message);
  }
};

// ── GET /purchase-orders/requisitions/pending ────────────────────
// The "Pending Requisition" tab on the PO grid — the same open-requisition
// predicate as the lov/requisitions picker above, but paginated/sortable for a
// full grid instead of a 60-row search dropdown. Feeds the bulk "Convert to PO"
// action: the buyer multi-selects rows here and they land as lines on a new,
// still-unsaved order.
const REQ_SORT: Record<string, Prisma.Sql> = {
  requisition_number: Prisma.sql`pr.requisition_number`,
  requisition_date:   Prisma.sql`pr.requisition_date`,
  itemtype:           Prisma.sql`pr.itemtype`,
  sku_code:           Prisma.sql`pr.sku_code`,
  item_qty:           Prisma.sql`pr.item_qty`,
  required_date:      Prisma.sql`pr.required_date`,
};

export const getPendingRequisitions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page    = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit   = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 25));
    const offset  = (page - 1) * limit;
    const search  = ((req.query.search as string) || '').trim();
    const sp      = search ? `%${search}%` : '%%';
    const sortCol = REQ_SORT[req.query.sort_by as string] || Prisma.sql`pr.requisition_date`;
    const sortDir = req.query.sort_dir === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;

    const where = Prisma.sql`
      FROM   purchase_requisition pr
      WHERE  pr.is_active = TRUE
        AND (pr.requisition_number             ILIKE ${sp}
          OR pr.sku_code                       ILIKE ${sp}
          OR COALESCE(pr.item_description, '') ILIKE ${sp})
        AND NOT EXISTS (
              SELECT 1
              FROM   purchase_order_lines pol
              JOIN   purchase_order_hdr   poh ON poh.id = pol.po_id
              WHERE  pol.req_number = pr.requisition_number
                AND  poh.po_status <> 'CANCELLED'
            )
    `;

    const [countRows, rows] = await Promise.all([
      prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`SELECT COUNT(*)::bigint AS count ${where}`),
      prisma.$queryRaw(Prisma.sql`
        SELECT pr.id, pr.requisition_number, pr.requisition_date, pr.itemtype, pr.item_id,
               pr.sku_code, pr.item_description, pr.item_qty, pr.uom,
               pr.gross_weight, pr.net_weight, pr.pure_weight, pr.vendor_item_no,
               pr.required_date, pr.remarks
        ${where}
        ORDER  BY ${sortCol} ${sortDir}
        LIMIT  ${limit} OFFSET ${offset}
      `),
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    const total_pages = Math.ceil(total / limit) || 1;
    sendSuccess(res, rows, 'Pending requisitions fetched', 200, { total, total_pages, page, limit });
  } catch (error) {
    sendError(res, 'Failed to fetch pending requisitions', 500, (error as Error).message);
  }
};

// ── GET /purchase-orders/item-rate ───────────────────────────────
// The rate one PO line is priced at, read from the supplier's Rate Contract —
// the buy-side counterpart of the Sales Order line reading Customer Price
// Master. Returns the contract row rather than just a number so the screen can
// say where the figure came from.
//
// A rate contract is struck per (vendor, itemtype, sku) and quoted either per
// gram or per piece:
//
//   Per Gm → rate × Net Wt   (the line's own weight, since a PO may order a
//                             hand-entered weight for a metal or stone)
//   Per Pc → rate × 1        (the line's Qty multiplies it further up the screen)
//
// No contract on file is not an error — plenty of items are bought at a
// negotiated one-off price — so the response says so and leaves the cell for the
// buyer to fill in.
export const getPOItemRate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const supplier_id = parseInt(String(req.query.supplier_id ?? ''), 10);
    const itemtype    = String(req.query.itemtype || '').trim().toUpperCase();
    const sku_code    = String(req.query.sku_code || '').trim();
    const net_weight  = num(req.query.net_weight);

    if (!supplier_id)          { sendValidationError(res, 'Supplier is required'); return; }
    if (!isItemType(itemtype)) { sendValidationError(res, `Unknown item type: ${itemtype}`); return; }
    if (!sku_code)             { sendValidationError(res, 'SKU code is required'); return; }

    // The contract can name this exact SKU or carry a catch-all 'ALL' row for
    // the item type; the exact row wins when both exist — the same precedence
    // Customer Price Master uses on the sell side.
    const rows = await prisma.$queryRaw<{
      sku_code: string; rate_basis: string; rate_type: string;
      rate_value: Prisma.Decimal; uom: string; remarks: string | null;
    }[]>(Prisma.sql`
      SELECT src.sku_code, src.rate_basis, src.rate_type, src.rate_value, src.uom, src.remarks
      FROM   supplier_rate_contract src
      WHERE  src.vendor_id = ${supplier_id}
        AND  src.is_active = TRUE
        AND  src.itemtype  = ${itemtype}
        AND  src.sku_code IN (${sku_code}, 'ALL')
      ORDER  BY (src.sku_code = ${sku_code}) DESC, src.id
      LIMIT  1
    `);

    if (rows.length === 0) {
      sendSuccess(res, {
        sku_code, itemtype, rate_found: false, rate_per_unit: null,
      }, 'No rate contract on file for this item');
      return;
    }

    const r          = rows[0];
    const rate_basis = r.rate_basis === 'PER_PC' ? 'PER_PC' : 'PER_GM';
    const rate_value = Number(r.rate_value);
    // Per Pc rates are struck for a single piece, so the weight factor is 1.
    const weight_factor = rate_basis === 'PER_GM' ? net_weight : 1;

    sendSuccess(res, {
      sku_code,
      itemtype,
      rate_found:   true,
      // 'ALL' here tells the screen the rate came from the item type's catch-all
      // row rather than one naming this SKU.
      matched_sku:  r.sku_code,
      rate_basis,
      rate_type:    r.rate_type,
      rate_value,
      uom:          r.uom,
      remarks:      r.remarks,
      weight_factor,
      // A PER_GM contract on a line with no weight yet prices at 0; the screen
      // shows the contract anyway so the buyer can see why the cell is empty.
      rate_per_unit: round4(rate_value * weight_factor),
    }, 'Item rate fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch item rate', 500, (error as Error).message);
  }
};

// ── GET /purchase-orders/:id ─────────────────────────────────────
export const getPurchaseOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const po = await prisma.purchase_order_hdr.findUnique({
      where: { id },
      include: {
        supplier_master: {
          select: { vendor_code: true, vendor_company_name: true, gstin_uin_number: true },
        },
        purchase_order_lines: { orderBy: { line_no: 'asc' } },
      },
    });
    if (!po) { sendError(res, 'Purchase order not found', 404); return; }

    const { supplier_master, purchase_order_lines, ...header } = po;
    sendSuccess(res, {
      ...header,
      vendor_code:         supplier_master.vendor_code,
      vendor_company_name: supplier_master.vendor_company_name,
      vendor_gstin:        supplier_master.gstin_uin_number,
      lines:               purchase_order_lines,
    }, 'Purchase order fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch purchase order', 500, (error as Error).message);
  }
};

// Runs the workflow's SUBMIT against a saved PO and reports the status it landed
// on — PENDING_APPROVAL normally, or APPROVED when the workflow has Self Approval
// switched on. Failure is returned rather than thrown: a workflow that is missing
// or misconfigured must not cost the buyer the order they just typed.
async function startOrderWorkflow(
  id: number,
  userId: number,
): Promise<{ po_status: string } | { error: string }> {
  try {
    await runWorkflowAction({
      recordType: ORDER_RECORD_TYPE.PURCHASE_ORDER,
      recordId:   id,
      action:     WF_ACTION.SUBMIT,
      userId,
    });
    const row = await prisma.purchase_order_hdr.findUnique({ where: { id }, select: { po_status: true } });
    return { po_status: row?.po_status ?? ORDER_STATUS.PENDING_APPROVAL };
  } catch (error) {
    return { error: String((error as Error).message ?? error).replace('Error: ', '') };
  }
}

// ── POST /purchase-orders  (action: draft | submit) ──────────────
export const createPurchaseOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const submitting = body.action === 'submit';

    const parsed = parsePOBody(body);
    if ('error' in parsed) { sendValidationError(res, parsed.error); return; }

    const created = await prisma.$transaction(async (tx) => {
      // po_number comes from the trg_purchase_order_no trigger, not from here —
      // the screen only ever showed a preview of it.
      const hdr = await tx.purchase_order_hdr.create({
        data: {
          ...(parsed.header as Prisma.purchase_order_hdrUncheckedCreateInput),
          buyer_id:   req.user?.id ?? null,
          buyer_name: buyerName(req),
          created_by: req.user?.id ?? null,
        },
        select: { id: true },
      });
      await tx.purchase_order_lines.createMany({
        data: parsed.lines.map(l => ({ ...l, po_id: hdr.id })),
      });
      return tx.purchase_order_hdr.findUniqueOrThrow({
        where: { id: hdr.id },
        select: { id: true, po_number: true, po_status: true },
      });
    });

    // "Save & Submit" — the PO exists as a draft first, then the workflow takes
    // it from there. A failure here leaves a usable draft rather than losing the
    // order, so it is reported without unwinding the save. The PO is audited
    // either way: it was created regardless of how the submit went.
    let submitError: string | null = null;
    if (submitting) {
      const wf = await startOrderWorkflow(created.id, req.user?.id ?? 0);
      if ('error' in wf) submitError = wf.error;
      else created.po_status = wf.po_status;
    }
    const didSubmit = submitting && !submitError;

    audit(req, 'CREATE', created.id,
      `${didSubmit ? 'Created & submitted' : 'Created draft'} purchase order: ${created.po_number}`,
      body);

    sendSuccess(res, created, submitError
      ? `Purchase order ${created.po_number} saved as draft — could not submit: ${submitError}`
      : `Purchase order ${created.po_number} ${didSubmit ? 'submitted for approval' : 'saved as draft'}`, 201);
  } catch (error) {
    const err = error as Prisma.PrismaClientKnownRequestError & Error;
    if (err.code === 'P2003') { sendValidationError(res, 'Selected supplier does not exist'); return; }
    sendError(res, 'Failed to create purchase order', 500, err.message);
  }
};

// ── PUT /purchase-orders/:id  (drafts only; action: draft | submit) ─
export const updatePurchaseOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const body = req.body as Record<string, unknown>;
    const submitting = body.action === 'submit';

    const existing = await prisma.purchase_order_hdr.findUnique({
      where: { id },
      select: { po_number: true, po_status: true },
    });
    if (!existing) { sendError(res, 'Purchase order not found', 404); return; }
    // A PO that has gone to the supplier is not the buyer's to rewrite. A
    // rejected one is, though — that is how the buyer fixes it and resends.
    if (!ORDER_EDITABLE.includes(existing.po_status)) {
      sendValidationError(res, `Only draft or rejected orders can be edited (current status: ${existing.po_status})`);
      return;
    }

    const parsed = parsePOBody(body);
    if ('error' in parsed) { sendValidationError(res, parsed.error); return; }

    const updated = await prisma.$transaction(async (tx) => {
      // Lines are replaced wholesale rather than diffed: line_no is positional,
      // so a removed row renumbers everything after it and there is no stable
      // identity to match an incoming row against. Same approach as Sales Order.
      await tx.purchase_order_lines.deleteMany({ where: { po_id: id } });
      await tx.purchase_order_lines.createMany({
        data: parsed.lines.map(l => ({ ...l, po_id: id })),
      });
      return tx.purchase_order_hdr.update({
        where: { id },
        data: {
          ...(parsed.header as Prisma.purchase_order_hdrUncheckedUpdateInput),
          updated_by: req.user?.id ?? null,
          updated_at: new Date(),
        },
        select: { id: true, po_number: true, po_status: true },
      });
    });

    let submitError: string | null = null;
    if (submitting) {
      const wf = await startOrderWorkflow(id, req.user?.id ?? 0);
      if ('error' in wf) submitError = wf.error;
      else updated.po_status = wf.po_status;
    }
    const didSubmit = submitting && !submitError;

    audit(req, 'UPDATE', id,
      `${didSubmit ? 'Updated & submitted' : 'Updated draft'} purchase order: ${updated.po_number}`,
      body);

    sendSuccess(res, updated, submitError
      ? `Purchase order ${updated.po_number} saved — could not submit: ${submitError}`
      : `Purchase order ${updated.po_number} ${didSubmit ? 'submitted for approval' : 'updated'}`);
  } catch (error) {
    const err = error as Prisma.PrismaClientKnownRequestError & Error;
    if (err.code === 'P2003') { sendValidationError(res, 'Selected supplier does not exist'); return; }
    sendError(res, 'Failed to update purchase order', 500, err.message);
  }
};

// ── POST /purchase-orders/:id/submit ─────────────────────────────
export const submitPurchaseOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const existing = await prisma.purchase_order_hdr.findUnique({
      where: { id },
      select: { po_number: true, po_status: true, _count: { select: { purchase_order_lines: true } } },
    });
    if (!existing) { sendError(res, 'Purchase order not found', 404); return; }
    if (!ORDER_EDITABLE.includes(existing.po_status)) {
      sendValidationError(res, `Only draft or rejected orders can be submitted (current status: ${existing.po_status})`);
      return;
    }
    if (existing._count.purchase_order_lines === 0) {
      sendValidationError(res, 'At least one line item is required to submit the order');
      return;
    }

    // The status change is the workflow's to make — this endpoint only starts it.
    const wf = await startOrderWorkflow(id, req.user?.id ?? 0);
    if ('error' in wf) { sendValidationError(res, wf.error); return; }

    audit(req, 'UPDATE', id, `Submitted purchase order: ${existing.po_number}`);

    sendSuccess(res, { id, po_status: wf.po_status }, `Purchase order ${existing.po_number} submitted for approval`);
  } catch (error) {
    sendError(res, 'Failed to submit purchase order', 500, (error as Error).message);
  }
};

// ── DELETE /purchase-orders/:id  (cancel with reason) ────────────
// Orders are cancelled, never deleted: a withdrawn PO is exactly the history a
// purchase audit asks for, and cancelling it is also what releases its
// requisitions back onto the picker.
export const cancelPurchaseOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const reason = str((req.body as { reason?: string })?.reason, 500);

    const existing = await prisma.purchase_order_hdr.findUnique({
      where: { id },
      select: { po_number: true, po_status: true },
    });
    if (!existing) { sendError(res, 'Purchase order not found', 404); return; }
    if (existing.po_status === ORDER_STATUS.CANCELLED) {
      sendValidationError(res, 'Purchase order is already cancelled');
      return;
    }

    await prisma.$transaction([
      prisma.purchase_order_hdr.update({
        where: { id },
        data: {
          po_status:     ORDER_STATUS.CANCELLED,
          cancel_reason: reason,
          cancelled_at:  new Date(),
          updated_by:    req.user?.id ?? null,
          updated_at:    new Date(),
        },
      }),
      prisma.purchase_order_lines.updateMany({
        where: { po_id: id },
        data: { line_status: ORDER_STATUS.CANCELLED, updated_at: new Date() },
      }),
    ]);

    audit(req, 'DELETE', id,
      `Cancelled purchase order: ${existing.po_number}${reason ? ` — ${reason}` : ''}`);

    sendSuccess(res, { id, po_status: ORDER_STATUS.CANCELLED }, `Purchase order ${existing.po_number} cancelled`);
  } catch (error) {
    sendError(res, 'Failed to cancel purchase order', 500, (error as Error).message);
  }
};
