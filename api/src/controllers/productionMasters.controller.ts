import { Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { AUDIT_MODULE } from '../constants/auditModules';

// ═════════════════════════════════════════════════════════════
// DEPARTMENT MASTER
// ═════════════════════════════════════════════════════════════
// dept_code is direct user input (uppercased), no generating sequence —
// pure Prisma builder throughout, no joins.

const DEPT_SORT: Record<string, string> = {
  dept_code:  'dept_code',
  dept_name:  'dept_name',
  sub_dept:   'sub_dept',
  created_at: 'created_at',
};

// GET /departments
export const getDepts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit   = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 25));
    const offset  = (page - 1) * limit;
    const search  = ((req.query.search as string) || '').trim();
    const status  = (req.query.status as string) || 'active';
    const sortCol = DEPT_SORT[req.query.sort_by as string] || 'dept_code';
    const sortDir = req.query.sort_dir === 'desc' ? 'desc' : 'asc';

    let cfObj: Record<string, string> = {};
    try { if (req.query.col_filters) cfObj = JSON.parse(req.query.col_filters as string); } catch { /* ignore */ }

    const AND: Prisma.dept_masterWhereInput[] = [];
    if (status === 'active')   AND.push({ is_active: true });
    if (status === 'inactive') AND.push({ is_active: false });

    if (search) {
      AND.push({
        OR: [
          { dept_code: { contains: search, mode: 'insensitive' } },
          { dept_name: { contains: search, mode: 'insensitive' } },
          { sub_dept:  { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    for (const col of ['dept_code', 'dept_name', 'sub_dept'] as const) {
      const val = (cfObj[col] || '').trim();
      if (val) AND.push({ [col]: { contains: val, mode: 'insensitive' } });
    }

    const where: Prisma.dept_masterWhereInput = AND.length ? { AND } : {};

    const [total, dataRows] = await Promise.all([
      prisma.dept_master.count({ where }),
      prisma.dept_master.findMany({
        where,
        select: { id: true, dept_code: true, dept_name: true, sub_dept: true, is_active: true, deactivation_reason: true, deactivated_at: true, created_at: true, updated_at: true },
        orderBy: { [sortCol]: sortDir },
        skip: offset,
        take: limit,
      }),
    ]);

    // A department can't be edited/deactivated while an active machine or
    // operation still points at it — flag the page's rows in one extra
    // lightweight query rather than reworking this into a raw-SQL join.
    const ids = dataRows.map(r => r.id);
    const usedRows = ids.length
      ? await prisma.$queryRaw<{ dept_id: number }[]>(Prisma.sql`
          SELECT dept_id FROM machine_master   WHERE is_active = TRUE AND dept_id IN (${Prisma.join(ids)})
          UNION
          SELECT dept_id FROM operation_master WHERE is_active = TRUE AND dept_id IN (${Prisma.join(ids)})
        `)
      : [];
    const usedSet = new Set(usedRows.map(r => r.dept_id));
    const result = dataRows.map(r => ({ ...r, used_elsewhere: usedSet.has(r.id) }));

    const total_pages = Math.ceil(total / limit) || 1;
    sendSuccess(res, result, 'Departments fetched', 200, { total, total_pages, page, limit });
  } catch (error) {
    sendError(res, 'Failed to fetch departments', 500, (error as Error).message);
  }
};

// GET /departments/stats
export const getDeptStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [active, inactive] = await Promise.all([
      prisma.dept_master.count({ where: { is_active: true } }),
      prisma.dept_master.count({ where: { is_active: false } }),
    ]);
    sendSuccess(res, { active, inactive }, 'Stats fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch dept stats', 500, (error as Error).message);
  }
};

// GET /departments/lov  (for Machine/Operation dept dropdown)
export const getDeptLOV = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await prisma.dept_master.findMany({
      where: { is_active: true },
      select: { id: true, dept_code: true, dept_name: true },
      orderBy: { dept_name: 'asc' },
    });
    sendSuccess(res, rows, 'Dept LOV fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch dept LOV', 500, (error as Error).message);
  }
};

// POST /departments
export const createDept = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { dept_code, dept_name, sub_dept } = req.body as Record<string, string>;
    if (!dept_code?.trim()) { sendValidationError(res, 'Department Code is required'); return; }
    if (!dept_name?.trim()) { sendValidationError(res, 'Department Name is required'); return; }

    const created = await prisma.dept_master.create({
      data: {
        dept_code: dept_code.trim().toUpperCase(),
        dept_name: dept_name.trim(),
        sub_dept:  sub_dept?.trim() || null,
        created_by: req.user?.id ?? null,
        updated_by: req.user?.id ?? null,
      },
      select: { id: true, dept_code: true },
    });

    logAudit({ userId: req.user?.id, employeeId: req.user?.employee_id, fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(), action: 'CREATE', module: AUDIT_MODULE.DEPARTMENT_MASTER, recordId: created.id, description: `Created department: ${created.dept_code}`, newValues: { dept_code, dept_name, sub_dept }, ipAddress: req.ip });
    sendSuccess(res, { id: created.id, dept_code: created.dept_code }, 'Department created successfully', 201);
  } catch (error) {
    const err = error as Prisma.PrismaClientKnownRequestError & Error;
    if (err.code === 'P2002') { sendValidationError(res, 'Department code already exists'); return; }
    sendError(res, 'Failed to create department', 500, err.message);
  }
};

