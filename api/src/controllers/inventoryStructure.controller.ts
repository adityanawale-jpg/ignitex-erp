import { Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { AUDIT_MODULE } from '../constants/auditModules';

const SORT_COLS: Record<string, string> = {
  bu_name:      'bu_name',
  org_name:     'org_name',
  sub_inv_code: 'sub_inv_code',
  sub_inv_name: 'sub_inv_name',
  store_type:   'store_type',
  created_at:   'created_at',
};

const toBool = (v: unknown): boolean => v === true || v === 'true' || v === 1 || v === '1';

// ── GET /inventory-structure ─────────────────────────────────────
// bu_name/org_name/store_type_name come from 3 LEFT JOINs to
// master_lookup matched by (lookup_type, lookup_code) business codes —
// not a real Prisma relation (no FK between these tables), so this
// stays a Prisma.sql raw query, same as the original.
export const getInventoryStructures = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit   = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset  = (page - 1) * limit;
    const search  = ((req.query.search as string) || '').trim();
    const status  = (req.query.status as string) || 'active';
    const sortCol = SORT_COLS[req.query.sort_by as string] || 'bu_name';
    const sortDir = req.query.sort_dir === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;

    let cfObj: Record<string, string> = {};
    try {
      if (req.query.col_filters) cfObj = JSON.parse(req.query.col_filters as string);
    } catch { /* ignore */ }

    const conds: Prisma.Sql[] = [];
    if (status === 'active')   conds.push(Prisma.sql`ist.is_active = TRUE`);
    if (status === 'inactive') conds.push(Prisma.sql`ist.is_active = FALSE`);

    if (search) {
      const like = `%${search}%`;
      conds.push(Prisma.sql`(ist.sub_inv_code ILIKE ${like} OR ist.sub_inv_name ILIKE ${like}
        OR COALESCE(bu.lookup_name,'') ILIKE ${like} OR COALESCE(org.lookup_name,'') ILIKE ${like})`);
    }

    const CF_MAP: Record<string, string> = {
      bu_name:      'bu.lookup_name',
      org_name:     'org.lookup_name',
      sub_inv_code: 'ist.sub_inv_code',
      sub_inv_name: 'ist.sub_inv_name',
      store_type:   'st.lookup_name',
    };
    for (const [col, expr] of Object.entries(CF_MAP)) {
      const val = (cfObj[col] || '').trim();
      if (val) conds.push(Prisma.sql`COALESCE(${Prisma.raw(expr)},'') ILIKE ${`%${val}%`}`);
    }

    const where = conds.length
      ? Prisma.sql`WHERE ${Prisma.join(conds, ' AND ')}`
      : Prisma.empty;

    const fromJoin = Prisma.sql`
      FROM   inventory_structure ist
      LEFT   JOIN master_lookup bu  ON bu.lookup_type  = 'INV_BU'         AND bu.lookup_code  = ist.inv_bu_code
      LEFT   JOIN master_lookup org ON org.lookup_type = 'INV_ORG'        AND org.lookup_code = ist.inv_org_code
      LEFT   JOIN master_lookup st  ON st.lookup_type  = 'INV_STORE_TYPE' AND st.lookup_code  = ist.store_type
    `;

    const [countRows, dataRows] = await Promise.all([
      prisma.$queryRaw<{ total: bigint }[]>(
        Prisma.sql`SELECT COUNT(*) AS total ${fromJoin} ${where}`
      ),
      prisma.$queryRaw(
        Prisma.sql`
          SELECT ist.id, ist.inv_bu_code, bu.lookup_name AS bu_name,
                 ist.inv_org_code, org.lookup_name AS org_name,
                 ist.sub_inv_code, ist.sub_inv_name,
                 ist.store_type, st.lookup_name AS store_type_name,
                 ist.is_tracks_gold, ist.is_tracks_wt,
                 ist.is_active, ist.deactivation_reason, ist.deactivated_at, ist.created_at, ist.updated_at
          ${fromJoin}
          ${where}
          ORDER BY ${Prisma.raw(sortCol)} ${sortDir}
          LIMIT ${limit} OFFSET ${offset}
        `
      ),
    ]);

    const total       = Number(countRows[0]?.total ?? 0);
    const total_pages = Math.ceil(total / limit) || 1;

    sendSuccess(res, dataRows, 'Inventory structures fetched', 200, { total, total_pages, page, limit });
  } catch (error) {
    sendError(res, 'Failed to fetch inventory structures', 500, (error as Error).message);
  }
};

// ── GET /inventory-structure/stats ───────────────────────────────
export const getInventoryStructureStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [active, inactive] = await Promise.all([
      prisma.inventory_structure.count({ where: { is_active: true } }),
      prisma.inventory_structure.count({ where: { is_active: false } }),
    ]);
    sendSuccess(res, { active, inactive }, 'Stats fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch stats', 500, (error as Error).message);
  }
};

