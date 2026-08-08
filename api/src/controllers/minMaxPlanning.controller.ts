import { Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { AUDIT_MODULE } from '../constants/auditModules';

const SORT_COLS: Record<string, string> = {
  itemtype:     'itemtype',
  sku_code:     'sku_code',
  min_quantity: 'min_quantity',
  max_quantity: 'max_quantity',
  moq_quantity: 'moq_quantity',
  min_weight:   'min_weight',
  max_weight:   'max_weight',
  moq_weight:   'moq_weight',
  order_base:   'order_base',
  created_at:   'created_at',
};

const NUMERIC_FIELDS: { key: string; label: string }[] = [
  { key: 'min_quantity', label: 'Min Quantity' },
  { key: 'max_quantity', label: 'Max Quantity' },
  { key: 'moq_quantity', label: 'MOQ Quantity' },
  { key: 'min_weight',   label: 'Min Weight' },
  { key: 'max_weight',   label: 'Max Weight' },
  { key: 'moq_weight',   label: 'MOQ Weight' },
];

/** Returns the first negative-value error message, or null if all fields are valid. */
const firstNegativeFieldError = (body: Record<string, unknown>): string | null => {
  for (const { key, label } of NUMERIC_FIELDS) {
    const raw = body[key];
    if (raw === undefined || raw === null || raw === '') continue;
    if (Number(raw) < 0) return `${label} cannot be negative`;
  }
  return null;
};

const numOrZero = (v: unknown): number => (v !== undefined && v !== null && v !== '') ? Number(v) : 0;
const isBlank   = (v: unknown): boolean => v === undefined || v === null || v === '';

const QTY_FIELDS = [
  { key: 'min_quantity', label: 'Min Quantity' },
  { key: 'max_quantity', label: 'Max Quantity' },
  { key: 'moq_quantity', label: 'MOQ Quantity' },
] as const;
const WT_FIELDS = [
  { key: 'min_weight', label: 'Min Weight' },
  { key: 'max_weight', label: 'Max Weight' },
  { key: 'moq_weight', label: 'MOQ Weight' },
] as const;

/** Quantity fields are whole numbers only — no decimals. */
const firstNonIntegerQtyError = (body: Record<string, unknown>): string | null => {
  for (const { key, label } of QTY_FIELDS) {
    const raw = body[key];
    if (isBlank(raw)) continue;
    if (!Number.isInteger(Number(raw))) return `${label} must be a whole number`;
  }
  return null;
};

/** Whichever section matches Order Base (Quantity or Weight) must have all three fields filled in. */
const mandatorySectionError = (body: Record<string, unknown>): string | null => {
  const fields = body.order_base === 'WEIGHT' ? WT_FIELDS : QTY_FIELDS;
  for (const { key, label } of fields) {
    if (isBlank(body[key])) return `${label} is required`;
  }
  return null;
};

/** MOQ must sit within [Min, Max] of its section; zero/blank values are treated as unset. */
const moqRangeError = (body: Record<string, unknown>): string | null => {
  const pos = (k: string): number | null => (numOrZero(body[k]) > 0 ? numOrZero(body[k]) : null);
  const moqQ = pos('moq_quantity'), minQ = pos('min_quantity'), maxQ = pos('max_quantity');
  const moqW = pos('moq_weight'),   minW = pos('min_weight'),   maxW = pos('max_weight');
  if (moqQ !== null && minQ !== null && moqQ < minQ) return 'MOQ Qty cannot be less than Min Qty.';
  if (moqQ !== null && maxQ !== null && moqQ > maxQ) return 'MOQ Qty cannot be greater than Max Qty.';
  if (moqW !== null && minW !== null && moqW < minW) return 'MOQ weight cannot be less than Min weight.';
  if (moqW !== null && maxW !== null && moqW > maxW) return 'MOQ weight cannot be greater than Max weight.';
  return null;
};

// ── GET /min-max-planning ───────────────────────────────────────
export const getMinMaxPlanning = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit   = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset  = (page - 1) * limit;
    const search  = ((req.query.search as string) || '').trim();
    const status  = (req.query.status as string) || 'active';
    const sortCol = SORT_COLS[req.query.sort_by as string] || 'sku_code';
    const sortDir = req.query.sort_dir === 'desc' ? 'desc' : 'asc';

    let cfObj: Record<string, string> = {};
    try {
      if (req.query.col_filters) cfObj = JSON.parse(req.query.col_filters as string);
    } catch { /* ignore */ }

    const AND: Prisma.min_max_planning_masterWhereInput[] = [];
    if (status === 'active')   AND.push({ is_active: true });
    if (status === 'inactive') AND.push({ is_active: false });

    if (search) {
      AND.push({
        OR: [
          { sku_code: { contains: search, mode: 'insensitive' } },
          { itemtype: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const CF_COLS = ['itemtype', 'sku_code', 'order_base'] as const;
    for (const col of CF_COLS) {
      const val = (cfObj[col] || '').trim();
      if (val) AND.push({ [col]: { contains: val, mode: 'insensitive' } });
    }

    const where: Prisma.min_max_planning_masterWhereInput = AND.length ? { AND } : {};

    const [total, dataRows] = await Promise.all([
      prisma.min_max_planning_master.count({ where }),
      prisma.min_max_planning_master.findMany({
        where,
        select: {
          id: true, itemtype: true, sku_code: true,
          min_quantity: true, max_quantity: true, moq_quantity: true,
          min_weight: true, max_weight: true, moq_weight: true,
          order_base: true, remarks: true, is_active: true,
          deactivation_reason: true, deactivated_at: true,
          created_at: true, updated_at: true,
        },
        orderBy: { [sortCol]: sortDir },
        skip: offset,
        take: limit,
      }),
    ]);

    const total_pages = Math.ceil(total / limit) || 1;

    sendSuccess(res, dataRows, 'Min/Max planning fetched', 200, { total, total_pages, page, limit });
  } catch (error) {
    sendError(res, 'Failed to fetch min/max planning', 500, (error as Error).message);
  }
};

// ── GET /min-max-planning/stats ──────────────────────────────────
export const getMinMaxPlanningStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [active, inactive] = await Promise.all([
      prisma.min_max_planning_master.count({ where: { is_active: true } }),
      prisma.min_max_planning_master.count({ where: { is_active: false } }),
    ]);
    sendSuccess(res, { active, inactive }, 'Stats fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch stats', 500, (error as Error).message);
  }
};

function buildData(body: Record<string, unknown>) {
  const order_base = body.order_base === 'WEIGHT' ? 'WEIGHT' : 'QUANTITY';
  return {
    itemtype:     String(body.itemtype ?? '').trim(),
    sku_code:     String(body.sku_code ?? '').trim(),
    min_quantity: numOrZero(body.min_quantity),
    max_quantity: numOrZero(body.max_quantity),
    moq_quantity: numOrZero(body.moq_quantity),
    min_weight:   numOrZero(body.min_weight),
    max_weight:   numOrZero(body.max_weight),
    moq_weight:   numOrZero(body.moq_weight),
    order_base,
    remarks:      (body.remarks as string)?.trim() || null,
  };
}

// ── POST /min-max-planning ───────────────────────────────────────
export const createMinMaxPlanning = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const itemtype = String(body.itemtype ?? '').trim();
    const sku_code = String(body.sku_code ?? '').trim();

    if (!itemtype || !sku_code) {
      sendValidationError(res, 'Item Type and Item are required');
      return;
    }

    const negError = firstNegativeFieldError(body);
    if (negError) { sendValidationError(res, negError); return; }

    const intError = firstNonIntegerQtyError(body);
    if (intError) { sendValidationError(res, intError); return; }

    const mandatoryError = mandatorySectionError(body);
    if (mandatoryError) { sendValidationError(res, mandatoryError); return; }

    const rangeError = moqRangeError(body);
    if (rangeError) { sendValidationError(res, rangeError); return; }

    const created = await prisma.min_max_planning_master.create({
      data: { ...buildData(body), is_active: true, created_by: req.user?.id ?? null },
      select: { id: true, sku_code: true },
    });

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'CREATE',
      module: AUDIT_MODULE.MIN_MAX_PLANNING,
      recordId:    created.id,
      description: `Created min/max plan: ${created.sku_code}`,
      newValues:   body,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id: created.id, sku_code: created.sku_code }, 'Min/Max plan created successfully', 201);
  } catch (error) {
    const err = error as Prisma.PrismaClientKnownRequestError & Error;
    if (err.code === 'P2002') {
      sendValidationError(res, 'A Min/Max plan for this item already exists');
      return;
    }
    sendError(res, 'Failed to create min/max plan', 500, err.message);
  }
};

