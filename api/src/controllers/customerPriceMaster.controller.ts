import { Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { AUDIT_MODULE } from '../constants/auditModules';

// Both tabs are a customer header with many price lines. The header owns the
// customer and the active/inactive status; a save replaces the whole line set,
// the same way Sales Order handles its lines.

const numOrZero = (v: unknown): number => (v !== undefined && v !== null && v !== '') ? Number(v) : 0;
const str = (v: unknown, max: number): string | null => {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, max) : null;
};

// UOM_RC lookup: GM/CT are valid for Per Weight (PER_GM) prices, PCS only for
// Per Pc (PER_PC) — the same pairing Supplier Rate Contract enforces. The weight
// fallback differs per tab: metal prices default to grams, stone prices to carats.
function normalizeRateFields(
  row: Record<string, unknown>,
  weightDefault: 'GM' | 'CT',
): { rate_basis: 'PER_GM' | 'PER_PC'; rate_type: 'AMOUNT' | 'PERCENTAGE'; uom: string } {
  const rate_basis: 'PER_GM' | 'PER_PC' = row.rate_basis === 'PER_PC' ? 'PER_PC' : 'PER_GM';
  const allowedUom = rate_basis === 'PER_PC' ? ['PCS'] : ['GM', 'CT'];
  const uomIn      = String(row.uom ?? '').trim().toUpperCase();
  const uom        = allowedUom.includes(uomIn)
    ? uomIn
    : (rate_basis === 'PER_PC' ? 'PCS' : weightDefault);

  return {
    rate_basis,
    rate_type: row.rate_type === 'PERCENTAGE' ? 'PERCENTAGE' : 'AMOUNT',
    uom,
  };
}

// Header lists are sorted by customer unless asked otherwise; the line columns
// that used to be sortable now live one level down.
const HDR_SORT_COLS: Record<string, string> = {
  customer_company_name: 'customer_company_name',
  customer_code:         'customer_code',
  created_at:            'created_at',
};

function parseListQuery(req: AuthRequest) {
  const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit   = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 10));
  const search  = ((req.query.search as string) || '').trim();
  const status  = (req.query.status as string) || 'active';
  const sortKey = HDR_SORT_COLS[req.query.sort_by as string] || 'customer_company_name';
  const sortDir: 'asc' | 'desc' = req.query.sort_dir === 'desc' ? 'desc' : 'asc';

  let cf: Record<string, string> = {};
  try {
    if (req.query.col_filters) cf = JSON.parse(req.query.col_filters as string) as Record<string, string>;
  } catch { /* ignore */ }

  return { page, limit, offset: (page - 1) * limit, search, status, sortKey, sortDir, cf };
}

// Customer-side where clause + orderBy, shared by both tabs (their header models
// are structurally identical).
function buildHdrWhere(search: string, status: string, cf: Record<string, string>) {
  const AND: Record<string, unknown>[] = [];
  if (status === 'active')   AND.push({ is_active: true });
  if (status === 'inactive') AND.push({ is_active: false });

  if (search) {
    AND.push({
      customer_master: {
        OR: [
          { customer_company_name: { contains: search, mode: 'insensitive' } },
          { customer_code:         { contains: search, mode: 'insensitive' } },
        ],
      },
    });
  }
  const nameFilter = (cf.customer_company_name || '').trim();
  if (nameFilter) AND.push({ customer_master: { customer_company_name: { contains: nameFilter, mode: 'insensitive' } } });
  const codeFilter = (cf.customer_code || '').trim();
  if (codeFilter) AND.push({ customer_master: { customer_code: { contains: codeFilter, mode: 'insensitive' } } });

  return AND.length ? { AND } : {};
}

function buildHdrOrderBy(sortKey: string, sortDir: 'asc' | 'desc') {
  if (sortKey === 'customer_company_name') return { customer_master: { customer_company_name: sortDir } };
  if (sortKey === 'customer_code')         return { customer_master: { customer_code: sortDir } };
  return { [sortKey]: sortDir };
}

// ════════════════════════════════════════════════════════════════
// METAL TAB
// ════════════════════════════════════════════════════════════════