// PUT /departments/:id
export const updateDept = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const { dept_name, sub_dept } = req.body as Record<string, string>;
    if (!dept_name?.trim()) { sendValidationError(res, 'Department Name is required'); return; }

    let updated;
    try {
      updated = await prisma.dept_master.update({
        where: { id },
        data: { dept_name: dept_name.trim(), sub_dept: sub_dept?.trim() || null, updated_by: req.user?.id ?? null, updated_at: new Date() },
        select: { id: true, dept_code: true },
      });
    } catch (err) {
      if ((err as Prisma.PrismaClientKnownRequestError).code === 'P2025') { sendError(res, 'Department not found', 404); return; }
      throw err;
    }

    logAudit({ userId: req.user?.id, employeeId: req.user?.employee_id, fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(), action: 'UPDATE', module: AUDIT_MODULE.DEPARTMENT_MASTER, recordId: id, description: `Updated department: ${updated.dept_code}`, newValues: { dept_name, sub_dept }, ipAddress: req.ip });
    sendSuccess(res, { id }, 'Department updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update department', 500, (error as Error).message);
  }
};

// DELETE /departments/:id  (toggle)
export const toggleDeptStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const { reason } = req.body as { reason?: string };
    const rows = await prisma.$queryRaw<{ id: number; is_active: boolean; dept_code: string }[]>(
      Prisma.sql`
        UPDATE dept_master
        SET is_active = NOT is_active,
            deactivation_reason = CASE WHEN is_active THEN ${reason?.trim() || null} ELSE NULL END,
            deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
            updated_at          = NOW()
        WHERE id = ${id}
        RETURNING id, is_active, dept_code
      `
    );
    if (!rows.length) { sendError(res, 'Department not found', 404); return; }

    const { is_active, dept_code } = rows[0];
    logAudit({ userId: req.user?.id, employeeId: req.user?.employee_id, fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(), action: 'DELETE', module: AUDIT_MODULE.DEPARTMENT_MASTER, recordId: id, description: `${is_active ? 'Activated' : 'Deactivated'} department: ${dept_code}${!is_active && reason ? ` — ${reason}` : ''}`, ipAddress: req.ip });
    sendSuccess(res, { id, is_active }, is_active ? 'Department activated' : 'Department deactivated');
  } catch (error) {
    sendError(res, 'Failed to toggle department status', 500, (error as Error).message);
  }
};

// ═════════════════════════════════════════════════════════════
// MACHINE MASTER
// ═════════════════════════════════════════════════════════════
// machine_code is generated inline via 'MC' || nextval('machine_code_seq')
// at INSERT time — Prisma's create() can't express a raw SQL default like
// this, so create() stays a Prisma.sql raw query (matching the original
// exactly). List joins dept_master via the real dept_id relation, so that
// uses Prisma's include instead of a hand-written join.

const MACHINE_SORT: Record<string, string> = {
  machine_code:   'm.machine_code',
  machine_name:   'm.machine_name',
  machine_type:   'm.machine_type',
  dept_name:      'd.dept_name',
  make_brand:     'm.make_brand',
  capacity_speed: 'm.capacity_speed',
  created_at:     'm.created_at',
};

// GET /machines
// dept_id has no real FK constraint to dept_master in the database (and
// so no Prisma relation was generated for it), so the join stays a
// Prisma.sql raw query — same reasoning as Inventory Structure's
// master_lookup joins.
export const getMachines = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit   = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 25));
    const offset  = (page - 1) * limit;
    const search  = ((req.query.search as string) || '').trim();
    const status  = (req.query.status as string) || 'active';
    const sortCol = MACHINE_SORT[req.query.sort_by as string] || 'm.machine_code';
    const sortDir = req.query.sort_dir === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;

    let cfObj: Record<string, string> = {};
    try { if (req.query.col_filters) cfObj = JSON.parse(req.query.col_filters as string); } catch { /* ignore */ }

    const conds: Prisma.Sql[] = [];
    if (status === 'active')   conds.push(Prisma.sql`m.is_active = TRUE`);
    if (status === 'inactive') conds.push(Prisma.sql`m.is_active = FALSE`);

    if (search) {
      const like = `%${search}%`;
      conds.push(Prisma.sql`(m.machine_code ILIKE ${like} OR m.machine_name ILIKE ${like} OR m.machine_type ILIKE ${like}
        OR COALESCE(d.dept_name,'') ILIKE ${like} OR m.make_brand ILIKE ${like} OR m.capacity_speed ILIKE ${like}
        OR COALESCE(m.machine_remarks,'') ILIKE ${like})`);
    }

    const CF_MAP: Record<string, string> = {
      machine_code: 'm.machine_code', machine_name: 'm.machine_name', machine_type: 'm.machine_type',
      dept_name: 'd.dept_name', make_brand: 'm.make_brand', capacity_speed: 'm.capacity_speed',
      machine_remarks: 'm.machine_remarks',
    };
    for (const [col, expr] of Object.entries(CF_MAP)) {
      const val = (cfObj[col] || '').trim();
      if (val) conds.push(Prisma.sql`COALESCE(${Prisma.raw(expr)},'') ILIKE ${`%${val}%`}`);
    }

    const where = conds.length ? Prisma.sql`WHERE ${Prisma.join(conds, ' AND ')}` : Prisma.empty;
    const fromJoin = Prisma.sql`FROM machine_master m LEFT JOIN dept_master d ON d.id = m.dept_id`;

    const [countRows, dataRows] = await Promise.all([
      prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`SELECT COUNT(*) AS total ${fromJoin} ${where}`),
      prisma.$queryRaw(
        Prisma.sql`
          SELECT m.id, m.machine_code, m.machine_name, m.machine_type,
                 m.dept_id, d.dept_name, d.dept_code AS dept_ref_code,
                 m.make_brand, m.capacity_speed, m.machine_remarks,
                 m.deactivation_reason, m.deactivated_at,
                 m.is_active, m.created_at, m.updated_at,
                 EXISTS(SELECT 1 FROM operation_master op WHERE op.is_active = TRUE AND op.machine_ids @> ARRAY[m.id]) AS used_elsewhere
          ${fromJoin}
          ${where}
          ORDER BY ${Prisma.raw(sortCol)} ${sortDir}
          LIMIT ${limit} OFFSET ${offset}
        `
      ),
    ]);

    const total       = Number(countRows[0]?.total ?? 0);
    const total_pages = Math.ceil(total / limit) || 1;
    sendSuccess(res, dataRows, 'Machines fetched', 200, { total, total_pages, page, limit });
  } catch (error) {
    sendError(res, 'Failed to fetch machines', 500, (error as Error).message);
  }
};