// ── POST /inventory-structure ────────────────────────────────────
export const createInventoryStructure = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const inv_bu_code  = String(body.inv_bu_code ?? '').trim();
    const inv_org_code = String(body.inv_org_code ?? '').trim();
    const sub_inv_code = String(body.sub_inv_code ?? '').trim();
    const sub_inv_name = String(body.sub_inv_name ?? '').trim();

    if (!inv_bu_code || !inv_org_code || !sub_inv_code || !sub_inv_name) {
      sendValidationError(res, 'BU, Inv Org, Sub Inv Code and Sub Inv Name are required');
      return;
    }

    const created = await prisma.inventory_structure.create({
      data: {
        inv_bu_code, inv_org_code, sub_inv_code, sub_inv_name,
        store_type:     (body.store_type as string)?.trim() || null,
        is_tracks_gold: toBool(body.is_tracks_gold),
        is_tracks_wt:   toBool(body.is_tracks_wt),
        is_active:      true,
        created_by:     req.user?.id ?? null,
      },
      select: { id: true, sub_inv_code: true },
    });

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'CREATE',
      module: AUDIT_MODULE.INVENTORY_STRUCTURE,
      recordId:    created.id,
      description: `Created inventory structure: ${created.sub_inv_code}`,
      newValues:   body,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id: created.id, sub_inv_code: created.sub_inv_code }, 'Inventory structure created successfully', 201);
  } catch (error) {
    const err = error as Prisma.PrismaClientKnownRequestError & Error;
    if (err.code === 'P2002') {
      sendValidationError(res, 'This Sub Inventory already exists for the selected BU/Org');
      return;
    }
    sendError(res, 'Failed to create inventory structure', 500, err.message);
  }
};

// ── PUT /inventory-structure/:id ─────────────────────────────────
export const updateInventoryStructure = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const body = req.body as Record<string, unknown>;
    const inv_bu_code  = String(body.inv_bu_code ?? '').trim();
    const inv_org_code = String(body.inv_org_code ?? '').trim();
    const sub_inv_code = String(body.sub_inv_code ?? '').trim();
    const sub_inv_name = String(body.sub_inv_name ?? '').trim();

    if (!inv_bu_code || !inv_org_code || !sub_inv_code || !sub_inv_name) {
      sendValidationError(res, 'BU, Inv Org, Sub Inv Code and Sub Inv Name are required');
      return;
    }

    let updated;
    try {
      updated = await prisma.inventory_structure.update({
        where: { id },
        data: {
          inv_bu_code, inv_org_code, sub_inv_code, sub_inv_name,
          store_type:     (body.store_type as string)?.trim() || null,
          is_tracks_gold: toBool(body.is_tracks_gold),
          is_tracks_wt:   toBool(body.is_tracks_wt),
          updated_by:     req.user?.id ?? null,
          updated_at:     new Date(),
        },
        select: { id: true, sub_inv_code: true },
      });
    } catch (err) {
      const e = err as Prisma.PrismaClientKnownRequestError;
      if (e.code === 'P2025') { sendError(res, 'Inventory structure not found', 404); return; }
      if (e.code === 'P2002') { sendValidationError(res, 'This Sub Inventory already exists for the selected BU/Org'); return; }
      throw err;
    }

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'UPDATE',
      module: AUDIT_MODULE.INVENTORY_STRUCTURE,
      recordId:    id,
      description: `Updated inventory structure: ${updated.sub_inv_code}`,
      newValues:   body,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id }, 'Inventory structure updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update inventory structure', 500, (error as Error).message);
  }
};

// ── DELETE /inventory-structure/:id  (toggle status) ─────────────
export const toggleInventoryStructureStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const { reason } = req.body as { reason?: string };

    const rows = await prisma.$queryRaw<{ id: number; is_active: boolean; sub_inv_code: string }[]>(
      Prisma.sql`
        UPDATE inventory_structure
        SET is_active           = NOT is_active,
            deactivation_reason = CASE WHEN is_active THEN ${reason?.trim() || null} ELSE NULL END,
            deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
            updated_at          = NOW()
        WHERE id = ${id}
        RETURNING id, is_active, sub_inv_code
      `
    );

    if (rows.length === 0) { sendError(res, 'Inventory structure not found', 404); return; }
    const updated = rows[0];

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'DELETE',
      module: AUDIT_MODULE.INVENTORY_STRUCTURE,
      recordId:    id,
      description: `${updated.is_active ? 'Activated' : 'Deactivated'} inventory structure: ${updated.sub_inv_code}${!updated.is_active && reason ? ` — ${reason}` : ''}`,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id, is_active: updated.is_active }, updated.is_active ? 'Inventory structure activated' : 'Inventory structure deactivated');
  } catch (error) {
    sendError(res, 'Failed to toggle inventory structure status', 500, (error as Error).message);
  }
};
