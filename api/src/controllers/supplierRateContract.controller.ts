import { Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { AUDIT_MODULE } from '../constants/auditModules';

const SORT_COLS: Record<string, string> = {
  vendor_company_name: 'vendor_company_name',
  itemtype:            'itemtype',
  sku_code:            'sku_code',
  rate_basis:          'rate_basis',
  rate_type:           'rate_type',
  rate_value:          'rate_value',
  uom:                 'uom',
  created_at:          'created_at',
};

const numOrZero = (v: unknown): number => (v !== undefined && v !== null && v !== '') ? Number(v) : 0;

// ── GET /supplier-rate-contract ──────────────────────────────────
// vendor_code/vendor_company_name come from an inner join to
// supplier_master via the vendor_id relation (non-nullable FK, so
// Prisma's `include` performs the equivalent of the original JOIN,
// not a LEFT JOIN) — flattened into the response shape below to
// match the original query's flat column list.
export const getSupplierRateContracts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit   = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset  = (page - 1) * limit;
    const search  = ((req.query.search as string) || '').trim();
    const status  = (req.query.status as string) || 'active';
    const sortKey = SORT_COLS[req.query.sort_by as string] || 'vendor_company_name';
    const sortDir = req.query.sort_dir === 'desc' ? 'desc' : 'asc';

    let cfObj: Record<string, string> = {};
    try {
      if (req.query.col_filters) cfObj = JSON.parse(req.query.col_filters as string);
    } catch { /* ignore */ }

    const AND: Prisma.supplier_rate_contractWhereInput[] = [];
    if (status === 'active')   AND.push({ is_active: true });
    if (status === 'inactive') AND.push({ is_active: false });

    if (search) {
      AND.push({
        OR: [
          { sku_code: { contains: search, mode: 'insensitive' } },
          { itemtype: { contains: search, mode: 'insensitive' } },
          { supplier_master: { vendor_company_name: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    const directCols = ['itemtype', 'sku_code', 'rate_basis', 'rate_type', 'uom'] as const;
    for (const col of directCols) {
      const val = (cfObj[col] || '').trim();
      if (val) AND.push({ [col]: { contains: val, mode: 'insensitive' } });
    }
    const vendorFilter = (cfObj.vendor_company_name || '').trim();
    if (vendorFilter) AND.push({ supplier_master: { vendor_company_name: { contains: vendorFilter, mode: 'insensitive' } } });

    const where: Prisma.supplier_rate_contractWhereInput = AND.length ? { AND } : {};

    const orderBy: Prisma.supplier_rate_contractOrderByWithRelationInput =
      sortKey === 'vendor_company_name'
        ? { supplier_master: { vendor_company_name: sortDir } }
        : { [sortKey]: sortDir };

    const [total, rows] = await Promise.all([
      prisma.supplier_rate_contract.count({ where }),
      prisma.supplier_rate_contract.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        select: {
          id: true, vendor_id: true, itemtype: true, sku_code: true,
          rate_basis: true, rate_type: true, rate_value: true, uom: true,
          remarks: true, is_active: true, deactivation_reason: true, deactivated_at: true,
          created_at: true, updated_at: true,
          supplier_master: { select: { vendor_code: true, vendor_company_name: true } },
        },
      }),
    ]);

    const dataRows = rows.map(({ supplier_master, ...rest }) => ({
      ...rest,
      vendor_code:         supplier_master.vendor_code,
      vendor_company_name: supplier_master.vendor_company_name,
    }));

    const total_pages = Math.ceil(total / limit) || 1;

    sendSuccess(res, dataRows, 'Supplier rate contracts fetched', 200, { total, total_pages, page, limit });
  } catch (error) {
    sendError(res, 'Failed to fetch supplier rate contracts', 500, (error as Error).message);
  }
};

// ── GET /supplier-rate-contract/stats ────────────────────────────
export const getSupplierRateContractStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [active, inactive] = await Promise.all([
      prisma.supplier_rate_contract.count({ where: { is_active: true } }),
      prisma.supplier_rate_contract.count({ where: { is_active: false } }),
    ]);
    sendSuccess(res, { active, inactive }, 'Stats fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch stats', 500, (error as Error).message);
  }
};

// UOM_RC lookup: GM/CT are valid for Per Weight (PER_GM) contracts,
// PCS is valid only for Per Pc (PER_PC) contracts.
function normalizeRateFields(body: Record<string, unknown>) {
  const rate_basis = body.rate_basis === 'PER_PC' ? 'PER_PC' : 'PER_GM';
  const allowedUom = rate_basis === 'PER_PC' ? ['PCS'] : ['GM', 'CT'];
  const uomIn      = String(body.uom ?? '').trim().toUpperCase();
  const uom        = allowedUom.includes(uomIn) ? uomIn : allowedUom[0];

  return {
    rate_basis,
    rate_type: body.rate_type === 'PERCENTAGE' ? 'PERCENTAGE' : 'AMOUNT',
    uom,
  };
}

// ── POST /supplier-rate-contract ─────────────────────────────────
export const createSupplierRateContract = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const vendor_id = parseInt(String(body.vendor_id ?? ''), 10);
    const itemtype  = String(body.itemtype ?? '').trim();
    const sku_code  = String(body.sku_code ?? '').trim();

    if (!vendor_id || !itemtype || !sku_code) {
      sendValidationError(res, 'Vendor, Item Type and Item are required');
      return;
    }

    const rate_value = numOrZero(body.rate_value);
    if (rate_value < 0) { sendValidationError(res, 'Rate cannot be negative'); return; }

    const created = await prisma.supplier_rate_contract.create({
      data: {
        vendor_id, itemtype, sku_code,
        ...normalizeRateFields(body),
        rate_value,
        remarks:    (body.remarks as string)?.trim() || null,
        is_active:  true,
        created_by: req.user?.id ?? null,
      },
      select: { id: true, sku_code: true },
    });

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'CREATE',
      module: AUDIT_MODULE.SUPPLIER_RATE_CONTRACT,
      recordId:    created.id,
      description: `Created supplier rate contract: ${created.sku_code}`,
      newValues:   body,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id: created.id, sku_code: created.sku_code }, 'Supplier rate contract created successfully', 201);
  } catch (error) {
    const err = error as Prisma.PrismaClientKnownRequestError & Error;
    if (err.code === 'P2002') {
      sendValidationError(res, 'A rate contract for this vendor/item already exists');
      return;
    }
    sendError(res, 'Failed to create supplier rate contract', 500, err.message);
  }
};