// GET /machines/stats
export const getMachineStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [active, inactive] = await Promise.all([
      prisma.machine_master.count({ where: { is_active: true } }),
      prisma.machine_master.count({ where: { is_active: false } }),
    ]);
    sendSuccess(res, { active, inactive }, 'Stats fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch machine stats', 500, (error as Error).message);
  }
};

// GET /machines/lov
export const getMachineLOV = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await prisma.$queryRaw(
      Prisma.sql`
        SELECT m.id, m.machine_code, m.machine_name, m.machine_type, d.dept_name
        FROM machine_master m
        LEFT JOIN dept_master d ON d.id = m.dept_id
        WHERE m.is_active = TRUE
        ORDER BY m.machine_name
      `
    );
    sendSuccess(res, rows, 'Machine LOV fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch machine LOV', 500, (error as Error).message);
  }
};

// POST /machines
// Body: machine_name, machine_type, dept_id, make_brand, capacity_speed, machine_remarks
// machine_code is auto-generated via sequence
export const createMachine = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as Record<string, unknown>;
    const machine_name   = String(b.machine_name   || '').trim();
    const machine_type   = String(b.machine_type   || '').trim();
    const dept_id        = b.dept_id ? parseInt(String(b.dept_id), 10) : null;
    const make_brand     = String(b.make_brand     || '').trim();
    const capacity_speed = String(b.capacity_speed || '').trim();
    const machine_remarks = String(b.machine_remarks || '').trim() || null;

    if (!machine_name)   { sendValidationError(res, 'Machine Name is required'); return; }
    if (!machine_type)   { sendValidationError(res, 'Machine Type is required'); return; }
    if (!dept_id)        { sendValidationError(res, 'Department is required'); return; }
    if (!make_brand)     { sendValidationError(res, 'Make / Brand is required'); return; }
    if (!capacity_speed) { sendValidationError(res, 'Capacity / Speed is required'); return; }

    const rows = await prisma.$queryRaw<{ id: number; machine_code: string }[]>(
      Prisma.sql`
        INSERT INTO machine_master
          (machine_code, machine_name, machine_type, dept_id,
           make_brand, capacity_speed, machine_remarks, created_by, updated_by)
        VALUES
          ('MC' || LPAD(nextval('machine_code_seq')::text, 4, '0'),
           ${machine_name}, ${machine_type}, ${dept_id},
           ${make_brand}, ${capacity_speed}, ${machine_remarks}, ${req.user?.id ?? null}, ${req.user?.id ?? null})
        RETURNING id, machine_code
      `
    );
    const created = rows[0];

    logAudit({ userId: req.user?.id, employeeId: req.user?.employee_id, fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(), action: 'CREATE', module: AUDIT_MODULE.MACHINE_MASTER, recordId: created?.id, description: `Created machine: ${created?.machine_code}`, newValues: { machine_name, machine_type, dept_id, make_brand, capacity_speed, machine_remarks }, ipAddress: req.ip });
    sendSuccess(res, { id: created?.id, machine_code: created?.machine_code }, 'Machine created successfully', 201);
  } catch (error) {
    sendError(res, 'Failed to create machine', 500, (error as Error).message);
  }
};

// PUT /machines/:id
export const updateMachine = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const b = req.body as Record<string, unknown>;
    const machine_name   = String(b.machine_name   || '').trim();
    const machine_type   = String(b.machine_type   || '').trim();
    const dept_id        = b.dept_id ? parseInt(String(b.dept_id), 10) : null;
    const make_brand     = String(b.make_brand     || '').trim();
    const capacity_speed = String(b.capacity_speed || '').trim();
    const machine_remarks = String(b.machine_remarks || '').trim() || null;

    if (!machine_name)   { sendValidationError(res, 'Machine Name is required'); return; }
    if (!machine_type)   { sendValidationError(res, 'Machine Type is required'); return; }
    if (!dept_id)        { sendValidationError(res, 'Department is required'); return; }
    if (!make_brand)     { sendValidationError(res, 'Make / Brand is required'); return; }
    if (!capacity_speed) { sendValidationError(res, 'Capacity / Speed is required'); return; }

    let updated;
    try {
      updated = await prisma.machine_master.update({
        where: { id },
        data: { machine_name, machine_type, dept_id, make_brand, capacity_speed, machine_remarks, updated_by: req.user?.id ?? null, updated_at: new Date() },
        select: { id: true, machine_code: true },
      });
    } catch (err) {
      if ((err as Prisma.PrismaClientKnownRequestError).code === 'P2025') { sendError(res, 'Machine not found', 404); return; }
      throw err;
    }

    logAudit({ userId: req.user?.id, employeeId: req.user?.employee_id, fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(), action: 'UPDATE', module: AUDIT_MODULE.MACHINE_MASTER, recordId: id, description: `Updated machine: ${updated.machine_code}`, newValues: { machine_name, machine_type, dept_id, make_brand, capacity_speed, machine_remarks }, ipAddress: req.ip });
    sendSuccess(res, { id }, 'Machine updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update machine', 500, (error as Error).message);
  }
};

