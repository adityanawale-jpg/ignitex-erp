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
import { searchItemMaster } from '../services/itemLov.service';
import { reverseStockMovement } from '../services/stock.service';

const SORT_COLS: Record<string, string> = {
  receipt_number:  'receipt_number',
  receipt_date:    'receipt_date',
  doc_number:      'doc_number',
  sku_code:        'sku_code',
  uid:             'uid',
  purity:          'purity',
  received_weight: 'received_weight',
  pure_weight:     'pure_weight',
  receipt_status:  'receipt_status',
  created_at:      'created_at',
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

interface ParsedReceipt {
  receipt_date:      Date;
  customer_id:       number;
  doc_number:        string | null;
  shipment_location: string | null;
  item_id:           number | null;
  sku_code:          string;
  item_description:  string | null;
  uid:               string | null;
  purity:            string | null;
  received_weight:   number;
  pure_weight:       number;
  inward_inv_org:    string | null;
  inward_sub_inv:    string | null;
  remarks:           string | null;
}

// Validates one receipt from the request body. Returns an error string or the
// parsed row. The same rules run on create and update, and on a draft as on a
// submit: a receipt records metal that is physically on the counter, so there is
// nothing about it that is legitimately unknown when the row is typed.
function parseReceiptBody(body: Record<string, unknown>): { error: string } | ParsedReceipt {
  const receipt_date = dateOrNull(body.receipt_date) ?? new Date();
  const customer_id  = parseInt(String(body.customer_id ?? ''), 10);
  const sku_code     = str(body.sku_code, 300);

  if (!Number.isFinite(customer_id) || customer_id <= 0) return { error: 'Customer is required' };
  if (!sku_code) return { error: 'SKU / Metal is required' };

  const received_weight = num(body.received_weight);
  const pure_weight     = num(body.pure_weight);

  // Mirrors chk_mr_received_wt: a receipt of nothing is a row that will never
  // reconcile against the metal actually in the safe.
  if (received_weight <= 0) return { error: 'Received Wt must be greater than 0' };
  if (pure_weight < 0)      return { error: 'Pure Wt cannot be negative' };
  // Mirrors chk_mr_pure_wt. Pure is the fine-metal content of what was weighed
  // in, so above it means a purity was entered as 916 where 0.916 was meant.
  if (pure_weight > received_weight) {
    return { error: 'Pure Wt cannot be greater than Received Wt' };
  }

  const rawItemId = parseInt(String(body.item_id ?? ''), 10);

  return {
    receipt_date,
    customer_id,
    doc_number:        str(body.doc_number, 100),
    shipment_location: str(body.shipment_location, 300),
    item_id:           Number.isFinite(rawItemId) && rawItemId > 0 ? rawItemId : null,
    sku_code,
    item_description:  str(body.item_description, 500),
    uid:               str(body.uid, 100),
    purity:            str(body.purity, 50),
    received_weight,
    pure_weight,
    inward_inv_org:    str(body.inward_inv_org, 50),
    inward_sub_inv:    str(body.inward_sub_inv, 100),
    remarks:           str(body.remarks, 500),
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
  module:     AUDIT_MODULE.METAL_RECEIPT,
  recordId,
  description,
  newValues,
  ipAddress:  req.ip,
});

// Flattens the customer relation onto the row, the shape the grid reads.
type ReceiptRow = Prisma.metal_receiptGetPayload<{
  include: { customer_master: { select: { customer_code: true; customer_company_name: true } } };
}>;
const flatten = ({ customer_master, ...rest }: ReceiptRow) => ({
  ...rest,
  customer_code:         customer_master?.customer_code ?? null,
  customer_company_name: customer_master?.customer_company_name ?? null,
});

const CUSTOMER_SELECT = {
  customer_master: { select: { customer_code: true, customer_company_name: true } },
} as const;

// ── GET /metal-receipts ──────────────────────────────────────────
export const getMetalReceipts = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const AND: Prisma.metal_receiptWhereInput[] = [];
    if ((STATUSES as readonly string[]).includes(status)) AND.push({ receipt_status: status });

    if (search) {
      AND.push({
        OR: [
          { receipt_number:  { contains: search, mode: 'insensitive' } },
          { doc_number:      { contains: search, mode: 'insensitive' } },
          { sku_code:        { contains: search, mode: 'insensitive' } },
          { uid:             { contains: search, mode: 'insensitive' } },
          { item_description:{ contains: search, mode: 'insensitive' } },
          { customer_master: { customer_code:         { contains: search, mode: 'insensitive' } } },
          { customer_master: { customer_company_name: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    const TEXT_COLS = [
      'receipt_number', 'doc_number', 'shipment_location', 'sku_code',
      'item_description', 'uid', 'purity', 'inward_inv_org', 'inward_sub_inv',
      'receipt_status', 'cancel_reason',
    ] as const;
    for (const col of TEXT_COLS) {
      const val = (cfObj[col] || '').trim();
      if (val) AND.push({ [col]: { contains: val, mode: 'insensitive' } });
    }

    // Customer is one column on the grid but two on the table, so its filter is
    // matched against either half of what the cell renders.
    const custFilter = (cfObj.customer_company_name || '').trim();
    if (custFilter) {
      AND.push({
        OR: [
          { customer_master: { customer_company_name: { contains: custFilter, mode: 'insensitive' } } },
          { customer_master: { customer_code:         { contains: custFilter, mode: 'insensitive' } } },
        ],
      });
    }

    const where: Prisma.metal_receiptWhereInput = AND.length ? { AND } : {};

    const [total, rows] = await Promise.all([
      prisma.metal_receipt.count({ where }),
      prisma.metal_receipt.findMany({
        where,
        include: CUSTOMER_SELECT,
        orderBy: { [sortKey]: sortDir },
        skip: offset,
        take: limit,
      }),
    ]);

    const total_pages = Math.ceil(total / limit) || 1;
    sendSuccess(res, rows.map(flatten), 'Metal receipts fetched', 200, { total, total_pages, page, limit });
  } catch (error) {
    sendError(res, 'Failed to fetch metal receipts', 500, (error as Error).message);
  }
};

// ── GET /metal-receipts/stats ────────────────────────────────────
export const getMetalReceiptStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [draft, pending, approved, rejected, cancelled] = await Promise.all([
      prisma.metal_receipt.count({ where: { receipt_status: ORDER_STATUS.DRAFT } }),
      prisma.metal_receipt.count({ where: { receipt_status: ORDER_STATUS.PENDING_APPROVAL } }),
      prisma.metal_receipt.count({ where: { receipt_status: ORDER_STATUS.APPROVED } }),
      prisma.metal_receipt.count({ where: { receipt_status: ORDER_STATUS.REJECTED } }),
      prisma.metal_receipt.count({ where: { receipt_status: ORDER_STATUS.CANCELLED } }),
    ]);
    sendSuccess(res, { draft, pending, approved, rejected, cancelled }, 'Stats fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch stats', 500, (error as Error).message);
  }
};

// ── GET /metal-receipts/lov/customers ────────────────────────────
// The customer picker. Served from here rather than from /customers so a
// receiving clerk needs no Customer Master permission to book metal in — the
// same reason Purchase Order serves its own supplier picker.
export const getReceiptCustomerLOV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const search = ((req.query.search as string) || '').trim();
    const sp = (search && search !== '%') ? `%${search}%` : '%%';

    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT c.id,
             c.customer_code AS code,
             COALESCE(NULLIF(TRIM(c.customer_company_name), ''),
                      NULLIF(TRIM(c.customer_display_name), ''),
                      c.customer_name) AS name
      FROM   customer_master c
      WHERE  c.is_active = TRUE
        AND (COALESCE(c.customer_code,         '') ILIKE ${sp}
          OR COALESCE(c.customer_company_name, '') ILIKE ${sp}
          OR COALESCE(c.customer_display_name, '') ILIKE ${sp}
          OR COALESCE(c.customer_name,         '') ILIKE ${sp})
      ORDER  BY c.customer_code
      LIMIT  60
    `);

    sendSuccess(res, rows, 'Customer LOV fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch customer LOV', 500, (error as Error).message);
  }
};

// ── GET /metal-receipts/lov/items ────────────────────────────────
// The SKU picker. Fixed to METAL — this screen books metal in, and the receipt's
// Purity and Pure Wt are read off the metal master row the SKU came from.
export const getReceiptItemLOV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const search = ((req.query.search as string) || '').trim();
    sendSuccess(res, await searchItemMaster('METAL', search), 'Item LOV fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch item LOV', 500, (error as Error).message);
  }
};

// ── GET /metal-receipts/inventory-structure ──────────────────────
// Inward Inventory Org / Sub Inventory options. Unlike the Sales Order version
// this is not scoped to a Business Unit: the receipt screen has no BU field, so
// every active sub-inventory is on offer and the page pairs them up itself.
export const getReceiptInventoryStructure = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT ist.inv_org_code,
             COALESCE(org.lookup_name, ist.inv_org_code) AS inv_org_name,
             ist.sub_inv_code,
             ist.sub_inv_name
      FROM   inventory_structure ist
      LEFT   JOIN master_lookup org
             ON org.lookup_type = 'INV_ORG' AND org.lookup_code = ist.inv_org_code
      WHERE  ist.is_active = TRUE
      ORDER  BY inv_org_name, ist.sub_inv_name
    `);

    sendSuccess(res, rows, 'Inventory structure fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch inventory structure', 500, (error as Error).message);
  }
};

