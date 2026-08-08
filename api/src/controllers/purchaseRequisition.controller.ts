import { Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { AUDIT_MODULE } from '../constants/auditModules';
import { ITEM_TYPES, ItemType, isItemType, searchItemMaster } from '../services/itemLov.service';

const SORT_COLS: Record<string, string> = {
  requisition_number:   'requisition_number',
  requisition_date:     'requisition_date',
  itemtype:             'itemtype',
  sku_code:             'sku_code',
  item_qty:             'item_qty',
  gross_weight:         'gross_weight',
  net_weight:           'net_weight',
  pure_weight:          'pure_weight',
  vendor_item_no:       'vendor_item_no',
  ref_request_number:   'ref_request_number',
  required_date:        'required_date',
  created_at:           'created_at',
};

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

interface ParsedRequisition {
  requisition_date:     Date;
  itemtype:             ItemType;
  item_id:              number | null;
  sku_code:             string;
  item_description:     string | null;
  item_qty:             number;
  uom:                  string | null;
  gross_weight:         number;
  net_weight:           number;
  pure_weight:          number;
  is_vendor_mapped:     boolean;
  vendor_item_no:       string | null;
  ref_request_number:   string | null;
  ref_request_source:   string | null;
  ref_source_reference: string | null;
  required_date:        Date | null;
  remarks:              string | null;
}

// Validates one requisition from the request body. Returns an error string or
// the parsed row. The same rules run on create and update — a requisition has
// no draft-only relaxation, since every field it needs is known when it is
// raised.
function parseRequisitionBody(body: Record<string, unknown>): { error: string } | ParsedRequisition {
  const requisition_date = dateOrNull(body.requisition_date) ?? new Date();
  const itemtype         = String(body.itemtype ?? '').trim().toUpperCase();
  const sku_code         = str(body.sku_code, 300);
  // Whole units only — the column is INTEGER, and Prisma would reject a
  // fractional value here anyway. Truncating rather than rounding keeps a typed
  // "2.9" from silently becoming a request for 3.
  const item_qty         = Math.trunc(num(body.item_qty));

  if (!(ITEM_TYPES as readonly string[]).includes(itemtype)) {
    return { error: `Item Type must be one of ${ITEM_TYPES.join(', ')}` };
  }
  if (!sku_code)     return { error: 'SKU / Item is required' };
  if (item_qty <= 0) return { error: 'Qty must be a whole number greater than 0' };

  const gross_weight = num(body.gross_weight);
  const net_weight   = num(body.net_weight);
  const pure_weight  = num(body.pure_weight);

  if (gross_weight < 0 || net_weight < 0 || pure_weight < 0) {
    return { error: 'Weights cannot be negative' };
  }
  // Gross covers metal plus everything mounted on it, so a net above it means
  // one of the two was typed into the wrong cell. Pure is the fine-metal content
  // of the net, so it cannot exceed it either. Both are checked only when the
  // larger figure is actually present — a requisition may carry net alone.
  if (gross_weight > 0 && net_weight > gross_weight) {
    return { error: 'Net Wt cannot be greater than Gr.Wt' };
  }
  if (net_weight > 0 && pure_weight > net_weight) {
    return { error: 'Pure Wt cannot be greater than Net Wt' };
  }

  const is_vendor_mapped = body.is_vendor_mapped === true || body.is_vendor_mapped === 'true';
  const vendor_item_no   = str(body.vendor_item_no, 100);
  // Mirrors chk_pr_vendor_item: the flag without the number is what puts a blank
  // part number on the purchase order the requisition turns into.
  if (is_vendor_mapped && !vendor_item_no) {
    return { error: 'Vendor Item No is required when the item is vendor mapped' };
  }

  const rawItemId = parseInt(String(body.item_id ?? ''), 10);

  return {
    requisition_date,
    itemtype: itemtype as ItemType,
    item_id:  Number.isFinite(rawItemId) && rawItemId > 0 ? rawItemId : null,
    sku_code,
    item_description: str(body.item_description, 500),
    item_qty,
    uom: str(body.uom, 20),
    gross_weight,
    net_weight,
    pure_weight,
    is_vendor_mapped,
    vendor_item_no,
    ref_request_number:   str(body.ref_request_number, 100),
    ref_request_source:   str(body.ref_request_source, 50),
    ref_source_reference: str(body.ref_source_reference, 200),
    required_date:        dateOrNull(body.required_date),
    remarks:              str(body.remarks, 500),
  };
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
  module:     AUDIT_MODULE.PURCHASE_REQUISITION,
  recordId,
  description,
  newValues,
  ipAddress:  req.ip,
});