// ── GET /customer-price/metal ────────────────────────────────────
// One row per customer, with the line count the grid shows.
export const getCustomerPriceMetals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, offset, search, status, sortKey, sortDir, cf } = parseListQuery(req);
    const where   = buildHdrWhere(search, status, cf) as Prisma.customer_price_metal_hdrWhereInput;
    const orderBy = buildHdrOrderBy(sortKey, sortDir) as Prisma.customer_price_metal_hdrOrderByWithRelationInput;

    const [total, rows] = await Promise.all([
      prisma.customer_price_metal_hdr.count({ where }),
      prisma.customer_price_metal_hdr.findMany({
        where, orderBy, skip: offset, take: limit,
        include: {
          customer_master:           { select: { customer_company_name: true, customer_code: true } },
          _count:                    { select: { customer_price_metal_line: true } },
        },
      }),
    ]);

    const dataRows = rows.map(({ customer_master, _count, ...rest }) => ({
      ...rest,
      customer_company_name: customer_master.customer_company_name,
      customer_code:         customer_master.customer_code,
      line_count:            _count.customer_price_metal_line,
    }));

    sendSuccess(res, dataRows, 'Customer price (metal) fetched', 200, {
      total, total_pages: Math.ceil(total / limit) || 1, page, limit,
    });
  } catch (error) {
    sendError(res, 'Failed to fetch customer price (metal)', 500, (error as Error).message);
  }
};

// ── GET /customer-price/metal/stats ──────────────────────────────
export const getCustomerPriceMetalStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [active, inactive] = await Promise.all([
      prisma.customer_price_metal_hdr.count({ where: { is_active: true } }),
      prisma.customer_price_metal_hdr.count({ where: { is_active: false } }),
    ]);
    sendSuccess(res, { active, inactive }, 'Stats fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch stats', 500, (error as Error).message);
  }
};

// ── GET /customer-price/metal/:id ────────────────────────────────
export const getCustomerPriceMetalById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const hdr = await prisma.customer_price_metal_hdr.findUnique({
      where: { id },
      include: {
        customer_master:           { select: { customer_company_name: true, customer_code: true } },
        customer_price_metal_line: { orderBy: { line_no: 'asc' } },
      },
    });
    if (!hdr) { sendError(res, 'Customer price (metal) not found', 404); return; }

    const { customer_master, customer_price_metal_line, ...rest } = hdr;
    sendSuccess(res, {
      ...rest,
      customer_company_name: customer_master.customer_company_name,
      customer_code:         customer_master.customer_code,
      lines:                 customer_price_metal_line,
    }, 'Customer price (metal) fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch customer price (metal)', 500, (error as Error).message);
  }
};

interface MetalLineInput {
  line_no:              number;
  sales_group_code:     string | null;
  itemtype:             string;
  sku_code:             string;
  rate_basis:           'PER_GM' | 'PER_PC';
  rate_type:            'AMOUNT' | 'PERCENTAGE';
  rate_value:           number;
  uom:                  string;
  rhodium_amt:          number;
  tricolor_rhodium_amt: number;
  lobster_amt:          number;
  silky_rope_amt:       number;
  hallmark_amt:         number;
  remarks:              string | null;
}