// DELETE /machines/:id  (toggle active/inactive)
export const toggleMachineStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const { reason } = req.body as { reason?: string };
    const rows = await prisma.$queryRaw<{ id: number; is_active: boolean; machine_code: string }[]>(
      Prisma.sql`
        UPDATE machine_master
        SET is_active = NOT is_active,
            deactivation_reason = CASE WHEN is_active THEN ${reason?.trim() || null} ELSE NULL END,
            deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
            updated_at          = NOW()
        WHERE id = ${id}
        RETURNING id, is_active, machine_code
      `
    );
    if (!rows.length) { sendError(res, 'Machine not found', 404); return; }

    const { is_active, machine_code } = rows[0];
    logAudit({ userId: req.user?.id, employeeId: req.user?.employee_id, fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(), action: 'DELETE', module: AUDIT_MODULE.MACHINE_MASTER, recordId: id, description: `${is_active ? 'Activated' : 'Deactivated'} machine: ${machine_code}${!is_active && reason ? ` — ${reason}` : ''}`, ipAddress: req.ip });
    sendSuccess(res, { id, is_active }, is_active ? 'Machine activated' : 'Machine deactivated');
  } catch (error) {
    sendError(res, 'Failed to toggle machine status', 500, (error as Error).message);
  }
};

// POST /machines/import
export const importMachines = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows } = req.body as { rows: Record<string, unknown>[] };
    if (!rows?.length) { sendValidationError(res, 'No rows provided'); return; }

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    const deptRows = await prisma.dept_master.findMany({ where: { is_active: true }, select: { id: true, dept_code: true } });
    const deptMap = new Map(deptRows.map(d => [d.dept_code.toUpperCase(), d.id]));

    for (const row of rows) {
      const machine_name    = String(row.machine_name    || '').trim();
      const machine_type    = String(row.machine_type    || '').trim();
      const dept_code       = String(row.dept_code       || '').trim().toUpperCase();
      const make_brand      = String(row.make_brand      || '').trim();
      const capacity_speed  = String(row.capacity_speed  || '').trim();
      const machine_remarks = String(row.machine_remarks || '').trim() || null;

      if (!machine_name || !machine_type || !dept_code || !make_brand || !capacity_speed) {
        results.errors.push(`Row skipped: missing required fields (machine_name, machine_type, dept_code, make_brand, capacity_speed)`);
        continue;
      }

      const dept_id = deptMap.get(dept_code);
      if (!dept_id) {
        results.errors.push(`Row skipped: dept_code "${dept_code}" not found or inactive`);
        continue;
      }

      try {
        await prisma.$executeRaw(
          Prisma.sql`
            INSERT INTO machine_master
              (machine_code, machine_name, machine_type, dept_id,
               make_brand, capacity_speed, machine_remarks, created_by, updated_by)
            VALUES
              ('MC' || LPAD(nextval('machine_code_seq')::text, 4, '0'),
               ${machine_name}, ${machine_type}, ${dept_id},
               ${make_brand}, ${capacity_speed}, ${machine_remarks}, ${req.user?.id ?? null}, ${req.user?.id ?? null})
          `
        );
        results.created++;
      } catch (err) {
        const e = err as Error;
        if (e.message.includes('unique') || e.message.includes('duplicate')) { results.skipped++; }
        else { results.errors.push(`${machine_name}: ${e.message}`); }
      }
    }

    logAudit({ userId: req.user?.id, employeeId: req.user?.employee_id, fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(), action: 'CREATE', module: AUDIT_MODULE.MACHINE_MASTER, description: `Bulk import: ${results.created} created, ${results.skipped} skipped`, ipAddress: req.ip });
    sendSuccess(res, results, `Import complete: ${results.created} created, ${results.skipped} skipped`);
  } catch (error) {
    sendError(res, 'Import failed', 500, (error as Error).message);
  }
};

// ═════════════════════════════════════════════════════════════
// OPERATION MASTER
// ═════════════════════════════════════════════════════════════
// operation_code is generated inline like machine_code (raw query for
// create). machine_names is a STRING_AGG over machine_ids (a plain
// Int[] column, not a real relation table), so the list stays a
// Prisma.sql raw query throughout — not expressible via Prisma's
// query builder at all.

const OPERATION_SORT: Record<string, string> = {
  operation_code:   'o.operation_code',
  operation_name:   'o.operation_name',
  dept_name:        'd.dept_name',
  machine_names:    '(SELECT STRING_AGG(m.machine_name, \', \' ORDER BY m.machine_name) FROM machine_master m WHERE m.id = ANY(o.machine_ids))',
  std_time:         'o.std_time',
  yield_percentage: 'o.yield_percentage',
  process_by:       'o.process_by',
  created_at:       'o.created_at',
};

