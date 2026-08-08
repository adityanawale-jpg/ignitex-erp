import { Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { AUDIT_MODULE } from '../constants/auditModules';
import { cacheGetJson, cacheSetJson, cacheDelPattern } from '../utils/redisClient';

// Every text field on a lookup row (Type, Code, Name, Value, Parent Code)
// is capitals + digits + hyphen only. Mirrors CODE_CHARS_RE / toCodeFormat
// on the frontend (LookupMasterPage.tsx) — enforced here too since the
// frontend check alone doesn't cover a direct API call.
const CODE_CHARS_RE = /^[A-Z0-9-]+$/;
const toCode = (s: string): string => s.trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '');

const LOOKUP_CACHE_TTL = 5 * 60;
const lovKey = (type: string) => `lookup:lov:${type}`;
const typesKey = () => 'lookup:types';
// Deactivating/editing/creating a lookup can affect any type's LOV or the
// type list itself, so a write just clears everything under lookup:*
// rather than tracking which specific type changed.
const invalidateLookupCache = () => cacheDelPattern('lookup:*');

const SORT_COLS: Record<string, string> = {
  lookup_type:   'lookup_type',
  lookup_code:   'lookup_code',
  lookup_name:   'lookup_name',
  lookup_value:  'lookup_value',
  display_order: 'display_order',
  parent_code:   'parent_code',
  is_active:     'is_active',
  created_at:    'created_at',
};

// ── GET /lookup-master ────────────────────────────────────────
export const getLookupMaster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit   = Math.min(5000, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset  = (page - 1) * limit;
    const search  = ((req.query.search as string) || '').trim();
    const status  = (req.query.status as string) || 'active';
    const sortCol = SORT_COLS[req.query.sort_by as string] || 'lookup_type';
    const sortDir = req.query.sort_dir === 'desc' ? 'desc' : 'asc';

    let cfObj: Record<string, string> = {};
    try {
      if (req.query.col_filters) cfObj = JSON.parse(req.query.col_filters as string);
    } catch { /* ignore */ }

    const AND: Prisma.master_lookupWhereInput[] = [];
    if (status === 'active')   AND.push({ is_active: true });
    if (status === 'inactive') AND.push({ is_active: false });

    if (search) {
      AND.push({
        OR: [
          { lookup_type:  { contains: search, mode: 'insensitive' } },
          { lookup_code:  { contains: search, mode: 'insensitive' } },
          { lookup_name:  { contains: search, mode: 'insensitive' } },
          { lookup_value: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    for (const col of ['lookup_type', 'lookup_code', 'lookup_name', 'lookup_value', 'parent_code'] as const) {
      const val = (cfObj[col] || '').trim();
      if (val) AND.push({ [col]: { contains: val, mode: 'insensitive' } });
    }
    // is_active / display_order filters compare against text in the
    // original (::text casts) — matched here via Prisma's own typed equals.
    const activeFilter = (cfObj.is_active || '').trim();
    if (activeFilter) AND.push({ is_active: activeFilter.toLowerCase() === 'true' });
    const orderFilter = (cfObj.display_order || '').trim();
    if (orderFilter && !isNaN(Number(orderFilter))) AND.push({ display_order: Number(orderFilter) });

    const where: Prisma.master_lookupWhereInput = AND.length ? { AND } : {};

    const [total, dataRows] = await Promise.all([
      prisma.master_lookup.count({ where }),
      prisma.master_lookup.findMany({
        where,
        orderBy: { [sortCol]: sortDir },
        skip: offset,
        take: limit,
      }),
    ]);

    const total_pages = Math.ceil(total / limit) || 1;
    sendSuccess(res, dataRows, 'Lookup master fetched', 200, { total, total_pages, page, limit });
  } catch (error) {
    sendError(res, 'Failed to fetch lookup master', 500, (error as Error).message);
  }
};

// ── GET /lookup-master/stats ──────────────────────────────────
export const getLookupStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [active, inactive] = await Promise.all([
      prisma.master_lookup.count({ where: { is_active: true } }),
      prisma.master_lookup.count({ where: { is_active: false } }),
    ]);
    sendSuccess(res, { active, inactive }, 'Stats fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch stats', 500, (error as Error).message);
  }
};

// ── GET /lookup-master/types ──────────────────────────────────
export const getLookupTypes = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cached = await cacheGetJson<string[]>(typesKey());
    if (cached) { sendSuccess(res, cached, 'Lookup types fetched'); return; }

    const rows = await prisma.master_lookup.findMany({
      distinct: ['lookup_type'],
      select: { lookup_type: true },
      orderBy: { lookup_type: 'asc' },
    });
    const types = rows.map(r => r.lookup_type);
    await cacheSetJson(typesKey(), types, LOOKUP_CACHE_TTL);
    sendSuccess(res, types, 'Lookup types fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch lookup types', 500, (error as Error).message);
  }
};

