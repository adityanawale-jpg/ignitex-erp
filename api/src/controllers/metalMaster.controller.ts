import { Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { AUDIT_MODULE } from '../constants/auditModules';

const SORT_COLS: Record<string, string> = {
  metal_code:  'metal_code',
  metal_type:  'metal_type',
  karat_color: 'karat_color',
  purity:      'purity',
  metal_name:  'metal_name',
  created_at:  'created_at',
};

// ── GET /metal-master ─────────────────────────────────────────
// List query keeps used_in_bom (an EXISTS-subquery computed field with no
// direct Prisma relation, since bom_fg_detail/bom_fin_detail.item_id is
// polymorphic across item types) as a raw query via Prisma.sql — still
// fully parameterized/type-safe, just not expressible via the query builder.
export const getMetalItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit   = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset  = (page - 1) * limit;
    const search  = ((req.query.search as string) || '').trim();
    const status  = (req.query.status as string) || 'active';
    const sortCol = SORT_COLS[req.query.sort_by as string] || 'metal_code';
    const sortDir = req.query.sort_dir === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;

    let cfObj: Record<string, string> = {};
    try {
      if (req.query.col_filters) cfObj = JSON.parse(req.query.col_filters as string);
    } catch { /* ignore */ }

    const conds: Prisma.Sql[] = [];
    if (status === 'active')   conds.push(Prisma.sql`is_active = TRUE`);
    if (status === 'inactive') conds.push(Prisma.sql`is_active = FALSE`);

    if (search) {
      const like = `%${search}%`;
      conds.push(Prisma.sql`(COALESCE(metal_code,'') ILIKE ${like}
        OR COALESCE(metal_type,'') ILIKE ${like}
        OR COALESCE(karat_color,'') ILIKE ${like}
        OR COALESCE(purity,'') ILIKE ${like}
        OR COALESCE(metal_name,'') ILIKE ${like})`);
    }

    const CF_COLS = ['metal_code', 'metal_type', 'karat_color', 'purity', 'metal_name'] as const;
    for (const col of CF_COLS) {
      const val = (cfObj[col] || '').trim();
      if (val) conds.push(Prisma.sql`COALESCE(${Prisma.raw(col)},'') ILIKE ${`%${val}%`}`);
    }

    const where = conds.length
      ? Prisma.sql`WHERE ${Prisma.join(conds, ' AND ')}`
      : Prisma.empty;

    const [countRows, dataRows] = await Promise.all([
      prisma.$queryRaw<{ total: bigint }[]>(
        Prisma.sql`SELECT COUNT(*) AS total FROM metal_master ${where}`
      ),
      prisma.$queryRaw(
        Prisma.sql`
          SELECT m.id, m.metal_code, m.metal_type, m.karat_color, m.purity, m.metal_name,
                 m.is_active, m.deactivation_reason, m.deactivated_at, m.created_at, m.updated_at,
                 (EXISTS(SELECT 1 FROM bom_fg_detail  d WHERE d.item_id = m.id AND d.item_type = 'METAL' AND d.is_active = TRUE)
                  OR EXISTS(SELECT 1 FROM bom_fin_detail d WHERE d.item_id = m.id AND d.item_type = 'METAL' AND d.is_active = TRUE)
                 ) AS used_in_bom
          FROM metal_master m
          ${where}
          ORDER BY ${Prisma.raw(sortCol)} ${sortDir}
          LIMIT ${limit} OFFSET ${offset}
        `
      ),
    ]);

    const total       = Number(countRows[0]?.total ?? 0);
    const total_pages = Math.ceil(total / limit) || 1;

    sendSuccess(res, dataRows, 'Metal items fetched', 200, { total, total_pages, page, limit });
  } catch (error) {
    sendError(res, 'Failed to fetch metal items', 500, (error as Error).message);
  }
};

// ── GET /metal-master/stats ────────────────────────────────────
export const getMetalItemStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [active, inactive] = await Promise.all([
      prisma.metal_master.count({ where: { is_active: true } }),
      prisma.metal_master.count({ where: { is_active: false } }),
    ]);
    sendSuccess(res, { active, inactive }, 'Stats fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch stats', 500, (error as Error).message);
  }
};