// GET /operations
export const getOperations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit   = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 25));
    const offset  = (page - 1) * limit;
    const search  = ((req.query.search as string) || '').trim();
    const status  = (req.query.status as string) || 'active';
    const sortCol = OPERATION_SORT[req.query.sort_by as string] || 'o.operation_code';
    const sortDir = req.query.sort_dir === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;

    let cfObj: Record<string, string> = {};
    try { if (req.query.col_filters) cfObj = JSON.parse(req.query.col_filters as string); } catch { /* ignore */ }

    const conds: Prisma.Sql[] = [];
    if (status === 'active')   conds.push(Prisma.sql`o.is_active = TRUE`);
    if (status === 'inactive') conds.push(Prisma.sql`o.is_active = FALSE`);

    if (search) {
      const like = `%${search}%`;
      conds.push(Prisma.sql`(o.operation_code ILIKE ${like} OR o.operation_name ILIKE ${like} OR COALESCE(d.dept_name,'') ILIKE ${like}
        OR EXISTS (SELECT 1 FROM machine_master mm WHERE mm.id = ANY(o.machine_ids) AND mm.machine_name ILIKE ${like})
        OR COALESCE(o.process_by,'') ILIKE ${like})`);
    }

    const CF_MAP: Record<string, string> = {
      operation_code:   'o.operation_code',
      operation_name:   'o.operation_name',
      dept_name:        'd.dept_name',
      machine_names:    '(SELECT COALESCE(STRING_AGG(m.machine_name, \', \'), \'\') FROM machine_master m WHERE m.id = ANY(o.machine_ids))',
      std_time:         'o.std_time::text',
      yield_percentage: 'o.yield_percentage::text',
      process_by:       'o.process_by',
    };
    for (const [col, expr] of Object.entries(CF_MAP)) {
      const val = (cfObj[col] || '').trim();
      if (val) conds.push(Prisma.sql`COALESCE(${Prisma.raw(expr)},'') ILIKE ${`%${val}%`}`);
    }

    const where = conds.length ? Prisma.sql`WHERE ${Prisma.join(conds, ' AND ')}` : Prisma.empty;
    const fromJoin = Prisma.sql`FROM operation_master o LEFT JOIN dept_master d ON d.id = o.dept_id`;

    const [countRows, dataRows] = await Promise.all([
      prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`SELECT COUNT(*) AS total ${fromJoin} ${where}`),
      prisma.$queryRaw(
        Prisma.sql`
          SELECT o.id, o.operation_code, o.operation_name,
                 o.dept_id, d.dept_name, d.dept_code AS dept_ref_code,
                 o.machine_ids,
                 (SELECT STRING_AGG(m.machine_name, ', ' ORDER BY m.machine_name)
                  FROM machine_master m WHERE m.id = ANY(o.machine_ids)) AS machine_names,
                 o.std_time, o.yield_percentage, o.process_by,
                 o.deactivation_reason, o.deactivated_at,
                 o.is_active, o.created_at, o.updated_at
          ${fromJoin}
          ${where}
          ORDER BY ${Prisma.raw(sortCol)} ${sortDir}
          LIMIT ${limit} OFFSET ${offset}
        `
      ),
    ]);

    const total       = Number(countRows[0]?.total ?? 0);
    const total_pages = Math.ceil(total / limit) || 1;
    sendSuccess(res, dataRows, 'Operations fetched', 200, { total, total_pages, page, limit });
  } catch (error) {
    sendError(res, 'Failed to fetch operations', 500, (error as Error).message);
  }
};

// GET /operations/stats
export const getOperationStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [active, inactive] = await Promise.all([
      prisma.operation_master.count({ where: { is_active: true } }),
      prisma.operation_master.count({ where: { is_active: false } }),
    ]);
    sendSuccess(res, { active, inactive }, 'Stats fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch operation stats', 500, (error as Error).message);
  }
};

// GET /operations/lov
export const getOperationLOV = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await prisma.$queryRaw(
      Prisma.sql`
        SELECT o.id, o.operation_code, o.operation_name, o.std_time,
               d.dept_name,
               (SELECT STRING_AGG(m.machine_name, ', ' ORDER BY m.machine_name)
                FROM machine_master m WHERE m.id = ANY(o.machine_ids)) AS machine_names
        FROM operation_master o
        LEFT JOIN dept_master d ON d.id = o.dept_id
        WHERE o.is_active = TRUE
        ORDER BY o.operation_name
      `
    );
    sendSuccess(res, rows, 'Operation LOV fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch operation LOV', 500, (error as Error).message);
  }
};

// POST /operations
// Body: operation_name, dept_id, machine_ids (number[]), std_time, yield_percentage, process_by
// operation_code is auto-generated via sequence
export const createOperation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as Record<string, unknown>;
    const operation_name   = String(b.operation_name   || '').trim();
    const dept_id          = b.dept_id ? parseInt(String(b.dept_id), 10) : null;
    const machine_ids      = Array.isArray(b.machine_ids) ? (b.machine_ids as unknown[]).map(v => parseInt(String(v), 10)).filter(n => !isNaN(n)) : [];
    const std_time         = b.std_time != null && String(b.std_time).trim() !== '' ? parseFloat(String(b.std_time)) : null;
    const yield_percentage = b.yield_percentage != null && String(b.yield_percentage).trim() !== '' ? parseFloat(String(b.yield_percentage)) : null;
    const process_by       = String(b.process_by || '').trim() || null;

    if (!operation_name)    { sendValidationError(res, 'Operation Name is required'); return; }
    if (!dept_id)           { sendValidationError(res, 'Department is required'); return; }
    if (!machine_ids.length){ sendValidationError(res, 'At least one Machine is required'); return; }
    if (std_time == null || isNaN(std_time) || std_time <= 0) { sendValidationError(res, 'Std Time (min) must be a positive number'); return; }

    const rows = await prisma.$queryRaw<{ id: number; operation_code: string }[]>(
      Prisma.sql`
        INSERT INTO operation_master
          (operation_code, operation_name, dept_id, machine_ids,
           std_time, yield_percentage, process_by, created_by, updated_by)
        VALUES
          ('OP' || LPAD(nextval('operation_code_seq')::text, 4, '0'),
           ${operation_name}, ${dept_id}, ${machine_ids}::INT[], ${std_time}, ${yield_percentage}, ${process_by}, ${req.user?.id ?? null}, ${req.user?.id ?? null})
        RETURNING id, operation_code
      `
    );
    const created = rows[0];

    logAudit({ userId: req.user?.id, employeeId: req.user?.employee_id, fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(), action: 'CREATE', module: AUDIT_MODULE.OPERATION_MASTER, recordId: created?.id, description: `Created operation: ${created?.operation_code}`, newValues: { operation_name, dept_id, machine_ids, std_time, yield_percentage, process_by }, ipAddress: req.ip });
    sendSuccess(res, { id: created?.id, operation_code: created?.operation_code }, 'Operation created successfully', 201);
  } catch (error) {
    sendError(res, 'Failed to create operation', 500, (error as Error).message);
  }
};