// ── GET /metal-receipts/:id ──────────────────────────────────────
export const getMetalReceiptById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const row = await prisma.metal_receipt.findUnique({ where: { id }, include: CUSTOMER_SELECT });
    if (!row) { sendError(res, 'Metal receipt not found', 404); return; }

    sendSuccess(res, flatten(row), 'Metal receipt fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch metal receipt', 500, (error as Error).message);
  }
};

// Runs the workflow's SUBMIT against a saved receipt and reports the status it
// landed on — PENDING_APPROVAL normally, or APPROVED when the workflow has Self
// Approval switched on. Failure is returned rather than thrown: a workflow that
// is missing or misconfigured must not cost the clerk the row they just typed.
async function startReceiptWorkflow(
  id: number,
  userId: number,
): Promise<{ receipt_status: string } | { error: string }> {
  try {
    await runWorkflowAction({
      recordType: ORDER_RECORD_TYPE.METAL_RECEIPT,
      recordId:   id,
      action:     WF_ACTION.SUBMIT,
      userId,
    });
    const row = await prisma.metal_receipt.findUnique({ where: { id }, select: { receipt_status: true } });
    return { receipt_status: row?.receipt_status ?? ORDER_STATUS.PENDING_APPROVAL };
  } catch (error) {
    return { error: String((error as Error).message ?? error).replace('Error: ', '') };
  }
}