function parseMetalBody(body: Record<string, unknown>):
  { error: string } | { customer_id: number; remarks: string | null; lines: MetalLineInput[] } {

  const customer_id = parseInt(String(body.customer_id ?? ''), 10);
  if (!customer_id) return { error: 'Customer is required' };

  const rawLines = Array.isArray(body.lines) ? body.lines as Record<string, unknown>[] : [];
  const lines: MetalLineInput[] = [];
  // Catches a duplicate before the DB does, so the message can name the SKU
  // rather than surfacing a constraint violation.
  const seen = new Set<string>();

  for (let i = 0; i < rawLines.length; i++) {
    const l        = rawLines[i];
    const itemtype = String(l.itemtype ?? '').trim();
    const sku_code = String(l.sku_code ?? '').trim();

    // Drop rows the user added but never filled in
    if (!itemtype && !sku_code && !numOrZero(l.rate_value)) continue;

    if (!itemtype) return { error: `Line ${i + 1}: Item Type is required` };
    if (!sku_code) return { error: `Line ${i + 1}: SKU Code is required` };

    const key = `${itemtype}|${sku_code}`;
    if (seen.has(key)) return { error: `Line ${i + 1}: ${sku_code} is already priced on another line` };
    seen.add(key);

    const rate_value = numOrZero(l.rate_value);
    if (rate_value < 0) return { error: `Line ${i + 1}: Rate cannot be negative` };

    const plating = ['rhodium_amt', 'tricolor_rhodium_amt', 'lobster_amt', 'silky_rope_amt'] as const;
    for (const f of plating) {
      if (numOrZero(l[f]) < 0) return { error: `Line ${i + 1}: Plating & Finishing amounts cannot be negative` };
    }
    const hallmark_amt = numOrZero(l.hallmark_amt);
    if (hallmark_amt < 0) return { error: `Line ${i + 1}: Hallmark amount cannot be negative` };

    lines.push({
      line_no:              lines.length + 1,
      // Defaulted from the picked item's master record, so it can legitimately
      // be empty for item types that carry no sales group.
      sales_group_code:     str(l.sales_group_code, 50),
      itemtype,
      sku_code,
      ...normalizeRateFields(l, 'GM'),
      rate_value,
      rhodium_amt:          numOrZero(l.rhodium_amt),
      tricolor_rhodium_amt: numOrZero(l.tricolor_rhodium_amt),
      lobster_amt:          numOrZero(l.lobster_amt),
      silky_rope_amt:       numOrZero(l.silky_rope_amt),
      hallmark_amt,
      remarks:              str(l.remarks, 500),
    });
  }

  if (lines.length === 0) return { error: 'At least one price line is required' };

  return { customer_id, remarks: str(body.remarks, 500), lines };
}

// ── POST /customer-price/metal ───────────────────────────────────
export const createCustomerPriceMetal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = parseMetalBody(req.body as Record<string, unknown>);
    if ('error' in parsed) { sendValidationError(res, parsed.error); return; }

    const created = await prisma.$transaction(async (tx) => {
      const hdr = await tx.customer_price_metal_hdr.create({
        data: {
          customer_id: parsed.customer_id,
          remarks:     parsed.remarks,
          is_active:   true,
          created_by:  req.user?.id ?? null,
        },
        select: { id: true },
      });
      await tx.customer_price_metal_line.createMany({
        data: parsed.lines.map(l => ({ ...l, hdr_id: hdr.id })),
      });
      return hdr;
    });

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'CREATE',
      module:      AUDIT_MODULE.CUSTOMER_PRICE_METAL,
      recordId:    created.id,
      description: `Created customer price (metal) with ${parsed.lines.length} line(s)`,
      newValues:   req.body,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id: created.id }, 'Customer price (metal) created successfully', 201);
  } catch (error) {
    const err = error as Prisma.PrismaClientKnownRequestError & Error;
    if (err.code === 'P2002') {
      sendValidationError(res, 'This customer already has a metal price sheet — edit that one instead');
      return;
    }
    sendError(res, 'Failed to create customer price (metal)', 500, err.message);
  }
};

// ── PUT /customer-price/metal/:id ────────────────────────────────
export const updateCustomerPriceMetal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const parsed = parseMetalBody(req.body as Record<string, unknown>);
    if ('error' in parsed) { sendValidationError(res, parsed.error); return; }

    const existing = await prisma.customer_price_metal_hdr.findUnique({ where: { id }, select: { id: true } });
    if (!existing) { sendError(res, 'Customer price (metal) not found', 404); return; }

    await prisma.$transaction(async (tx) => {
      await tx.customer_price_metal_line.deleteMany({ where: { hdr_id: id } });
      await tx.customer_price_metal_line.createMany({
        data: parsed.lines.map(l => ({ ...l, hdr_id: id })),
      });
      await tx.customer_price_metal_hdr.update({
        where: { id },
        data: {
          customer_id: parsed.customer_id,
          remarks:     parsed.remarks,
          updated_by:  req.user?.id ?? null,
          updated_at:  new Date(),
        },
      });
    });

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'UPDATE',
      module:      AUDIT_MODULE.CUSTOMER_PRICE_METAL,
      recordId:    id,
      description: `Updated customer price (metal) — ${parsed.lines.length} line(s)`,
      newValues:   req.body,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id }, 'Customer price (metal) updated successfully');
  } catch (error) {
    const err = error as Prisma.PrismaClientKnownRequestError & Error;
    if (err.code === 'P2002') {
      sendValidationError(res, 'This customer already has a metal price sheet — edit that one instead');
      return;
    }
    sendError(res, 'Failed to update customer price (metal)', 500, err.message);
  }
};