// ── POST /metal-master ─────────────────────────────────────────
export const createMetalItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { metal_type, karat_color, purity, metal_name } =
      req.body as Record<string, string>;

    if (!metal_type?.trim() || !karat_color?.trim() || !purity?.trim() || !metal_name?.trim()) {
      sendValidationError(res, 'Metal Type, Karat/Color, Purity and Metal Name are all required');
      return;
    }

    // metal_code is populated by the trg_metal_code DB trigger (fn_metal_gen_code()),
    // not application code — Prisma's create() still returns the trigger-set value.
    const created = await prisma.metal_master.create({
      data: {
        metal_type:  metal_type.trim(),
        karat_color: karat_color.trim(),
        purity:      purity.trim(),
        metal_name:  metal_name.trim(),
        is_active:   true,
        created_by:  req.user?.id ?? null,
      },
      select: { id: true, metal_code: true },
    });

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'CREATE',
      module: AUDIT_MODULE.METAL_MASTER,
      recordId:    created.id,
      description: `Created metal item: ${created.metal_code}`,
      newValues:   { metal_type, karat_color, purity, metal_name },
      ipAddress:   req.ip,
    });

    sendSuccess(res, created, 'Metal item created successfully', 201);
  } catch (error) {
    const err = error as Prisma.PrismaClientKnownRequestError & Error;
    if (err.code === 'P2002') {
      sendValidationError(res, 'A metal item with this combination already exists');
      return;
    }
    sendError(res, 'Failed to create metal item', 500, err.message);
  }
};

// ── PUT /metal-master/:id ──────────────────────────────────────
export const updateMetalItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const { metal_type, karat_color, purity, metal_name } =
      req.body as Record<string, string>;

    let updated;
    try {
      updated = await prisma.metal_master.update({
        where: { id },
        data: {
          metal_type:  metal_type?.trim()  || null,
          karat_color: karat_color?.trim() || null,
          purity:      purity?.trim()      || null,
          metal_name:  metal_name?.trim()  || null,
          updated_by:  req.user?.id ?? null,
          updated_at:  new Date(),
        },
        select: { id: true, metal_code: true },
      });
    } catch (err) {
      if ((err as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
        sendError(res, 'Metal item not found', 404);
        return;
      }
      throw err;
    }

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'UPDATE',
      module: AUDIT_MODULE.METAL_MASTER,
      recordId:    id,
      description: `Updated metal item: ${updated.metal_code}`,
      newValues:   { metal_type, karat_color, purity, metal_name },
      ipAddress:   req.ip,
    });

    sendSuccess(res, updated, 'Metal item updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update metal item', 500, (error as Error).message);
  }
};

// ── DELETE /metal-master/:id  (toggle status) ─────────────────
export const toggleMetalItemStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const { reason } = req.body as { reason?: string };

    // Atomic toggle (SET is_active = NOT is_active) — kept as a raw query
    // since Prisma's update API has no "toggle this boolean" expression,
    // and a read-then-write two-step would introduce a race condition
    // under concurrent requests that the single UPDATE doesn't have.
    const rows = await prisma.$queryRaw<{ id: number; is_active: boolean; metal_code: string }[]>(
      Prisma.sql`
        UPDATE metal_master
        SET is_active           = NOT is_active,
            deactivation_reason = CASE WHEN is_active THEN ${reason?.trim() || null} ELSE NULL END,
            deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
            updated_at          = NOW()
        WHERE id = ${id}
        RETURNING id, is_active, metal_code
      `
    );

    if (rows.length === 0) { sendError(res, 'Metal item not found', 404); return; }
    const updated = rows[0];

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'DELETE',
      module: AUDIT_MODULE.METAL_MASTER,
      recordId:    id,
      description: `${updated.is_active ? 'Activated' : 'Deactivated'} metal item: ${updated.metal_code}${!updated.is_active && reason ? ` — ${reason}` : ''}`,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id, is_active: updated.is_active }, updated.is_active ? 'Metal item activated' : 'Metal item deactivated');
  } catch (error) {
    sendError(res, 'Failed to toggle metal item status', 500, (error as Error).message);
  }
};
