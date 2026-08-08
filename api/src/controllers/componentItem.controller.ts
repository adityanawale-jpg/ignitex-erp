import { Response } from 'express';
import { executeQuery } from '../database/connection';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { getQuery } from '../utils/queryConfig';

const SORT_COLS: Record<string, string> = {
  comp_code:        'comp_code',
  comp_metal_type:  'comp_metal_type',
  comp_type:        'comp_type',
  comp_karat_color: 'comp_karat_color',
  comp_purity:      'comp_purity',
  comp_name:        'comp_name',
  created_at:       'created_at',
};

// ── GET /component-items ──────────────────────────────────────
export const getComponentItems = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit   = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset  = (page - 1) * limit;
    const search  = ((req.query.search as string) || '').trim();
    const status  = (req.query.status as string) || 'active';
    const sortCol = SORT_COLS[req.query.sort_by as string] || 'comp_code';
    const sortDir = req.query.sort_dir === 'desc' ? 'DESC' : 'ASC';

    let cfObj: Record<string, string> = {};
    try {
      if (req.query.col_filters) cfObj = JSON.parse(req.query.col_filters as string);
    } catch { /* ignore */ }

    const fp: unknown[] = [];
    let idx = 1;
    const p = (val: unknown) => { fp.push(val); return `$${idx++}`; };

    const conds: string[] = [];
    if (status === 'active')   conds.push('is_active = TRUE');
    if (status === 'inactive') conds.push('is_active = FALSE');

    if (search) {
      const sp = p(`%${search}%`);
      conds.push(
        `(COALESCE(comp_code,'') ILIKE ${sp}
          OR COALESCE(comp_metal_type,'') ILIKE ${sp}
          OR COALESCE(comp_type,'') ILIKE ${sp}
          OR COALESCE(comp_karat_color,'') ILIKE ${sp}
          OR COALESCE(comp_purity,'') ILIKE ${sp}
          OR COALESCE(comp_name,'') ILIKE ${sp})`
      );
    }

    const CF_MAP: Record<string, string> = {
      comp_code:        'comp_code',
      comp_metal_type:  'comp_metal_type',
      comp_type:        'comp_type',
      comp_karat_color: 'comp_karat_color',
      comp_purity:      'comp_purity',
      comp_name:        'comp_name',
    };
    for (const [col, expr] of Object.entries(CF_MAP)) {
      const val = (cfObj[col] || '').trim();
      if (val) conds.push(`COALESCE(${expr},'') ILIKE ${p(`%${val}%`)}`);
    }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const [baseSelect, baseCount] = await Promise.all([
      getQuery('comp_item_list_select'),
      getQuery('comp_item_list_count'),
    ]);

    const countRows = await executeQuery<{ total: string }>(
      `${baseCount} ${where}`, fp
    );
    const total       = parseInt(countRows[0]?.total || '0', 10);
    const total_pages = Math.ceil(total / limit) || 1;

    const dataRows = await executeQuery(
      `${baseSelect} ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${p(limit)} OFFSET ${p(offset)}`,
      fp
    );

    sendSuccess(res, dataRows, 'Component items fetched', 200, { total, total_pages, page, limit });
  } catch (error) {
    sendError(res, 'Failed to fetch component items', 500, (error as Error).message);
  }
};

// ── GET /component-items/stats ────────────────────────────────
export const getComponentItemStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sql = await getQuery('comp_item_stats');
    const rows = await executeQuery<{ active: string; inactive: string }>(sql);
    const row = rows[0] ?? { active: '0', inactive: '0' };
    sendSuccess(res, {
      active:   parseInt(row.active   || '0', 10),
      inactive: parseInt(row.inactive || '0', 10),
    }, 'Stats fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch stats', 500, (error as Error).message);
  }
};

// ── POST /component-items ─────────────────────────────────────
export const createComponentItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { comp_metal_type, comp_type, comp_karat_color, comp_purity, comp_name } =
      req.body as Record<string, string>;

    if (!comp_metal_type?.trim() || !comp_type?.trim() || !comp_karat_color?.trim()
        || !comp_purity?.trim() || !comp_name?.trim()) {
      sendValidationError(res, 'Metal Type, Component Type, Karat/Color, Purity and Component Name are all required');
      return;
    }

    const sql = await getQuery('comp_item_create');
    const rows = await executeQuery<{ id: number; comp_code: string }>(sql, [
      comp_metal_type.trim(), comp_type.trim(), comp_karat_color.trim(),
      comp_purity.trim(), comp_name.trim(), req.user?.id ?? null,
    ]);

    const generatedCode = rows[0]?.comp_code;

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'CREATE',
      module:      'Component Items',
      recordId:    rows[0]?.id,
      description: `Created component item: ${generatedCode}`,
      newValues:   { comp_metal_type, comp_type, comp_karat_color, comp_purity, comp_name },
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id: rows[0]?.id, comp_code: generatedCode }, 'Component item created successfully', 201);
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('unique') || err.message.includes('duplicate')) {
      sendValidationError(res, 'A component item with this combination already exists');
      return;
    }
    sendError(res, 'Failed to create component item', 500, err.message);
  }
};

// ── PUT /component-items/:id ──────────────────────────────────
export const updateComponentItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const { comp_metal_type, comp_type, comp_karat_color, comp_purity, comp_name } =
      req.body as Record<string, string>;

    const sql = await getQuery('comp_item_update');
    const rows = await executeQuery<{ id: number; comp_code: string }>(sql, [
      comp_metal_type?.trim() || null,
      comp_type?.trim()       || null,
      comp_karat_color?.trim()|| null,
      comp_purity?.trim()     || null,
      comp_name?.trim()       || null,
      req.user?.id ?? null,
      id,
    ]);

    if (rows.length === 0) { sendError(res, 'Component item not found', 404); return; }

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'UPDATE',
      module:      'Component Items',
      recordId:    id,
      description: `Updated component item: ${rows[0].comp_code}`,
      newValues:   { comp_metal_type, comp_type, comp_karat_color, comp_purity, comp_name },
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id, comp_code: rows[0].comp_code }, 'Component item updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update component item', 500, (error as Error).message);
  }
};

// ── DELETE /component-items/:id  (toggle status) ──────────────
export const toggleComponentItemStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const { reason } = req.body as { reason?: string };
    const sql = await getQuery('comp_item_toggle');
    const rows = await executeQuery<{ id: number; is_active: boolean; comp_code: string }>(sql, [id, reason?.trim() || null]);

    if (rows.length === 0) { sendError(res, 'Component item not found', 404); return; }

    const { is_active, comp_code } = rows[0];

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'DELETE',
      module:      'Component Items',
      recordId:    id,
      description: `${is_active ? 'Activated' : 'Deactivated'} component item: ${comp_code}${!is_active && reason ? ` — ${reason}` : ''}`,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id, is_active }, is_active ? 'Component item activated' : 'Component item deactivated');
  } catch (error) {
    sendError(res, 'Failed to toggle component item status', 500, (error as Error).message);
  }
};