// ── DELETE /customer-price/metal/:id (toggle status) ─────────────
export const toggleCustomerPriceMetalStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const { reason } = req.body as { reason?: string };

    const rows = await prisma.$queryRaw<{ id: number; is_active: boolean }[]>(
      Prisma.sql`
        UPDATE customer_price_metal_hdr
        SET is_active           = NOT is_active,
            deactivation_reason = CASE WHEN is_active THEN ${reason?.trim() || null} ELSE NULL END,
            deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
            updated_at          = NOW()
        WHERE id = ${id}
        RETURNING id, is_active
      `
    );

    if (rows.length === 0) { sendError(res, 'Customer price (metal) not found', 404); return; }
    const updated = rows[0];

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'DELETE',
      module:      AUDIT_MODULE.CUSTOMER_PRICE_METAL,
      recordId:    id,
      description: `${updated.is_active ? 'Activated' : 'Deactivated'} customer price (metal)${!updated.is_active && reason ? ` — ${reason}` : ''}`,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id, is_active: updated.is_active },
      updated.is_active ? 'Customer price (metal) activated' : 'Customer price (metal) deactivated');
  } catch (error) {
    sendError(res, 'Failed to toggle customer price (metal) status', 500, (error as Error).message);
  }
};

// ── POST /customer-price/metal/import ─────────────────────────────
// The CSV stays one row per price line; rows are grouped onto the customer's
// header, which is created on first sight.
export const importCustomerPriceMetal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows } = req.body as { rows: Record<string, unknown>[] };
    if (!rows?.length) { sendValidationError(res, 'No rows provided'); return; }

    const results = { created: 0, skipped: 0, errors: [] as string[] };
    const hdrCache = new Map<string, number>();

    for (const row of rows) {
      const customer_code = String(row.customer_code || '').trim();
      const itemtype      = String(row.itemtype || '').trim().toUpperCase();
      const sku_code      = String(row.sku_code || '').trim();
      if (!customer_code || !itemtype || !sku_code) {
        results.errors.push('Row skipped: missing customer_code, itemtype or sku_code');
        continue;
      }

      let hdrId = hdrCache.get(customer_code);
      if (!hdrId) {
        const cust = await prisma.customer_master.findUnique({ where: { customer_code }, select: { id: true } });
        if (!cust) { results.errors.push(`${customer_code}: Customer code not found`); continue; }
        const hdr = await prisma.customer_price_metal_hdr.upsert({
          where:  { customer_id: cust.id },
          update: {},
          create: { customer_id: cust.id, is_active: true, created_by: req.user?.id ?? null },
          select: { id: true },
        });
        hdrId = hdr.id;
        hdrCache.set(customer_code, hdrId);
      }

      const rate_value = numOrZero(row.rate_value);
      if (rate_value < 0) { results.errors.push(`${sku_code}: Rate cannot be negative`); continue; }

      try {
        const lineCount = await prisma.customer_price_metal_line.count({ where: { hdr_id: hdrId } });
        await prisma.customer_price_metal_line.create({
          data: {
            hdr_id:  hdrId,
            line_no: lineCount + 1,
            sales_group_code: str(row.sales_group_code, 50),
            itemtype, sku_code,
            ...normalizeRateFields(row, 'GM'),
            rate_value,
            rhodium_amt:          numOrZero(row.rhodium_amt),
            tricolor_rhodium_amt: numOrZero(row.tricolor_rhodium_amt),
            lobster_amt:          numOrZero(row.lobster_amt),
            silky_rope_amt:       numOrZero(row.silky_rope_amt),
            hallmark_amt:         numOrZero(row.hallmark_amt),
            remarks:              str(row.remarks, 500),
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
      action: 'CREATE', module: AUDIT_MODULE.CUSTOMER_PRICE_METAL,
      description: `Bulk import: ${results.created} line(s) created, ${results.skipped} skipped`,
      ipAddress: req.ip,
    });

    sendSuccess(res, results, `Import complete: ${results.created} created, ${results.skipped} skipped`);
  } catch (error) {
    sendError(res, 'Import failed', 500, (error as Error).message);
  }
};

// ════════════════════════════════════════════════════════════════
// STONE TAB
// ════════════════════════════════════════════════════════════════

// ── GET /customer-price/stone ────────────────────────────────────
export const getCustomerPriceStones = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, offset, search, status, sortKey, sortDir, cf } = parseListQuery(req);
    const where   = buildHdrWhere(search, status, cf) as Prisma.customer_price_stone_hdrWhereInput;
    const orderBy = buildHdrOrderBy(sortKey, sortDir) as Prisma.customer_price_stone_hdrOrderByWithRelationInput;

    const [total, rows] = await Promise.all([
      prisma.customer_price_stone_hdr.count({ where }),
      prisma.customer_price_stone_hdr.findMany({
        where, orderBy, skip: offset, take: limit,
        include: {
          customer_master: { select: { customer_company_name: true, customer_code: true } },
          _count:          { select: { customer_price_stone_line: true } },
        },
      }),
    ]);

    const dataRows = rows.map(({ customer_master, _count, ...rest }) => ({
      ...rest,
      customer_company_name: customer_master.customer_company_name,
      customer_code:         customer_master.customer_code,
      line_count:            _count.customer_price_stone_line,
    }));

    sendSuccess(res, dataRows, 'Customer price (stone) fetched', 200, {
      total, total_pages: Math.ceil(total / limit) || 1, page, limit,
    });
  } catch (error) {
    sendError(res, 'Failed to fetch customer price (stone)', 500, (error as Error).message);
  }
};