// ── GET /lookup-master/lov/:type ──────────────────────────────
export const getLookupLOV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const type = (req.params.type || '').trim().toUpperCase();
    if (!type) { sendValidationError(res, 'Lookup type is required'); return; }

    const cached = await cacheGetJson<unknown[]>(lovKey(type));
    if (cached) { sendSuccess(res, cached, 'Lookup LOV fetched'); return; }

    const rows = await prisma.master_lookup.findMany({
      where: { lookup_type: type, is_active: true },
      select: { lookup_code: true, lookup_name: true, lookup_value: true },
      orderBy: [{ display_order: 'asc' }, { lookup_name: 'asc' }],
    });
    await cacheSetJson(lovKey(type), rows, LOOKUP_CACHE_TTL);
    sendSuccess(res, rows, 'Lookup LOV fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch lookup LOV', 500, (error as Error).message);
  }
};

// ── POST /lookup-master ────────────────────────────────────────
export const createLookup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { lookup_type, lookup_code, lookup_name, lookup_value, display_order, parent_code } = req.body as {
      lookup_type: string; lookup_code: string; lookup_name: string;
      lookup_value?: string; display_order?: number; parent_code?: string;
    };

    if (!lookup_type?.trim()) { sendValidationError(res, 'Lookup Type is required'); return; }
    if (!lookup_code?.trim()) { sendValidationError(res, 'Lookup Code is required'); return; }
    if (!lookup_name?.trim()) { sendValidationError(res, 'Lookup Name is required'); return; }

    const type   = toCode(lookup_type);
    const code   = toCode(lookup_code);
    const name   = toCode(lookup_name);
    const value  = lookup_value?.trim() ? toCode(lookup_value) : null;
    const parent = parent_code?.trim() ? toCode(parent_code) : null;

    if (!CODE_CHARS_RE.test(type)) { sendValidationError(res, 'Lookup Type: only capital letters, numbers, and - are allowed'); return; }
    if (!CODE_CHARS_RE.test(code)) { sendValidationError(res, 'Lookup Code: only capital letters, numbers, and - are allowed'); return; }
    if (!CODE_CHARS_RE.test(name)) { sendValidationError(res, 'Lookup Name: only capital letters, numbers, and - are allowed'); return; }
    if (value  && !CODE_CHARS_RE.test(value))  { sendValidationError(res, 'Lookup Value: only capital letters, numbers, and - are allowed'); return; }
    if (parent && !CODE_CHARS_RE.test(parent)) { sendValidationError(res, 'Parent Code: only capital letters, numbers, and - are allowed'); return; }

    const existing = await prisma.master_lookup.findUnique({
      where: { lookup_type_lookup_code: { lookup_type: type, lookup_code: code } },
      select: { id: true },
    });
    if (existing) { sendValidationError(res, `Lookup code "${code}" already exists in type "${type}"`); return; }

    const created = await prisma.master_lookup.create({
      data: {
        lookup_type: type,
        lookup_code: code,
        lookup_name: name,
        lookup_value: value,
        display_order: display_order ?? 0,
        parent_code: parent,
        updated_at: new Date(),
      },
      select: { id: true },
    });

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    req.user ? `${req.user.first_name} ${req.user.last_name}`.trim() : undefined,
      action:      'CREATE',
      module: AUDIT_MODULE.LOOKUP_MASTER,
      recordId:    created.id,
      description: `Created lookup: ${type} / ${code}`,
      newValues:   { lookup_type: type, lookup_code: code, lookup_name: name },
      ipAddress:   req.ip,
    });

    await invalidateLookupCache();
    sendSuccess(res, { id: created.id }, 'Lookup created successfully', 201);
  } catch (error) {
    sendError(res, 'Failed to create lookup', 500, (error as Error).message);
  }
};