// ── POST /metal-receipts  (action: draft | submit) ───────────────
export const createMetalReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const submitting = body.action === 'submit';

    const parsed = parseReceiptBody(body);
    if ('error' in parsed) { sendValidationError(res, parsed.error); return; }

    // receipt_number comes from the trg_metal_receipt_no trigger, not from here —
    // the screen only ever showed a preview of it.
    const created = await prisma.metal_receipt.create({
      data: {
        ...parsed,
        receipt_status: ORDER_STATUS.DRAFT,
        created_by:     req.user?.id ?? null,
      },
      select: { id: true, receipt_number: true, receipt_status: true },
    });

    // "Save & Submit" — the receipt exists as a draft first, then the workflow
    // takes it from there. A failure here leaves a usable draft rather than
    // losing the row, so it is reported without unwinding the save.
    let submitError: string | null = null;
    if (submitting) {
      const wf = await startReceiptWorkflow(created.id, req.user?.id ?? 0);
      if ('error' in wf) submitError = wf.error;
      else created.receipt_status = wf.receipt_status;
    }
    const didSubmit = submitting && !submitError;

    audit(req, 'CREATE', created.id,
      `${didSubmit ? 'Created & submitted' : 'Created draft'} metal receipt: ${created.receipt_number}`,
      { sku_code: parsed.sku_code, received_weight: parsed.received_weight, uid: parsed.uid });

    sendSuccess(res, created, submitError
      ? `Metal receipt ${created.receipt_number} saved as draft — could not submit: ${submitError}`
      : `Metal receipt ${created.receipt_number} ${didSubmit ? 'submitted for approval' : 'saved as draft'}`, 201);
  } catch (error) {
    const err = error as Prisma.PrismaClientKnownRequestError & Error;
    if (err.code === 'P2003') { sendValidationError(res, 'Selected customer does not exist'); return; }
    sendError(res, 'Failed to create metal receipt', 500, err.message);
  }
};