// ── GET /customer-price/stone/stats ──────────────────────────────
export const getCustomerPriceStoneStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [active, inactive] = await Promise.all([
      prisma.customer_price_stone_hdr.count({ where: { is_active: true } }),
      prisma.customer_price_stone_hdr.count({ where: { is_active: false } }),
    ]);
    sendSuccess(res, { active, inactive }, 'Stats fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch stats', 500, (error as Error).message);
  }
};

// ── GET /customer-price/stone/:id ────────────────────────────────
export const getCustomerPriceStoneById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const hdr = await prisma.customer_price_stone_hdr.findUnique({
      where: { id },
      include: {
        customer_master:           { select: { customer_company_name: true, customer_code: true } },
        customer_price_stone_line: { orderBy: { line_no: 'asc' } },
      },
    });
    if (!hdr) { sendError(res, 'Customer price (stone) not found', 404); return; }

    const { customer_master, customer_price_stone_line, ...rest } = hdr;
    sendSuccess(res, {
      ...rest,
      customer_company_name: customer_master.customer_company_name,
      customer_code:         customer_master.customer_code,
      lines:                 customer_price_stone_line,
    }, 'Customer price (stone) fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch customer price (stone)', 500, (error as Error).message);
  }
};

interface StoneLineInput {
  line_no:    number;
  stone_name: string;
  stone_code: string;
  rate_basis: 'PER_GM' | 'PER_PC';
  rate_type:  'AMOUNT' | 'PERCENTAGE';
  rate_value: number;
  uom:        string;
  remarks:    string | null;
}