// ── PUT /lookup-master/:id ─────────────────────────────────────
export const updateLookup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (!id) { sendValidationError(res, 'Invalid ID'); return; }

    const { lookup_name, lookup_value, display_order, parent_code } = req.body as {
      lookup_name: string; lookup_value?: string; display_order?: number; parent_code?: string;
    };

    if (!lookup_name?.trim()) { sendValidationError(res, 'Lookup Name is required'); return; }

    const name   = toCode(lookup_name);
    const value  = lookup_value?.trim() ? toCode(lookup_value) : null;
    const parent = parent_code?.trim() ? toCode(parent_code) : null;

    if (!CODE_CHARS_RE.test(name)) { sendValidationError(res, 'Lookup Name: only capital letters, numbers, and - are allowed'); return; }
    if (value  && !CODE_CHARS_RE.test(value))  { sendValidationError(res, 'Lookup Value: only capital letters, numbers, and - are allowed'); return; }
    if (parent && !CODE_CHARS_RE.test(parent)) { sendValidationError(res, 'Parent Code: only capital letters, numbers, and - are allowed'); return; }

    try {
      await prisma.master_lookup.update({
        where: { id },
        data: {
          lookup_name: name,
          lookup_value: value,
          display_order: display_order ?? 0,
          parent_code: parent,
          updated_at: new Date(),
        },
        select: { id: true },
      });
    } catch (err) {
      if ((err as Prisma.PrismaClientKnownRequestError).code === 'P2025') { sendError(res, 'Record not found', 404); return; }
      throw err;
    }

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    req.user ? `${req.user.first_name} ${req.user.last_name}`.trim() : undefined,
      action:      'UPDATE',
      module: AUDIT_MODULE.LOOKUP_MASTER,
      recordId:    id,
      description: `Updated lookup ID: ${id}`,
      newValues:   { lookup_name: lookup_name.trim(), display_order, parent_code },
      ipAddress:   req.ip,
    });

    await invalidateLookupCache();
    sendSuccess(res, { id }, 'Lookup updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update lookup', 500, (error as Error).message);
  }
};

// ── DELETE /lookup-master/:id — toggles is_active ─────────────
export const toggleLookupStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (!id) { sendValidationError(res, 'Invalid ID'); return; }

    const { reason } = req.body as { reason?: string };

    const rows = await prisma.$queryRaw<{ id: number; is_active: boolean; lookup_type: string; lookup_code: string }[]>(
      Prisma.sql`
        UPDATE master_lookup
        SET is_active           = NOT is_active,
            deactivation_reason = CASE WHEN is_active THEN ${reason?.trim() || null} ELSE NULL END,
            deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
            updated_at          = NOW()
        WHERE id = ${id}
        RETURNING id, is_active, lookup_type, lookup_code
      `
    );

    if (rows.length === 0) { sendError(res, 'Record not found', 404); return; }

    const { is_active, lookup_type, lookup_code } = rows[0];

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    req.user ? `${req.user.first_name} ${req.user.last_name}`.trim() : undefined,
      action:      'DELETE',
      module: AUDIT_MODULE.LOOKUP_MASTER,
      recordId:    id,
      description: `${is_active ? 'Activated' : 'Deactivated'} lookup: ${lookup_type} / ${lookup_code}${!is_active && reason ? ` — ${reason}` : ''}`,
      ipAddress:   req.ip,
    });

    await invalidateLookupCache();
    sendSuccess(res, { id, is_active }, is_active ? 'Lookup activated' : 'Lookup deactivated');
  } catch (error) {
    sendError(res, 'Failed to toggle lookup status', 500, (error as Error).message);
  }
};
