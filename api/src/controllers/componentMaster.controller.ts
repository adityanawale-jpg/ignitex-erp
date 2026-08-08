import { Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { AUDIT_MODULE } from '../constants/auditModules';

const SORT_COLS: Record<string, string> = {
  component_code: 'component_code',
  component_type: 'component_type',
  component_name: 'component_name',
  component_desc: 'component_desc',
  created_at:     'created_at',
};

// ── GET /component-master ─────────────────────────────────────
// used_in_bom is an EXISTS-subquery computed field with no direct Prisma
// relation (bom_fg_detail/bom_fin_detail.item_id is polymorphic across
// item types), so this stays a Prisma.sql raw query — still fully
// parameterized via tagged templates, just not expressible through the
// query builder. Same pattern as Metal Master.
export const getComponents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit   = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset  = (page - 1) * limit;
    const search  = ((req.query.search as string) || '').trim();
    const status  = (req.query.status as string) || 'active';
    const sortCol = SORT_COLS[req.query.sort_by as string] || 'component_code';
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
      conds.push(Prisma.sql`(COALESCE(component_code,'') ILIKE ${like}
        OR COALESCE(component_type,'') ILIKE ${like}
        OR COALESCE(component_name,'') ILIKE ${like}
        OR COALESCE(component_desc,'') ILIKE ${like})`);
    }

    const CF_COLS = ['component_code', 'component_type', 'component_name', 'component_desc'] as const;
    for (const col of CF_COLS) {
      const val = (cfObj[col] || '').trim();
      if (val) conds.push(Prisma.sql`COALESCE(${Prisma.raw(col)},'') ILIKE ${`%${val}%`}`);
    }

    const where = conds.length
      ? Prisma.sql`WHERE ${Prisma.join(conds, ' AND ')}`
      : Prisma.empty;

    const [countRows, dataRows] = await Promise.all([
      prisma.$queryRaw<{ total: bigint }[]>(
        Prisma.sql`SELECT COUNT(*) AS total FROM component_master ${where}`
      ),
      prisma.$queryRaw(
        Prisma.sql`
          SELECT c.id, c.component_code, c.component_type, c.component_name, c.component_desc,
                 c.is_active, c.deactivation_reason, c.deactivated_at, c.created_at, c.updated_at,
                 (EXISTS(SELECT 1 FROM bom_fg_detail  d WHERE d.item_id = c.id AND d.item_type = 'COMPONENT' AND d.is_active = TRUE)
                  OR EXISTS(SELECT 1 FROM bom_fin_detail d WHERE d.item_id = c.id AND d.item_type = 'COMPONENT' AND d.is_active = TRUE)
                 ) AS used_in_bom
          FROM component_master c
          ${where}
          ORDER BY ${Prisma.raw(sortCol)} ${sortDir}
          LIMIT ${limit} OFFSET ${offset}
        `
      ),
    ]);

    const total       = Number(countRows[0]?.total ?? 0);
    const total_pages = Math.ceil(total / limit) || 1;

    sendSuccess(res, dataRows, 'Components fetched', 200, { total, total_pages, page, limit });
  } catch (error) {
    sendError(res, 'Failed to fetch components', 500, (error as Error).message);
  }
};

// ── GET /component-master/stats ───────────────────────────────
export const getComponentStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [active, inactive] = await Promise.all([
      prisma.component_master.count({ where: { is_active: true } }),
      prisma.component_master.count({ where: { is_active: false } }),
    ]);
    sendSuccess(res, { active, inactive }, 'Stats fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch stats', 500, (error as Error).message);
  }
};

// ── POST /component-master ────────────────────────────────────
export const createComponent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { component_type, component_name, component_desc } =
      req.body as Record<string, string>;

    if (!component_type?.trim() || !component_name?.trim() || !component_desc?.trim()) {
      sendValidationError(res, 'Component Type, Component Name and Component Description are all required');
      return;
    }

    // component_code is populated by the trg_component_master_code DB
    // trigger (INSERT only, unlike Metal Master's trigger which also fires
    // on UPDATE) — Prisma's create() still returns the trigger-set value.
    const created = await prisma.component_master.create({
      data: {
        component_type: component_type.trim(),
        component_name: component_name.trim(),
        component_desc: component_desc.trim(),
        is_active:      true,
        created_by:     req.user?.id ?? null,
      },
      select: { id: true, component_code: true },
    });

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'CREATE',
      module: AUDIT_MODULE.COMPONENT_MASTER,
      recordId:    created.id,
      description: `Created component: ${created.component_code}`,
      newValues:   { component_type, component_name, component_desc },
      ipAddress:   req.ip,
    });

    sendSuccess(res, created, 'Component created successfully', 201);
  } catch (error) {
    const err = error as Prisma.PrismaClientKnownRequestError & Error;
    if (err.code === 'P2002') {
      sendValidationError(res, 'A component with this combination already exists');
      return;
    }
    sendError(res, 'Failed to create component', 500, err.message);
  }
};

// ── PUT /component-master/:id ──────────────────────────────────
export const updateComponent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const { component_type, component_name, component_desc } =
      req.body as Record<string, string>;

    let updated;
    try {
      updated = await prisma.component_master.update({
        where: { id },
        data: {
          component_type: component_type?.trim() || null,
          component_name: component_name?.trim() || null,
          component_desc: component_desc?.trim() || null,
          updated_by:      req.user?.id ?? null,
          updated_at:      new Date(),
        },
        select: { id: true, component_code: true },
      });
    } catch (err) {
      if ((err as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
        sendError(res, 'Component not found', 404);
        return;
      }
      throw err;
    }

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'UPDATE',
      module: AUDIT_MODULE.COMPONENT_MASTER,
      recordId:    id,
      description: `Updated component: ${updated.component_code}`,
      newValues:   { component_type, component_name, component_desc },
      ipAddress:   req.ip,
    });

    sendSuccess(res, updated, 'Component updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update component', 500, (error as Error).message);
  }
};

// ── DELETE /component-master/:id  (toggle status) ─────────────
export const toggleComponentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const { reason } = req.body as { reason?: string };

    // Atomic toggle — see Metal Master for why this stays a raw query
    // instead of a read-then-write two-step (avoids a race condition).
    const rows = await prisma.$queryRaw<{ id: number; is_active: boolean; component_code: string }[]>(
      Prisma.sql`
        UPDATE component_master
        SET is_active           = NOT is_active,
            deactivation_reason = CASE WHEN is_active THEN ${reason?.trim() || null} ELSE NULL END,
            deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
            updated_at          = NOW()
        WHERE id = ${id}
        RETURNING id, is_active, component_code
      `
    );

    if (rows.length === 0) { sendError(res, 'Component not found', 404); return; }
    const updated = rows[0];

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'DELETE',
      module: AUDIT_MODULE.COMPONENT_MASTER,
      recordId:    id,
      description: `${updated.is_active ? 'Activated' : 'Deactivated'} component: ${updated.component_code}${!updated.is_active && reason ? ` — ${reason}` : ''}`,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id, is_active: updated.is_active }, updated.is_active ? 'Component activated' : 'Component deactivated');
  } catch (error) {
    sendError(res, 'Failed to toggle component status', 500, (error as Error).message);
  }
};