// PUT /operations/:id
export const updateOperation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const b = req.body as Record<string, unknown>;
    const operation_name   = String(b.operation_name   || '').trim();
    const dept_id          = b.dept_id ? parseInt(String(b.dept_id), 10) : null;
    const machine_ids      = Array.isArray(b.machine_ids) ? (b.machine_ids as unknown[]).map(v => parseInt(String(v), 10)).filter(n => !isNaN(n)) : [];
    const std_time         = b.std_time != null && String(b.std_time).trim() !== '' ? parseFloat(String(b.std_time)) : null;
    const yield_percentage = b.yield_percentage != null && String(b.yield_percentage).trim() !== '' ? parseFloat(String(b.yield_percentage)) : null;
    const process_by       = String(b.process_by || '').trim() || null;

    if (!operation_name)    { sendValidationError(res, 'Operation Name is required'); return; }
    if (!dept_id)           { sendValidationError(res, 'Department is required'); return; }
    if (!machine_ids.length){ sendValidationError(res, 'At least one Machine is required'); return; }
    if (std_time == null || isNaN(std_time) || std_time <= 0) { sendValidationError(res, 'Std Time (min) must be a positive number'); return; }

    let updated;
    try {
      updated = await prisma.operation_master.update({
        where: { id },
        data: { operation_name, dept_id, machine_ids, std_time, yield_percentage, process_by, updated_by: req.user?.id ?? null, updated_at: new Date() },
        select: { id: true, operation_code: true },
      });
    } catch (err) {
      if ((err as Prisma.PrismaClientKnownRequestError).code === 'P2025') { sendError(res, 'Operation not found', 404); return; }
      throw err;
    }

    logAudit({ userId: req.user?.id, employeeId: req.user?.employee_id, fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(), action: 'UPDATE', module: AUDIT_MODULE.OPERATION_MASTER, recordId: id, description: `Updated operation: ${updated.operation_code}`, newValues: { operation_name, dept_id, machine_ids, std_time, yield_percentage, process_by }, ipAddress: req.ip });
    sendSuccess(res, { id }, 'Operation updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update operation', 500, (error as Error).message);
  }
};

// DELETE /operations/:id
export const toggleOperationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const { reason } = req.body as { reason?: string };
    const rows = await prisma.$queryRaw<{ id: number; is_active: boolean; operation_code: string }[]>(
      Prisma.sql`
        UPDATE operation_master
        SET is_active = NOT is_active,
            deactivation_reason = CASE WHEN is_active THEN ${reason?.trim() || null} ELSE NULL END,
            deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
            updated_at          = NOW()
        WHERE id = ${id}
        RETURNING id, is_active, operation_code
      `
    );
    if (!rows.length) { sendError(res, 'Operation not found', 404); return; }

    const { is_active, operation_code } = rows[0];
    logAudit({ userId: req.user?.id, employeeId: req.user?.employee_id, fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(), action: 'DELETE', module: AUDIT_MODULE.OPERATION_MASTER, recordId: id, description: `${is_active ? 'Activated' : 'Deactivated'} operation: ${operation_code}${!is_active && reason ? ` — ${reason}` : ''}`, ipAddress: req.ip });
    sendSuccess(res, { id, is_active }, is_active ? 'Operation activated' : 'Operation deactivated');
  } catch (error) {
    sendError(res, 'Failed to toggle operation status', 500, (error as Error).message);
  }
};

// POST /operations/import
export const importOperations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows } = req.body as { rows: Record<string, unknown>[] };
    if (!rows?.length) { sendValidationError(res, 'No rows provided'); return; }

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    const [deptRows, machineRows] = await Promise.all([
      prisma.dept_master.findMany({ where: { is_active: true }, select: { id: true, dept_code: true } }),
      prisma.machine_master.findMany({ where: { is_active: true }, select: { id: true, machine_code: true } }),
    ]);
    const deptMap    = new Map(deptRows.map(d => [d.dept_code.toUpperCase(), d.id]));
    const machineMap = new Map(machineRows.map(m => [m.machine_code.toUpperCase(), m.id]));

    for (const row of rows) {
      const operation_name   = String(row.operation_name   || '').trim();
      const dept_code        = String(row.dept_code        || '').trim().toUpperCase();
      const machine_codes    = String(row.machine_code     || '').split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
      const std_time_raw     = String(row.std_time         || '').trim();
      const yield_pct_raw    = String(row.yield_percentage || '').trim();
      const process_by       = String(row.process_by       || '').trim() || null;

      const std_time         = std_time_raw  !== '' ? parseFloat(std_time_raw)  : null;
      const yield_percentage = yield_pct_raw !== '' ? parseFloat(yield_pct_raw) : null;

      if (!operation_name || !dept_code || !machine_codes.length || std_time == null || isNaN(std_time)) {
        results.errors.push(`Row skipped: missing required fields (operation_name, dept_code, machine_code, std_time)`);
        continue;
      }

      const dept_id = deptMap.get(dept_code);
      const machine_ids: number[] = [];
      for (const mc of machine_codes) {
        const mid = machineMap.get(mc);
        if (!mid) { results.errors.push(`Row skipped: machine_code "${mc}" not found or inactive`); break; }
        machine_ids.push(mid);
      }

      if (!dept_id)             { results.errors.push(`Row skipped: dept_code "${dept_code}" not found or inactive`); continue; }
      if (machine_ids.length !== machine_codes.length) continue;

      try {
        await prisma.$executeRaw(
          Prisma.sql`
            INSERT INTO operation_master
              (operation_code, operation_name, dept_id, machine_ids,
               std_time, yield_percentage, process_by, created_by, updated_by)
            VALUES
              ('OP' || LPAD(nextval('operation_code_seq')::text, 4, '0'),
               ${operation_name}, ${dept_id}, ${machine_ids}::INT[], ${std_time}, ${yield_percentage}, ${process_by}, ${req.user?.id ?? null}, ${req.user?.id ?? null})
          `
        );
        results.created++;
      } catch (err) {
        const e = err as Error;
        if (e.message.includes('unique') || e.message.includes('duplicate')) { results.skipped++; }
        else { results.errors.push(`${operation_name}: ${e.message}`); }
      }
    }

    logAudit({ userId: req.user?.id, employeeId: req.user?.employee_id, fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(), action: 'CREATE', module: AUDIT_MODULE.OPERATION_MASTER, description: `Bulk import: ${results.created} created, ${results.skipped} skipped`, ipAddress: req.ip });
    sendSuccess(res, results, `Import complete: ${results.created} created, ${results.skipped} skipped`);
  } catch (error) {
    sendError(res, 'Import failed', 500, (error as Error).message);
  }
};