function parseStoneBody(body: Record<string, unknown>):
  { error: string } | { customer_id: number; remarks: string | null; lines: StoneLineInput[] } {

  const customer_id = parseInt(String(body.customer_id ?? ''), 10);
  if (!customer_id) return { error: 'Customer is required' };

  const rawLines = Array.isArray(body.lines) ? body.lines as Record<string, unknown>[] : [];
  const lines: StoneLineInput[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < rawLines.length; i++) {
    const l          = rawLines[i];
    const stone_name = String(l.stone_name ?? '').trim();
    const stone_code = String(l.stone_code ?? '').trim() || 'ALL';

    if (!stone_name && !numOrZero(l.rate_value)) continue;
    if (!stone_name) return { error: `Line ${i + 1}: Stone Name is required` };

    const key = `${stone_name}|${stone_code}`;
    if (seen.has(key)) return { error: `Line ${i + 1}: ${stone_code} is already priced on another line` };
    seen.add(key);

    const rate_value = numOrZero(l.rate_value);
    if (rate_value < 0) return { error: `Line ${i + 1}: Rate cannot be negative` };

    lines.push({
      line_no: lines.length + 1,
      stone_name,
      stone_code,
      ...normalizeRateFields(l, 'CT'),
      rate_value,
      remarks: str(l.remarks, 500),
    });
  }

  if (lines.length === 0) return { error: 'At least one price line is required' };

  return { customer_id, remarks: str(body.remarks, 500), lines };
}

// ── POST /customer-price/stone ───────────────────────────────────
export const createCustomerPriceStone = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = parseStoneBody(req.body as Record<string, unknown>);
    if ('error' in parsed) { sendValidationError(res, parsed.error); return; }

    const created = await prisma.$transaction(async (tx) => {
      const hdr = await tx.customer_price_stone_hdr.create({
        data: {
          customer_id: parsed.customer_id,
          remarks:     parsed.remarks,
          is_active:   true,
          created_by:  req.user?.id ?? null,
        },
        select: { id: true },
      });
      await tx.customer_price_stone_line.createMany({
        data: parsed.lines.map(l => ({ ...l, hdr_id: hdr.id })),
      });
      return hdr;
    });

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'CREATE',
      module:      AUDIT_MODULE.CUSTOMER_PRICE_STONE,
      recordId:    created.id,
      description: `Created customer price (stone) with ${parsed.lines.length} line(s)`,
      newValues:   req.body,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id: created.id }, 'Customer price (stone) created successfully', 201);
  } catch (error) {
    const err = error as Prisma.PrismaClientKnownRequestError & Error;
    if (err.code === 'P2002') {
      sendValidationError(res, 'This customer already has a stone price sheet — edit that one instead');
      return;
    }
    sendError(res, 'Failed to create customer price (stone)', 500, err.message);
  }
};

// ── PUT /customer-price/stone/:id ────────────────────────────────
export const updateCustomerPriceStone = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const parsed = parseStoneBody(req.body as Record<string, unknown>);
    if ('error' in parsed) { sendValidationError(res, parsed.error); return; }

    const existing = await prisma.customer_price_stone_hdr.findUnique({ where: { id }, select: { id: true } });
    if (!existing) { sendError(res, 'Customer price (stone) not found', 404); return; }

    await prisma.$transaction(async (tx) => {
      await tx.customer_price_stone_line.deleteMany({ where: { hdr_id: id } });
      await tx.customer_price_stone_line.createMany({
        data: parsed.lines.map(l => ({ ...l, hdr_id: id })),
      });
      await tx.customer_price_stone_hdr.update({
        where: { id },
        data: {
          customer_id: parsed.customer_id,
          remarks:     parsed.remarks,
          updated_by:  req.user?.id ?? null,
          updated_at:  new Date(),
        },
      });
    });

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'UPDATE',
      module:      AUDIT_MODULE.CUSTOMER_PRICE_STONE,
      recordId:    id,
      description: `Updated customer price (stone) — ${parsed.lines.length} line(s)`,
      newValues:   req.body,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id }, 'Customer price (stone) updated successfully');
  } catch (error) {
    const err = error as Prisma.PrismaClientKnownRequestError & Error;
    if (err.code === 'P2002') {
      sendValidationError(res, 'This customer already has a stone price sheet — edit that one instead');
      return;
    }
    sendError(res, 'Failed to update customer price (stone)', 500, err.message);
  }
};