// ── GET /purchase-requisitions ───────────────────────────────────
export const getRequisitions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page    = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit   = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset  = (page - 1) * limit;
    const search  = ((req.query.search as string) || '').trim();
    const status  = ((req.query.status as string) || 'active').toLowerCase();
    const sortKey = SORT_COLS[req.query.sort_by as string] || 'created_at';
    const sortDir = req.query.sort_dir === 'asc' ? 'asc' : 'desc';

    let cfObj: Record<string, string> = {};
    try {
      if (req.query.col_filters) cfObj = JSON.parse(req.query.col_filters as string);
    } catch { /* ignore */ }

    const AND: Prisma.purchase_requisitionWhereInput[] = [];
    if (status === 'active')   AND.push({ is_active: true });
    if (status === 'inactive') AND.push({ is_active: false });

    if (search) {
      AND.push({
        OR: [
          { requisition_number:   { contains: search, mode: 'insensitive' } },
          { sku_code:             { contains: search, mode: 'insensitive' } },
          { item_description:     { contains: search, mode: 'insensitive' } },
          { vendor_item_no:       { contains: search, mode: 'insensitive' } },
          { ref_request_number:   { contains: search, mode: 'insensitive' } },
          { ref_source_reference: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const TEXT_COLS = [
      'requisition_number', 'itemtype', 'sku_code', 'item_description', 'uom',
      'vendor_item_no', 'ref_request_number', 'ref_request_source',
      'ref_source_reference', 'deactivation_reason',
    ] as const;
    for (const col of TEXT_COLS) {
      const val = (cfObj[col] || '').trim();
      if (val) AND.push({ [col]: { contains: val, mode: 'insensitive' } });
    }

    // Vendor mapped filters on the rendered Yes/No rather than on 'true'/'false',
    // which is what the column actually shows the user typing against.
    const vmFilter = (cfObj.is_vendor_mapped || '').trim().toLowerCase();
    if (vmFilter) {
      if ('yes'.startsWith(vmFilter))     AND.push({ is_vendor_mapped: true });
      else if ('no'.startsWith(vmFilter)) AND.push({ is_vendor_mapped: false });
      else                                AND.push({ id: -1 });
    }

    const where: Prisma.purchase_requisitionWhereInput = AND.length ? { AND } : {};

    const [total, rows] = await Promise.all([
      prisma.purchase_requisition.count({ where }),
      prisma.purchase_requisition.findMany({
        where,
        orderBy: { [sortKey]: sortDir },
        skip: offset,
        take: limit,
      }),
    ]);

    const total_pages = Math.ceil(total / limit) || 1;
    sendSuccess(res, rows, 'Purchase requisitions fetched', 200, { total, total_pages, page, limit });
  } catch (error) {
    sendError(res, 'Failed to fetch purchase requisitions', 500, (error as Error).message);
  }
};

// ── GET /purchase-requisitions/stats ─────────────────────────────
export const getRequisitionStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [active, inactive] = await Promise.all([
      prisma.purchase_requisition.count({ where: { is_active: true } }),
      prisma.purchase_requisition.count({ where: { is_active: false } }),
    ]);
    sendSuccess(res, { active, inactive }, 'Stats fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch stats', 500, (error as Error).message);
  }
};

// ── GET /purchase-requisitions/lov/:itemtype ─────────────────────
// The SKU picker, shared with Purchase Order — see services/itemLov.service.ts
// for why each item type reads a different master.
export const getRequisitionItemLOV = async (req: AuthRequest, res: Response): Promise<void> => {
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

// ── GET /purchase-requisitions/:id ───────────────────────────────
export const getRequisitionById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const row = await prisma.purchase_requisition.findUnique({ where: { id } });
    if (!row) { sendError(res, 'Purchase requisition not found', 404); return; }

    sendSuccess(res, row, 'Purchase requisition fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch purchase requisition', 500, (error as Error).message);
  }
};