// ── PUT /min-max-planning/:id ────────────────────────────────────
export const updateMinMaxPlanning = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const body = req.body as Record<string, unknown>;
    const itemtype = String(body.itemtype ?? '').trim();
    const sku_code = String(body.sku_code ?? '').trim();

    if (!itemtype || !sku_code) {
      sendValidationError(res, 'Item Type and Item are required');
      return;
    }

    const negError = firstNegativeFieldError(body);
    if (negError) { sendValidationError(res, negError); return; }

    const intError = firstNonIntegerQtyError(body);
    if (intError) { sendValidationError(res, intError); return; }

    const mandatoryError = mandatorySectionError(body);
    if (mandatoryError) { sendValidationError(res, mandatoryError); return; }

    const rangeError = moqRangeError(body);
    if (rangeError) { sendValidationError(res, rangeError); return; }

    let updated;
    try {
      updated = await prisma.min_max_planning_master.update({
        where: { id },
        data: { ...buildData(body), updated_by: req.user?.id ?? null, updated_at: new Date() },
        select: { id: true, sku_code: true },
      });
    } catch (err) {
      const e = err as Prisma.PrismaClientKnownRequestError;
      if (e.code === 'P2025') { sendError(res, 'Min/Max plan not found', 404); return; }
      if (e.code === 'P2002') { sendValidationError(res, 'A Min/Max plan for this item already exists'); return; }
      throw err;
    }

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'UPDATE',
      module: AUDIT_MODULE.MIN_MAX_PLANNING,
      recordId:    id,
      description: `Updated min/max plan: ${updated.sku_code}`,
      newValues:   body,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id }, 'Min/Max plan updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update min/max plan', 500, (error as Error).message);
  }
};