// ── DELETE /customer-price/stone/:id (toggle status) ──────────────
export const toggleCustomerPriceStoneStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const { reason } = req.body as { reason?: string };

    const rows = await prisma.$queryRaw<{ id: number; is_active: boolean }[]>(
      Prisma.sql`
        UPDATE customer_price_stone_hdr
        SET is_active           = NOT is_active,
            deactivation_reason = CASE WHEN is_active THEN ${reason?.trim() || null} ELSE NULL END,
            deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
            updated_at          = NOW()
        WHERE id = ${id}
        RETURNING id, is_active
      `
    );

    if (rows.length === 0) { sendError(res, 'Customer price (stone) not found', 404); return; }
    const updated = rows[0];

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'DELETE',
      module:      AUDIT_MODULE.CUSTOMER_PRICE_STONE,
      recordId:    id,
      description: `${updated.is_active ? 'Activated' : 'Deactivated'} customer price (stone)${!updated.is_active && reason ? ` — ${reason}` : ''}`,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id, is_active: updated.is_active },
      updated.is_active ? 'Customer price (stone) activated' : 'Customer price (stone) deactivated');
  } catch (error) {
    sendError(res, 'Failed to toggle customer price (stone) status', 500, (error as Error).message);
  }
};

// ── POST /customer-price/stone/import ─────────────────────────────
export const importCustomerPriceStone = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows } = req.body as { rows: Record<string, unknown>[] };
    if (!rows?.length) { sendValidationError(res, 'No rows provided'); return; }

    const results = { created: 0, skipped: 0, errors: [] as string[] };
    const hdrCache = new Map<string, number>();

    for (const row of rows) {
      const customer_code = String(row.customer_code || '').trim();
      const stone_name    = String(row.stone_name || '').trim().toUpperCase();
      const stone_code    = String(row.stone_code || '').trim().toUpperCase() || 'ALL';
      if (!customer_code || !stone_name) {
        results.errors.push('Row skipped: missing customer_code or stone_name');
        continue;
      }

      let hdrId = hdrCache.get(customer_code);
      if (!hdrId) {
        const cust = await prisma.customer_master.findUnique({ where: { customer_code }, select: { id: true } });
        if (!cust) { results.errors.push(`${customer_code}: Customer code not found`); continue; }
        const hdr = await prisma.customer_price_stone_hdr.upsert({
          where:  { customer_id: cust.id },
          update: {},
          create: { customer_id: cust.id, is_active: true, created_by: req.user?.id ?? null },
          select: { id: true },
        });
        hdrId = hdr.id;
        hdrCache.set(customer_code, hdrId);
      }

      const rate_value = numOrZero(row.rate_value);
      if (rate_value < 0) { results.errors.push(`${stone_name}: Rate cannot be negative`); continue; }

      try {
        const lineCount = await prisma.customer_price_stone_line.count({ where: { hdr_id: hdrId } });
        await prisma.customer_price_stone_line.create({
          data: {
            hdr_id:  hdrId,
            line_no: lineCount + 1,
            stone_name, stone_code,
            ...normalizeRateFields(row, 'CT'),
            rate_value,
            remarks: str(row.remarks, 500),
          },
        });
        results.created++;
      } catch (err) {
        const e = err as Prisma.PrismaClientKnownRequestError & Error;
        if (e.code === 'P2002') { results.skipped++; }
        else { results.errors.push(`${stone_name}: ${e.message}`); }
      }
    }

    logAudit({
      userId: req.user?.id, employeeId: req.user?.employee_id,
      fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action: 'CREATE', module: AUDIT_MODULE.CUSTOMER_PRICE_STONE,
      description: `Bulk import: ${results.created} line(s) created, ${results.skipped} skipped`,
      ipAddress: req.ip,
    });

    sendSuccess(res, results, `Import complete: ${results.created} created, ${results.skipped} skipped`);
  } catch (error) {
    sendError(res, 'Import failed', 500, (error as Error).message);
  }
};