// ═════════════════════════════════════════════════════════════
// ALLOY MASTER
// ═════════════════════════════════════════════════════════════
// alloy_code is direct user input (uppercased), no generating sequence,
// no joins — pure Prisma builder throughout.

const ALLOY_SORT: Record<string, string> = {
  alloy_code:              'alloy_code',
  alloy_name:              'alloy_name',
  karat:                   'karat',
  purity_pct:              'purity_pct',
  metal_category:          'metal_category',
  alloy_status:            'alloy_status',
  color_tone:              'color_tone',
  alloy_cost_per_gram:     'alloy_cost_per_gram',
  created_at:              'created_at',
};

// GET /alloys
export const getAlloys = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit   = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 25));
    const offset  = (page - 1) * limit;
    const search  = ((req.query.search as string) || '').trim();
    const status  = (req.query.status as string) || 'active';
    const sortCol = ALLOY_SORT[req.query.sort_by as string] || 'alloy_code';
    const sortDir = req.query.sort_dir === 'desc' ? 'desc' : 'asc';

    let cfObj: Record<string, string> = {};
    try { if (req.query.col_filters) cfObj = JSON.parse(req.query.col_filters as string); } catch { /* ignore */ }

    const AND: Prisma.alloy_masterWhereInput[] = [];
    if (status === 'active')   AND.push({ is_active: true });
    if (status === 'inactive') AND.push({ is_active: false });

    if (search) {
      AND.push({
        OR: [
          { alloy_code:  { contains: search, mode: 'insensitive' } },
          { alloy_name:  { contains: search, mode: 'insensitive' } },
          { karat:       { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    for (const col of ['alloy_code', 'alloy_name', 'karat', 'description'] as const) {
      const val = (cfObj[col] || '').trim();
      if (val) AND.push({ [col]: { contains: val, mode: 'insensitive' } });
    }

    const where: Prisma.alloy_masterWhereInput = AND.length ? { AND } : {};

    const [total, dataRows] = await Promise.all([
      prisma.alloy_master.count({ where }),
      prisma.alloy_master.findMany({
        where,
        select: {
          id: true, alloy_code: true, alloy_name: true, karat: true, purity_pct: true, description: true,
          metal_category: true, purity_target: true, application_type: true, alloy_status: true,
          with_silver: true, silver_percentage: true, alloy_additives_type: true, alloy_density: true,
          composition_remark: true, alloy_hardness: true, tensile_strength: true, ductility_elongation: true,
          melting_range: true, color_tone: true, finish_behaviour: true, max_drawing_reduction: true,
          alloy_required: true, breakage_sensitivity: true, melting_method: true,
          alloy_cost_per_gram: true, indicative_alloy_cost_per_gram: true,
          supplier_name: true, alloy_brand: true, alloy_hazardous: true,
          is_active: true, deactivation_reason: true, deactivated_at: true, created_at: true, updated_at: true,
        },
        orderBy: { [sortCol]: sortDir },
        skip: offset,
        take: limit,
      }),
    ]);

    const total_pages = Math.ceil(total / limit) || 1;
    sendSuccess(res, dataRows, 'Alloys fetched', 200, { total, total_pages, page, limit });
  } catch (error) {
    sendError(res, 'Failed to fetch alloys', 500, (error as Error).message);
  }
};

// GET /alloys/stats
export const getAlloyStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [active, inactive] = await Promise.all([
      prisma.alloy_master.count({ where: { is_active: true } }),
      prisma.alloy_master.count({ where: { is_active: false } }),
    ]);
    sendSuccess(res, { active, inactive }, 'Stats fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch alloy stats', 500, (error as Error).message);
  }
};

const toStr  = (v: unknown) => (v != null && String(v).trim()) || null;
const toNum  = (v: unknown) => (v != null && String(v).trim() !== '') ? parseFloat(String(v)) : null;
const toBool = (v: unknown) => v === true || v === 'true' || v === '1';

function buildAlloyData(b: Record<string, unknown>) {
  return {
    karat: toStr(b.karat),
    purity_pct: toNum(b.purity_pct) ?? 0,
    description: toStr(b.description),
    metal_category: toStr(b.metal_category),
    purity_target: toStr(b.purity_target),
    application_type: toStr(b.application_type),
    alloy_status: toStr(b.alloy_status),
    with_silver: toStr(b.with_silver),
    silver_percentage: toNum(b.silver_percentage),
    alloy_additives_type: toStr(b.alloy_additives_type),
    alloy_density: toNum(b.alloy_density),
    composition_remark: toStr(b.composition_remark),
    alloy_hardness: toStr(b.alloy_hardness),
    tensile_strength: toStr(b.tensile_strength),
    ductility_elongation: toStr(b.ductility_elongation),
    melting_range: toStr(b.melting_range),
    color_tone: toStr(b.color_tone),
    finish_behaviour: toStr(b.finish_behaviour),
    max_drawing_reduction: toStr(b.max_drawing_reduction),
    alloy_required: toStr(b.alloy_required),
    breakage_sensitivity: toStr(b.breakage_sensitivity),
    melting_method: toStr(b.melting_method),
    alloy_cost_per_gram: toNum(b.alloy_cost_per_gram),
    indicative_alloy_cost_per_gram: toNum(b.indicative_alloy_cost_per_gram),
    supplier_name: toStr(b.supplier_name),
    alloy_brand: toStr(b.alloy_brand),
    alloy_hazardous: toBool(b.alloy_hazardous),
  };
}

// POST /alloys
export const createAlloy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as Record<string, unknown>;
    const alloy_code = String(b.alloy_code || '').trim();
    const alloy_name = String(b.alloy_name || '').trim();
    if (!alloy_code) { sendValidationError(res, 'Alloy Code is required'); return; }
    if (!alloy_name) { sendValidationError(res, 'Alloy Name is required'); return; }

    const created = await prisma.alloy_master.create({
      data: {
        alloy_code: alloy_code.toUpperCase(),
        alloy_name,
        ...buildAlloyData(b),
        created_by: req.user?.id ?? null,
        updated_by: req.user?.id ?? null,
      },
      select: { id: true, alloy_code: true },
    });

    logAudit({ userId: req.user?.id, employeeId: req.user?.employee_id, fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(), action: 'CREATE', module: AUDIT_MODULE.ALLOY_MASTER, recordId: created.id, description: `Created alloy: ${created.alloy_code}`, newValues: req.body, ipAddress: req.ip });
    sendSuccess(res, { id: created.id, alloy_code: created.alloy_code }, 'Alloy created successfully', 201);
  } catch (error) {
    const err = error as Prisma.PrismaClientKnownRequestError & Error;
    if (err.code === 'P2002') { sendValidationError(res, 'Alloy code already exists'); return; }
    sendError(res, 'Failed to create alloy', 500, err.message);
  }
};

