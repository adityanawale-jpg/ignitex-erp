import { Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { AUDIT_MODULE } from '../constants/auditModules';

const SORT_COLS: Record<string, string> = {
  stn_code:    'stn_code',
  stn_type:    'stn_type',
  stn_shape:   'stn_shape',
  stn_quality: 'stn_quality',
  stn_color:   'stn_color',
  stn_size:    'stn_size',
  created_at:  'created_at',
};

// ── GET /stone-items ──────────────────────────────────────────
// used_in_bom stays a Prisma.sql raw query — same reasoning as Metal
// Master / Component Master (EXISTS subquery, no direct Prisma relation
// since bom_fg_detail/bom_fin_detail.item_id is polymorphic).
export const getStoneItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit   = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset  = (page - 1) * limit;
    const search  = ((req.query.search as string) || '').trim();
    const status  = (req.query.status as string) || 'active';
    const sortCol = SORT_COLS[req.query.sort_by as string] || 'stn_code';
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
      conds.push(Prisma.sql`(stn_code ILIKE ${like} OR COALESCE(stn_type,'') ILIKE ${like}
        OR COALESCE(stn_shape,'') ILIKE ${like} OR COALESCE(stn_quality,'') ILIKE ${like}
        OR COALESCE(stn_color,'') ILIKE ${like} OR COALESCE(stn_size,'') ILIKE ${like})`);
    }

    const CF_COLS = ['stn_code', 'stn_type', 'stn_shape', 'stn_quality', 'stn_color', 'stn_size'] as const;
    for (const col of CF_COLS) {
      const val = (cfObj[col] || '').trim();
      if (val) conds.push(Prisma.sql`COALESCE(${Prisma.raw(col)},'') ILIKE ${`%${val}%`}`);
    }

    const where = conds.length
      ? Prisma.sql`WHERE ${Prisma.join(conds, ' AND ')}`
      : Prisma.empty;

    const [countRows, dataRows] = await Promise.all([
      prisma.$queryRaw<{ total: bigint }[]>(
        Prisma.sql`SELECT COUNT(*) AS total FROM stone_item_master ${where}`
      ),
      prisma.$queryRaw(
        Prisma.sql`
          SELECT s.id, s.stn_code, s.stn_type, s.stn_shape, s.stn_quality, s.stn_color, s.stn_size,
                 s.std_cts, s.is_active, s.deactivation_reason, s.deactivated_at, s.created_at, s.updated_at,
                 (EXISTS(SELECT 1 FROM bom_fg_detail  d WHERE d.item_id = s.id AND d.item_type = 'STONE' AND d.is_active = TRUE)
                  OR EXISTS(SELECT 1 FROM bom_fin_detail d WHERE d.item_id = s.id AND d.item_type = 'STONE' AND d.is_active = TRUE)
                 ) AS used_in_bom
          FROM stone_item_master s
          ${where}
          ORDER BY ${Prisma.raw(sortCol)} ${sortDir}
          LIMIT ${limit} OFFSET ${offset}
        `
      ),
    ]);

    const total       = Number(countRows[0]?.total ?? 0);
    const total_pages = Math.ceil(total / limit) || 1;

    sendSuccess(res, dataRows, 'Stone items fetched', 200, { total, total_pages, page, limit });
  } catch (error) {
    sendError(res, 'Failed to fetch stone items', 500, (error as Error).message);
  }
};

// ── GET /stone-items/stats ────────────────────────────────────
export const getStoneItemStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [active, inactive] = await Promise.all([
      prisma.stone_item_master.count({ where: { is_active: true } }),
      prisma.stone_item_master.count({ where: { is_active: false } }),
    ]);
    sendSuccess(res, { active, inactive }, 'Stats fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch stats', 500, (error as Error).message);
  }
};