// ── POST /purchase-requisitions ──────────────────────────────────
export const createRequisition = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = parseRequisitionBody(req.body as Record<string, unknown>);
    if ('error' in parsed) { sendValidationError(res, parsed.error); return; }

    // requisition_number comes from the trg_purchase_requisition_no trigger, not
    // from here — the screen only ever showed a preview of it.
    const created = await prisma.purchase_requisition.create({
      data: {
        ...parsed,
        is_active:  true,
        created_by: req.user?.id ?? null,
      },
    });

    audit(req, 'CREATE', created.id,
      `Created purchase requisition: ${created.requisition_number}`,
      { itemtype: parsed.itemtype, sku_code: parsed.sku_code, item_qty: parsed.item_qty });

    sendSuccess(res, created, 'Purchase requisition created successfully', 201);
  } catch (error) {
    sendError(res, 'Failed to create purchase requisition', 500, (error as Error).message);
  }
};

// ── PUT /purchase-requisitions/:id ───────────────────────────────
export const updateRequisition = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const existing = await prisma.purchase_requisition.findUnique({
      where: { id },
      select: { id: true, requisition_number: true, is_active: true },
    });
    if (!existing) { sendError(res, 'Purchase requisition not found', 404); return; }

    // Matches the grid, which hides the pencil on an inactive row: a deactivated
    // requisition is reactivated first, then edited.
    if (!existing.is_active) {
      sendValidationError(res, 'An inactive requisition cannot be edited — activate it first');
      return;
    }

    const parsed = parseRequisitionBody(req.body as Record<string, unknown>);
    if ('error' in parsed) { sendValidationError(res, parsed.error); return; }

    const updated = await prisma.purchase_requisition.update({
      where: { id },
      data: {
        ...parsed,
        updated_by: req.user?.id ?? null,
        updated_at: new Date(),
      },
    });

    audit(req, 'UPDATE', id,
      `Updated purchase requisition: ${updated.requisition_number}`,
      { itemtype: parsed.itemtype, sku_code: parsed.sku_code, item_qty: parsed.item_qty });

    sendSuccess(res, updated, 'Purchase requisition updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update purchase requisition', 500, (error as Error).message);
  }
};

// ── DELETE /purchase-requisitions/:id  (toggle status) ───────────
// Requisitions are deactivated, never deleted: a withdrawn request is exactly
// the history a purchase audit asks for.
export const toggleRequisitionStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const reason = str((req.body as { reason?: string })?.reason, 500);

    // Atomic toggle (SET is_active = NOT is_active) — kept as a raw query since
    // Prisma's update API has no "toggle this boolean" expression, and a
    // read-then-write two-step would introduce a race under concurrent requests
    // that the single UPDATE doesn't have. Same shape as Metal Master's.
    const rows = await prisma.$queryRaw<{ id: number; is_active: boolean; requisition_number: string }[]>(
      Prisma.sql`
        UPDATE purchase_requisition
        SET is_active           = NOT is_active,
            deactivation_reason = CASE WHEN is_active THEN ${reason} ELSE NULL END,
            deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
            updated_by          = ${req.user?.id ?? null},
            updated_at          = NOW()
        WHERE id = ${id}
        RETURNING id, is_active, requisition_number
      `
    );

    if (rows.length === 0) { sendError(res, 'Purchase requisition not found', 404); return; }
    const updated = rows[0];

    audit(req, 'DELETE', id,
      `${updated.is_active ? 'Activated' : 'Deactivated'} purchase requisition: ` +
      `${updated.requisition_number}${!updated.is_active && reason ? ` — ${reason}` : ''}`);

    sendSuccess(res, { id, is_active: updated.is_active },
      updated.is_active ? 'Purchase requisition activated' : 'Purchase requisition deactivated');
  } catch (error) {
    sendError(res, 'Failed to toggle purchase requisition status', 500, (error as Error).message);
  }
};