// ── PUT /supplier-rate-contract/:id ──────────────────────────────
export const updateSupplierRateContract = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const body = req.body as Record<string, unknown>;
    const vendor_id = parseInt(String(body.vendor_id ?? ''), 10);
    const itemtype  = String(body.itemtype ?? '').trim();
    const sku_code  = String(body.sku_code ?? '').trim();

    if (!vendor_id || !itemtype || !sku_code) {
      sendValidationError(res, 'Vendor, Item Type and Item are required');
      return;
    }

    const rate_value = numOrZero(body.rate_value);
    if (rate_value < 0) { sendValidationError(res, 'Rate cannot be negative'); return; }

    let updated;
    try {
      updated = await prisma.supplier_rate_contract.update({
        where: { id },
        data: {
          vendor_id, itemtype, sku_code,
          ...normalizeRateFields(body),
          rate_value,
          remarks:    (body.remarks as string)?.trim() || null,
          updated_by: req.user?.id ?? null,
          updated_at: new Date(),
        },
        select: { id: true, sku_code: true },
      });
    } catch (err) {
      const e = err as Prisma.PrismaClientKnownRequestError;
      if (e.code === 'P2025') { sendError(res, 'Supplier rate contract not found', 404); return; }
      if (e.code === 'P2002') { sendValidationError(res, 'A rate contract for this vendor/item already exists'); return; }
      throw err;
    }

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'UPDATE',
      module: AUDIT_MODULE.SUPPLIER_RATE_CONTRACT,
      recordId:    id,
      description: `Updated supplier rate contract: ${updated.sku_code}`,
      newValues:   body,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id }, 'Supplier rate contract updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update supplier rate contract', 500, (error as Error).message);
  }
};

// ── DELETE /supplier-rate-contract/:id  (toggle status) ──────────
export const toggleSupplierRateContractStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const { reason } = req.body as { reason?: string };

    const rows = await prisma.$queryRaw<{ id: number; is_active: boolean; sku_code: string }[]>(
      Prisma.sql`
        UPDATE supplier_rate_contract
        SET is_active           = NOT is_active,
            deactivation_reason = CASE WHEN is_active THEN ${reason?.trim() || null} ELSE NULL END,
            deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
            updated_at          = NOW()
        WHERE id = ${id}
        RETURNING id, is_active, sku_code
      `
    );

    if (rows.length === 0) { sendError(res, 'Supplier rate contract not found', 404); return; }
    const updated = rows[0];

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'DELETE',
      module: AUDIT_MODULE.SUPPLIER_RATE_CONTRACT,
      recordId:    id,
      description: `${updated.is_active ? 'Activated' : 'Deactivated'} supplier rate contract: ${updated.sku_code}${!updated.is_active && reason ? ` — ${reason}` : ''}`,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id, is_active: updated.is_active }, updated.is_active ? 'Supplier rate contract activated' : 'Supplier rate contract deactivated');
  } catch (error) {
    sendError(res, 'Failed to toggle supplier rate contract status', 500, (error as Error).message);
  }
};

// ── POST /supplier-rate-contract/import ──────────────────────────
export const importSupplierRateContract = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows } = req.body as { rows: Record<string, unknown>[] };
    if (!rows?.length) { sendValidationError(res, 'No rows provided'); return; }

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const row of rows) {
      const vendor_code = String(row.vendor_code || '').trim();
      const itemtype     = String(row.itemtype || '').trim().toUpperCase();
      const sku_code     = String(row.sku_code || '').trim();
      if (!vendor_code || !itemtype || !sku_code) { results.errors.push('Row skipped: missing vendor_code, itemtype or sku_code'); continue; }

      const vendor = await prisma.supplier_master.findUnique({ where: { vendor_code }, select: { id: true } });
      const vendor_id = vendor?.id;
      if (!vendor_id) { results.errors.push(`${vendor_code}: Vendor code not found`); continue; }

      const rate_value = numOrZero(row.rate_value);
      if (rate_value < 0) { results.errors.push(`${sku_code}: Rate cannot be negative`); continue; }

      try {
        await prisma.supplier_rate_contract.create({
          data: {
            vendor_id, itemtype, sku_code,
            ...normalizeRateFields(row),
            rate_value,
            remarks:    (row.remarks as string)?.trim() || null,
            is_active:  true,
            created_by: req.user?.id ?? null,
          },
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
      action: 'CREATE', module: AUDIT_MODULE.SUPPLIER_RATE_CONTRACT,
      description: `Bulk import: ${results.created} created, ${results.skipped} skipped`,
      ipAddress: req.ip,
    });

    sendSuccess(res, results, `Import complete: ${results.created} created, ${results.skipped} skipped`);
  } catch (error) {
    sendError(res, 'Import failed', 500, (error as Error).message);
  }
};