// ── POST /stone-items ─────────────────────────────────────────
export const createStoneItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { stn_type, stn_shape, stn_quality, stn_color, stn_size, std_cts } =
      req.body as Record<string, string>;

    if (!stn_type?.trim() || !stn_shape?.trim() || !stn_quality?.trim() || !stn_color?.trim() || !stn_size?.trim()) {
      sendValidationError(res, 'Stone Type, Shape, Quality, Color and Size are all required');
      return;
    }

    // stn_code is populated by the trg_stone_item_code DB trigger
    // (fn_stone_item_gen_code(), BEFORE INSERT OR UPDATE, like Metal
    // Master) — it overwrites NEW.stn_code before the row is written, so
    // the '' placeholder below is never actually persisted. stn_code is
    // NOT NULL in the schema (unlike Metal/Component's nullable code
    // columns), so Prisma's create() requires some value here.
    const created = await prisma.stone_item_master.create({
      data: {
        stn_code:    '',
        stn_type:    stn_type.trim(),
        stn_shape:   stn_shape.trim(),
        stn_quality: stn_quality.trim(),
        stn_color:   stn_color.trim(),
        stn_size:    stn_size.trim(),
        std_cts:     std_cts !== undefined && std_cts !== '' ? Number(std_cts) : null,
        is_active:   true,
        created_by:  req.user?.id ?? null,
      },
      select: { id: true, stn_code: true },
    });

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'CREATE',
      module: AUDIT_MODULE.STONE_ITEMS,
      recordId:    created.id,
      description: `Created stone item: ${created.stn_code}`,
      newValues:   { stn_type, stn_shape, stn_quality, stn_color, stn_size, std_cts },
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id: created.id, stn_code: created.stn_code }, 'Stone item created successfully', 201);
  } catch (error) {
    const err = error as Prisma.PrismaClientKnownRequestError & Error;
    if (err.code === 'P2002') {
      sendValidationError(res, 'A stone item with this combination already exists');
      return;
    }
    sendError(res, 'Failed to create stone item', 500, err.message);
  }
};

// ── PUT /stone-items/:id ──────────────────────────────────────
export const updateStoneItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const { stn_type, stn_shape, stn_quality, stn_color, stn_size, std_cts } =
      req.body as Record<string, string>;

    let updated;
    try {
      updated = await prisma.stone_item_master.update({
        where: { id },
        data: {
          stn_type:    stn_type?.trim()    || null,
          stn_shape:   stn_shape?.trim()   || null,
          stn_quality: stn_quality?.trim() || null,
          stn_color:   stn_color?.trim()   || null,
          stn_size:    stn_size?.trim()    || null,
          std_cts:     std_cts !== undefined && std_cts !== '' ? Number(std_cts) : null,
          updated_by:  req.user?.id ?? null,
          updated_at:  new Date(),
        },
        select: { id: true, stn_code: true },
      });
    } catch (err) {
      if ((err as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
        sendError(res, 'Stone item not found', 404);
        return;
      }
      throw err;
    }

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'UPDATE',
      module: AUDIT_MODULE.STONE_ITEMS,
      recordId:    id,
      description: `Updated stone item: ${updated.stn_code}`,
      newValues:   { stn_type, stn_shape, stn_quality, stn_color, stn_size, std_cts },
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id }, 'Stone item updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update stone item', 500, (error as Error).message);
  }
};

// ── DELETE /stone-items/:id  (toggle status) ──────────────────
export const toggleStoneItemStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const { reason } = req.body as { reason?: string };

    // Atomic toggle — see Metal Master for why this stays a raw query
    // instead of a read-then-write two-step (avoids a race condition).
    const rows = await prisma.$queryRaw<{ id: number; is_active: boolean; stn_code: string }[]>(
      Prisma.sql`
        UPDATE stone_item_master
        SET is_active           = NOT is_active,
            deactivation_reason = CASE WHEN is_active THEN ${reason?.trim() || null} ELSE NULL END,
            deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
            updated_at          = NOW()
        WHERE id = ${id}
        RETURNING id, is_active, stn_code
      `
    );

    if (rows.length === 0) { sendError(res, 'Stone item not found', 404); return; }
    const updated = rows[0];

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'DELETE',
      module: AUDIT_MODULE.STONE_ITEMS,
      recordId:    id,
      description: `${updated.is_active ? 'Activated' : 'Deactivated'} stone item: ${updated.stn_code}${!updated.is_active && reason ? ` — ${reason}` : ''}`,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id, is_active: updated.is_active }, updated.is_active ? 'Stone item activated' : 'Stone item deactivated');
  } catch (error) {
    sendError(res, 'Failed to toggle stone item status', 500, (error as Error).message);
  }
};