// PUT /alloys/:id
export const updateAlloy = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const b = req.body as Record<string, unknown>;
    const alloy_name = String(b.alloy_name || '').trim();
    if (!alloy_name) { sendValidationError(res, 'Alloy Name is required'); return; }

    let updated;
    try {
      updated = await prisma.alloy_master.update({
        where: { id },
        data: { alloy_name, ...buildAlloyData(b), updated_by: req.user?.id ?? null, updated_at: new Date() },
        select: { id: true, alloy_code: true },
      });
    } catch (err) {
      if ((err as Prisma.PrismaClientKnownRequestError).code === 'P2025') { sendError(res, 'Alloy not found', 404); return; }
      throw err;
    }

    logAudit({ userId: req.user?.id, employeeId: req.user?.employee_id, fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(), action: 'UPDATE', module: AUDIT_MODULE.ALLOY_MASTER, recordId: id, description: `Updated alloy: ${updated.alloy_code}`, newValues: req.body, ipAddress: req.ip });
    sendSuccess(res, { id }, 'Alloy updated successfully');
  } catch (error) {
    sendError(res, 'Failed to update alloy', 500, (error as Error).message);
  }
};

// DELETE /alloys/:id
export const toggleAlloyStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const { reason } = req.body as { reason?: string };
    const rows = await prisma.$queryRaw<{ id: number; is_active: boolean; alloy_code: string }[]>(
      Prisma.sql`
        UPDATE alloy_master
        SET is_active = NOT is_active,
            deactivation_reason = CASE WHEN is_active THEN ${reason?.trim() || null} ELSE NULL END,
            deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
            updated_at          = NOW()
        WHERE id = ${id}
        RETURNING id, is_active, alloy_code
      `
    );
    if (!rows.length) { sendError(res, 'Alloy not found', 404); return; }

    const { is_active, alloy_code } = rows[0];
    logAudit({ userId: req.user?.id, employeeId: req.user?.employee_id, fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(), action: 'DELETE', module: AUDIT_MODULE.ALLOY_MASTER, recordId: id, description: `${is_active ? 'Activated' : 'Deactivated'} alloy: ${alloy_code}${!is_active && reason ? ` — ${reason}` : ''}`, ipAddress: req.ip });
    sendSuccess(res, { id, is_active }, is_active ? 'Alloy activated' : 'Alloy deactivated');
  } catch (error) {
    sendError(res, 'Failed to toggle alloy status', 500, (error as Error).message);
  }
};

// POST /alloys/import
export const importAlloys = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows } = req.body as { rows: Record<string, unknown>[] };
    if (!rows?.length) { sendValidationError(res, 'No rows provided'); return; }

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const row of rows) {
      const alloy_code = String(row.alloy_code || '').trim().toUpperCase();
      const alloy_name = String(row.alloy_name || '').trim();
      if (!alloy_code || !alloy_name) { results.errors.push('Row skipped: missing alloy_code or alloy_name'); continue; }
      try {
        await prisma.alloy_master.create({
          data: {
            alloy_code, alloy_name,
            ...buildAlloyData(row),
            created_by: req.user?.id ?? null,
            updated_by: req.user?.id ?? null,
          },
        });
        results.created++;
      } catch (err) {
        const e = err as Prisma.PrismaClientKnownRequestError & Error;
        if (e.code === 'P2002') { results.skipped++; }
        else { results.errors.push(`${alloy_code}: ${e.message}`); }
      }
    }

    logAudit({ userId: req.user?.id, employeeId: req.user?.employee_id, fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(), action: 'CREATE', module: AUDIT_MODULE.ALLOY_MASTER, description: `Bulk import: ${results.created} created, ${results.skipped} skipped`, ipAddress: req.ip });
    sendSuccess(res, results, `Import complete: ${results.created} created, ${results.skipped} skipped`);
  } catch (error) {
    sendError(res, 'Import failed', 500, (error as Error).message);
  }
};