// ── PUT /metal-receipts/:id  (drafts only; action: draft | submit) ─
export const updateMetalReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const body = req.body as Record<string, unknown>;
    const submitting = body.action === 'submit';

    const existing = await prisma.metal_receipt.findUnique({
      where: { id },
      select: { receipt_number: true, receipt_status: true },
    });
    if (!existing) { sendError(res, 'Metal receipt not found', 404); return; }
    // Metal already accepted into a sub-inventory is not the receiver's to
    // rewrite. A rejected receipt is, though — that is how the clerk corrects it
    // and resubmits.
    if (!ORDER_EDITABLE.includes(existing.receipt_status)) {
      sendValidationError(res, `Only draft or rejected receipts can be edited (current status: ${existing.receipt_status})`);
      return;
    }

    const parsed = parseReceiptBody(body);
    if ('error' in parsed) { sendValidationError(res, parsed.error); return; }

    const updated = await prisma.metal_receipt.update({
      where: { id },
      data: {
        ...parsed,
        updated_by: req.user?.id ?? null,
        updated_at: new Date(),
      },
      select: { id: true, receipt_number: true, receipt_status: true },
    });

    let submitError: string | null = null;
    if (submitting) {
      const wf = await startReceiptWorkflow(id, req.user?.id ?? 0);
      if ('error' in wf) submitError = wf.error;
      else updated.receipt_status = wf.receipt_status;
    }
    const didSubmit = submitting && !submitError;

    audit(req, 'UPDATE', id,
      `${didSubmit ? 'Updated & submitted' : 'Updated draft'} metal receipt: ${updated.receipt_number}`,
      { sku_code: parsed.sku_code, received_weight: parsed.received_weight, uid: parsed.uid });

    sendSuccess(res, updated, submitError
      ? `Metal receipt ${updated.receipt_number} saved — could not submit: ${submitError}`
      : `Metal receipt ${updated.receipt_number} ${didSubmit ? 'submitted for approval' : 'updated'}`);
  } catch (error) {
    const err = error as Prisma.PrismaClientKnownRequestError & Error;
    if (err.code === 'P2003') { sendValidationError(res, 'Selected customer does not exist'); return; }
    sendError(res, 'Failed to update metal receipt', 500, err.message);
  }
};

// ── POST /metal-receipts/:id/submit ──────────────────────────────
export const submitMetalReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const existing = await prisma.metal_receipt.findUnique({
      where: { id },
      select: { receipt_number: true, receipt_status: true },
    });
    if (!existing) { sendError(res, 'Metal receipt not found', 404); return; }
    if (!ORDER_EDITABLE.includes(existing.receipt_status)) {
      sendValidationError(res, `Only draft or rejected receipts can be submitted (current status: ${existing.receipt_status})`);
      return;
    }

    // The status change is the workflow's to make — this endpoint only starts it.
    const wf = await startReceiptWorkflow(id, req.user?.id ?? 0);
    if ('error' in wf) { sendValidationError(res, wf.error); return; }

    audit(req, 'UPDATE', id, `Submitted metal receipt: ${existing.receipt_number}`);

    sendSuccess(res, { id, receipt_status: wf.receipt_status },
      `Metal receipt ${existing.receipt_number} submitted for approval`);
  } catch (error) {
    sendError(res, 'Failed to submit metal receipt', 500, (error as Error).message);
  }
};

// ── DELETE /metal-receipts/:id  (cancel with reason) ─────────────
// Receipts are cancelled, never deleted: metal that was weighed in and then
// rejected is exactly the history a stock audit asks for.
export const cancelMetalReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const reason = str((req.body as { reason?: string })?.reason, 500);

    const existing = await prisma.metal_receipt.findUnique({
      where: { id },
      select: { receipt_number: true, receipt_status: true },
    });
    if (!existing) { sendError(res, 'Metal receipt not found', 404); return; }
    if (existing.receipt_status === ORDER_STATUS.CANCELLED) {
      sendValidationError(res, 'Metal receipt is already cancelled');
      return;
    }

    // An approved receipt already posted metal into a sub-inventory, so
    // cancelling it must back that posting out in the same transaction — a
    // receipt cancelled before approval never posted anything, so
    // reverseStockMovement is a no-op there.
    await prisma.$transaction(async (tx) => {
      await tx.metal_receipt.update({
        where: { id },
        data: {
          receipt_status: ORDER_STATUS.CANCELLED,
          cancel_reason:  reason,
          cancelled_at:   new Date(),
          updated_by:     req.user?.id ?? null,
          updated_at:     new Date(),
        },
      });

      if (existing.receipt_status === ORDER_STATUS.APPROVED) {
        await reverseStockMovement(tx, {
          sourceModule: ORDER_RECORD_TYPE.METAL_RECEIPT,
          sourceId:     id,
          createdBy:    req.user?.id ?? null,
          remarks:      `Metal receipt ${existing.receipt_number} cancelled${reason ? ` — ${reason}` : ''}`,
        });
      }
    });

    audit(req, 'DELETE', id,
      `Cancelled metal receipt: ${existing.receipt_number}${reason ? ` — ${reason}` : ''}`);

    sendSuccess(res, { id, receipt_status: ORDER_STATUS.CANCELLED },
      `Metal receipt ${existing.receipt_number} cancelled`);
  } catch (error) {
    sendError(res, 'Failed to cancel metal receipt', 500, (error as Error).message);
  }
};