// ── DELETE /min-max-planning/:id  (toggle status) ────────────────
export const toggleMinMaxPlanningStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const { reason } = req.body as { reason?: string };

    // Atomic toggle — see Metal Master for why this stays a raw query.
    const rows = await prisma.$queryRaw<{ id: number; is_active: boolean; sku_code: string }[]>(
      Prisma.sql`
        UPDATE min_max_planning_master
        SET is_active           = NOT is_active,
            deactivation_reason = CASE WHEN is_active THEN ${reason?.trim() || null} ELSE NULL END,
            deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
            updated_at          = NOW()
        WHERE id = ${id}
        RETURNING id, is_active, sku_code
      `
    );

    if (rows.length === 0) { sendError(res, 'Min/Max plan not found', 404); return; }
    const updated = rows[0];

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'DELETE',
      module: AUDIT_MODULE.MIN_MAX_PLANNING,
      recordId:    id,
      description: `${updated.is_active ? 'Activated' : 'Deactivated'} min/max plan: ${updated.sku_code}${!updated.is_active && reason ? ` — ${reason}` : ''}`,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id, is_active: updated.is_active }, updated.is_active ? 'Min/Max plan activated' : 'Min/Max plan deactivated');
  } catch (error) {
    sendError(res, 'Failed to toggle min/max plan status', 500, (error as Error).message);
  }
};

// ── POST /min-max-planning/import ────────────────────────────────
export const importMinMaxPlanning = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows } = req.body as { rows: Record<string, unknown>[] };
    if (!rows?.length) { sendValidationError(res, 'No rows provided'); return; }

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const row of rows) {
      const itemtype = String(row.itemtype || '').trim().toUpperCase();
      const sku_code = String(row.sku_code || '').trim();
      if (!itemtype || !sku_code) { results.errors.push('Row skipped: missing itemtype or sku_code'); continue; }

      const negError = firstNegativeFieldError(row);
      if (negError) { results.errors.push(`${sku_code}: ${negError}`); continue; }

      const intError = firstNonIntegerQtyError(row);
      if (intError) { results.errors.push(`${sku_code}: ${intError}`); continue; }

      const mandatoryError = mandatorySectionError({ ...row, itemtype, sku_code });
      if (mandatoryError) { results.errors.push(`${sku_code}: ${mandatoryError}`); continue; }

      const rangeError = moqRangeError(row);
      if (rangeError) { results.errors.push(`${sku_code}: ${rangeError}`); continue; }

      try {
        await prisma.min_max_planning_master.create({
          data: { ...buildData({ ...row, itemtype, sku_code }), is_active: true, created_by: req.user?.id ?? null },
        });
        results.created++;
      } catch (err) {
        const e = err as Prisma.PrismaClientKnownRequestError & Error;
        if (e.code === 'P2002') { results.skipped++; }
        else { results.errors.push(`${sku_code}: ${e.message}`); }
      }
    }

    logAudit({
      userId: req.user?.id, employeeId: req.user?.employee_id,
      fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action: 'CREATE', module: AUDIT_MODULE.MIN_MAX_PLANNING,
      description: `Bulk import: ${results.created} created, ${results.skipped} skipped`,
      ipAddress: req.ip,
    });

    sendSuccess(res, results, `Import complete: ${results.created} created, ${results.skipped} skipped`);
  } catch (error) {
    sendError(res, 'Import failed', 500, (error as Error).message);
  }
};
