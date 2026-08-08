import { Response } from 'express';
import crypto from 'crypto';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { hashPassword } from '../services/auth.service';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { logAudit } from '../utils/audit';
import { AUDIT_MODULE } from '../constants/auditModules';
import { sendWelcomeEmail } from '../services/email.service';
import { invalidateRolePermissionCache, invalidateUserPermissionCache } from '../utils/permissionCache';

interface UserRow {
  user_id: number; employee_id: string; first_name: string; last_name: string | null;
  full_name: string; emp_email: string | null; mobile_number: string | null; user_status: boolean | null;
  department_id: string | null; designation: string | null; manager_id: number | null;
  manager_name: string; start_date: Date | null; expiry_date: Date | null;
  timezone: string | null; language: string | null; created_at: Date | null;
}
interface RoleRow {
  user_id: number; role_id: number; role_name: string; role_code: string; is_default: boolean | null;
}

// Whitelisted sort columns (prevents SQL injection)
const SORT_COLS: Record<string, string> = {
  first_name:    'u.first_name',
  last_name:     'u.last_name',
  emp_email:     'u.emp_email',
  employee_id:   'u.employee_id',
  department_id: 'u.department_id',
  designation:   'u.designation',
  start_date:    'u.start_date',
  expiry_date:   'u.expiry_date',
  created_at:    'u.created_at',
};

// ── GET /users ────────────────────────────────────────────────
// Kept as parameterized $queryRaw: dynamic per-column filters (including
// a `::text ILIKE` substring match on date columns the frontend's generic
// filter row relies on) plus a self-join for manager name can't be
// expressed through Prisma's query builder.
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page    = Math.max(1, parseInt(req.query.page  as string) || 1);
    const limit   = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset  = (page - 1) * limit;
    const search  = ((req.query.search as string) || '').trim();
    const status  = (req.query.status as string) || 'active';
    const sortCol = SORT_COLS[req.query.sort_by as string] || 'u.first_name';
    const sortDir = req.query.sort_dir === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`;

    let cfObj: Record<string, string> = {};
    try {
      if (req.query.col_filters) cfObj = JSON.parse(req.query.col_filters as string);
    } catch { /* ignore malformed JSON */ }

    const conds: Prisma.Sql[] = [];
    if (status === 'active')   conds.push(Prisma.sql`u.user_status = TRUE`);
    if (status === 'inactive') conds.push(Prisma.sql`u.user_status = FALSE`);

    if (search) {
      const sp = `%${search}%`;
      conds.push(Prisma.sql`(u.first_name ILIKE ${sp} OR u.last_name ILIKE ${sp} OR u.employee_id ILIKE ${sp} OR u.emp_email ILIKE ${sp} OR COALESCE(u.department_id,'') ILIKE ${sp} OR COALESCE(u.designation,'') ILIKE ${sp})`);
    }

    for (const [key, raw] of Object.entries(cfObj)) {
      const v = (raw || '').trim();
      if (!v) continue;
      const like = `%${v}%`;
      switch (key) {
        case 'employee':
          conds.push(Prisma.sql`(u.first_name ILIKE ${like} OR u.last_name ILIKE ${like} OR u.employee_id ILIKE ${like})`);
          break;
        case 'emp_email':     conds.push(Prisma.sql`u.emp_email ILIKE ${like}`);                          break;
        case 'mobile_number': conds.push(Prisma.sql`COALESCE(u.mobile_number,'') ILIKE ${like}`);         break;
        case 'department_id': conds.push(Prisma.sql`COALESCE(u.department_id,'') ILIKE ${like}`);         break;
        case 'designation':   conds.push(Prisma.sql`COALESCE(u.designation,'') ILIKE ${like}`);           break;
        case 'manager_name':  conds.push(Prisma.sql`CONCAT(m.first_name,' ',COALESCE(m.last_name,'')) ILIKE ${like}`); break;
        case 'roles':
          conds.push(Prisma.sql`EXISTS (SELECT 1 FROM user_role ur2 JOIN role_master rm2 ON ur2.role_id = rm2.id WHERE ur2.user_id = u.user_id AND rm2.role_name ILIKE ${like})`);
          break;
        case 'user_status': {
          const sl = v.toLowerCase();
          if (sl.includes('act') && !sl.includes('inact')) conds.push(Prisma.sql`u.user_status = TRUE`);
          else if (sl.includes('inact') || sl === 'false') conds.push(Prisma.sql`u.user_status = FALSE`);
          break;
        }
        case 'start_date':   conds.push(Prisma.sql`u.start_date::text ILIKE ${like}`);   break;
        case 'expiry_date':  conds.push(Prisma.sql`u.expiry_date::text ILIKE ${like}`);  break;
        case 'created_at':   conds.push(Prisma.sql`u.created_at::text ILIKE ${like}`);   break;
      }
    }

    const WHERE = conds.length ? Prisma.sql`WHERE ${Prisma.join(conds, ' AND ')}` : Prisma.empty;
    const FROM_JOIN = Prisma.sql`FROM user_master u LEFT JOIN user_master m ON u.manager_id = m.user_id`;
    const sortColRaw = Prisma.raw(sortCol);

    const [countRows, users] = await Promise.all([
      prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`SELECT COUNT(*) AS total ${FROM_JOIN} ${WHERE}`),
      prisma.$queryRaw<UserRow[]>(Prisma.sql`
        SELECT
          u.user_id, u.employee_id, u.first_name, u.last_name,
          CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) AS full_name,
          u.emp_email, u.mobile_number, u.user_status,
          u.department_id, u.designation, u.manager_id,
          CONCAT(m.first_name, ' ', COALESCE(m.last_name, '')) AS manager_name,
          u.start_date, u.expiry_date, u.timezone, u.language, u.created_at
        ${FROM_JOIN}
        ${WHERE}
        ORDER BY ${sortColRaw} ${sortDir}
        LIMIT ${limit} OFFSET ${offset}
      `),
    ]);

    const total       = Number(countRows[0]?.total ?? 0);
    const total_pages = Math.ceil(total / limit);

    // Fetch roles only for this page's user_ids
    let roleRows: RoleRow[] = [];
    const userIds = users.map(u => u.user_id);
    if (userIds.length > 0) {
      const rows = await prisma.user_role.findMany({
        where: { user_id: { in: userIds } },
        select: {
          user_id: true, role_id: true, is_default: true,
          role_master: { select: { role_name: true, role_code: true } },
        },
        orderBy: [{ is_default: 'desc' }, { role_master: { role_name: 'asc' } }],
      });
      roleRows = rows.map(r => ({
        user_id: r.user_id, role_id: r.role_id, is_default: r.is_default,
        role_name: r.role_master.role_name, role_code: r.role_master.role_code,
      }));
    }

    const result = users.map(u => ({
      ...u,
      roles: roleRows
        .filter(r => Number(r.user_id) === Number(u.user_id))
        .map(({ user_id: _uid, ...r }) => r),
    }));

    sendSuccess(res, result, 'Users fetched successfully', 200, { total, page, limit, total_pages });
  } catch (error) {
    logger.error('Get users error:', error);
    sendError(res, 'Failed to fetch users', 500, (error as Error).message);
  }
};

// ── GET /users/managers ───────────────────────────────────────
// Returns users who have the MANAGER role assigned
export const getManagers = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const managers = await prisma.user_master.findMany({
      where: {
        user_status: true,
        user_role: {
          some: {
            role_master: {
              OR: [
                { role_code: { equals: 'MANAGER', mode: 'insensitive' } },
                { role_name: { contains: 'manager', mode: 'insensitive' } },
              ],
            },
          },
        },
      },
      select: { user_id: true, employee_id: true, first_name: true, last_name: true },
    });

    const result = managers
      .map(m => ({
        user_id: m.user_id,
        employee_id: m.employee_id,
        full_name: `${m.first_name} ${m.last_name ?? ''}`.trim(),
      }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    sendSuccess(res, result, 'Managers fetched successfully');
  } catch (error) {
    logger.error('Get managers error:', error);
    sendError(res, 'Failed to fetch managers', 500, (error as Error).message);
  }
};

// ── GET /users/roles ──────────────────────────────────────────
export const getRoles = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const roles = await prisma.role_master.findMany({
      where: { is_active: true },
      select: { id: true, role_code: true, role_name: true, description: true, is_active: true },
      orderBy: { role_name: 'asc' },
    });
    sendSuccess(res, roles, 'Roles fetched successfully');
  } catch (error) {
    logger.error('Get roles error:', error);
    sendError(res, 'Failed to fetch roles', 500, (error as Error).message);
  }
};

// ── GET /users/:id/roles  (verify roles for a specific user) ─
export const getUserRoles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id, 10);

    const rows = await prisma.user_role.findMany({
      where: { user_id: userId },
      select: {
        user_id: true, role_id: true, is_default: true, created_at: true,
        role_master: { select: { role_name: true, role_code: true } },
      },
      orderBy: { is_default: 'desc' },
    });

    const result = rows.map(r => ({
      user_id: r.user_id, role_id: r.role_id,
      role_name: r.role_master.role_name, role_code: r.role_master.role_code,
      is_default: r.is_default, created_at: r.created_at,
    }));

    sendSuccess(res, result, `${result.length} role(s) found for user ${userId}`);
  } catch (error) {
    logger.error('Get user roles error:', error);
    sendError(res, 'Failed to fetch user roles', 500, (error as Error).message);
  }
};

// Replicates `COALESCE(department_id,'') <> COALESCE(:incoming,'')` semantics:
// a NULL department and an empty/undefined incoming department are treated as equal.
const deptConflictFilter = (incoming: string | null | undefined): Prisma.user_masterWhereInput => {
  const dept = incoming || null;
  return dept === null
    ? { department_id: { not: null } }
    : { OR: [{ department_id: null }, { department_id: { not: dept } }] };
};

// ── POST /users ───────────────────────────────────────────────
export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      employee_id, password, first_name, last_name,
      emp_email, mobile_number, department_id, designation,
      manager_id, start_date, expiry_date, timezone, language,
      role_ids,
    } = req.body as {
      employee_id: string; password: string; first_name: string; last_name?: string;
      emp_email: string; mobile_number?: string; department_id?: string;
      designation?: string; manager_id?: number; start_date: string;
      expiry_date?: string; timezone?: string; language?: string; role_ids: number[];
    };

    if (!employee_id || !password || !first_name || !emp_email || !start_date) {
      sendValidationError(res, 'Employee ID, password, first name, email and start date are required');
      return;
    }
    if (!Array.isArray(role_ids) || role_ids.length === 0) {
      sendValidationError(res, 'At least one role must be assigned');
      return;
    }
    if (mobile_number && !/^\d{10}$/.test(mobile_number)) {
      sendValidationError(res, 'Mobile number must be exactly 10 digits');
      return;
    }

    // Block same email in a different department
    const emailConflict = await prisma.user_master.findFirst({
      where: {
        emp_email: { equals: emp_email, mode: 'insensitive' },
        ...deptConflictFilter(department_id),
      },
      select: { department_id: true },
    });
    if (emailConflict) {
      sendError(res, `This email is already used in department "${emailConflict.department_id}"`, 409);
      return;
    }

    const password_hash = await hashPassword(password);
    const actorId = req.user?.id ?? null;

    // Generate activation token (valid 24 h)
    const activationToken  = crypto.randomBytes(32).toString('hex');
    const activationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const createdUser = await prisma.user_master.create({
      data: {
        employee_id, password_hash, first_name, last_name: last_name || null,
        emp_email, mobile_number: mobile_number || null, department_id: department_id || null,
        designation: designation || null, manager_id: manager_id || null,
        start_date: new Date(start_date), expiry_date: expiry_date ? new Date(expiry_date) : null,
        timezone: timezone || 'Asia/Kolkata', language: language || 'en',
        user_status: true,
        activation_token: activationToken, activation_token_expiry: activationExpiry,
        created_by: actorId, updated_by: actorId,
      },
      select: { user_id: true },
    });

    const newUserId = createdUser.user_id;

    // Save roles
    await prisma.user_role.createMany({
      data: role_ids.map((rid, i) => ({ user_id: newUserId, role_id: Number(rid), is_default: i === 0 })),
      skipDuplicates: true,
    });

    const savedRolesCount = await prisma.user_role.count({ where: { user_id: newUserId } });

    logger.info(`User created: ${employee_id} (user_id=${newUserId}), roles saved: ${savedRolesCount}`);

    // Send welcome email — fire-and-forget (don't fail user creation if email fails)
    const frontendUrl    = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const activationUrl  = `${frontendUrl}/activate?token=${activationToken}`;
    const recipientName  = `${first_name}${last_name ? ` ${last_name}` : ''}`;
    sendWelcomeEmail(emp_email, recipientName, employee_id, activationUrl).catch((emailErr) => {
      logger.warn(`Welcome email failed for ${emp_email}: ${(emailErr as Error).message}`);
    });

    logAudit({
      userId: actorId, employeeId: req.user?.employee_id, fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action: 'CREATE', module: AUDIT_MODULE.USERS, recordId: newUserId,
      description: `Created user ${employee_id} (${first_name} ${last_name ?? ''})`,
      newValues: { employee_id, first_name, last_name, emp_email, department_id, designation },
      ipAddress: req.ip,
    });

    sendSuccess(res, {
      user_id:     newUserId,
      roles_saved: savedRolesCount,
    }, `User created. ${savedRolesCount} role(s) saved.`, 201);

  } catch (error) {
    logger.error('Create user error:', error);
    if ((error as Prisma.PrismaClientKnownRequestError).code === 'P2002') {
      sendError(res, 'Employee ID already exists', 409);
    } else {
      sendError(res, (error as Error).message || 'Failed to create user', 500);
    }
  }
};

// ── PUT /users/:id ────────────────────────────────────────────
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id, 10);
    const {
      first_name, last_name, emp_email, mobile_number,
      department_id, designation, manager_id,
      start_date, expiry_date, timezone, language,
      password, role_ids,
    } = req.body as {
      first_name: string; last_name?: string; emp_email: string;
      mobile_number?: string; department_id?: string; designation?: string;
      manager_id?: number; start_date: string; expiry_date?: string;
      timezone?: string; language?: string; password?: string; role_ids: number[];
    };

    if (!first_name || !emp_email || !start_date) {
      sendValidationError(res, 'First name, email and start date are required');
      return;
    }
    if (!Array.isArray(role_ids) || role_ids.length === 0) {
      sendValidationError(res, 'At least one role must be assigned');
      return;
    }
    if (mobile_number && !/^\d{10}$/.test(mobile_number)) {
      sendValidationError(res, 'Mobile number must be exactly 10 digits');
      return;
    }

    // Block same email in a different department (exclude the user being updated)
    const emailConflict = await prisma.user_master.findFirst({
      where: {
        emp_email: { equals: emp_email, mode: 'insensitive' },
        user_id: { not: userId },
        ...deptConflictFilter(department_id),
      },
      select: { department_id: true },
    });
    if (emailConflict) {
      sendError(res, `This email is already used in department "${emailConflict.department_id}"`, 409);
      return;
    }

    const actorId = req.user?.id ?? null;

    const baseData = {
      first_name, last_name: last_name || null, emp_email, mobile_number: mobile_number || null,
      department_id: department_id || null, designation: designation || null, manager_id: manager_id || null,
      start_date: new Date(start_date), expiry_date: expiry_date ? new Date(expiry_date) : null,
      timezone: timezone || 'Asia/Kolkata', language: language || 'en',
      updated_by: actorId, updated_at: new Date(),
    };

    if (password && password.length >= 6) {
      const password_hash = await hashPassword(password);
      await prisma.user_master.update({ where: { user_id: userId }, data: { ...baseData, password_hash } });
    } else {
      await prisma.user_master.update({ where: { user_id: userId }, data: baseData });
    }

    // Replace roles atomically
    await prisma.$transaction([
      prisma.user_role.deleteMany({ where: { user_id: userId } }),
      prisma.user_role.createMany({
        data: role_ids.map((rid, i) => ({ user_id: userId, role_id: Number(rid), is_default: i === 0 })),
      }),
    ]);

    const savedRolesCount = await prisma.user_role.count({ where: { user_id: userId } });
    await invalidateUserPermissionCache(userId);

    // Auto-deactivate if expiry_date is in the past
    let autoDeactivated = false;
    if (expiry_date) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (new Date(expiry_date) < today) {
        await prisma.user_master.updateMany({
          where: { user_id: userId, user_status: true },
          data: {
            user_status: false, inactive_date: new Date(),
            inactive_reason: 'Auto-deactivated: expiry date passed', updated_at: new Date(),
          },
        });
        autoDeactivated = true;
      }
    }

    logger.info(`User updated: ${userId}, roles saved: ${savedRolesCount}, auto_deactivated: ${autoDeactivated}`);

    logAudit({
      userId: actorId, employeeId: req.user?.employee_id, fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action: 'UPDATE', module: AUDIT_MODULE.USERS, recordId: userId,
      description: `Updated user ${userId} (${first_name} ${last_name ?? ''})${autoDeactivated ? ' — auto-deactivated (expiry passed)' : ''}`,
      newValues: { first_name, last_name, emp_email, department_id, designation, expiry_date },
      ipAddress: req.ip,
    });

    sendSuccess(res, {
      user_id:          userId,
      roles_saved:      savedRolesCount,
      auto_deactivated: autoDeactivated,
    }, autoDeactivated
      ? `User updated and automatically deactivated (expiry date has passed).`
      : `User updated. ${savedRolesCount} role(s) saved.`
    );

  } catch (error) {
    logger.error('Update user error:', error);
    if ((error as Prisma.PrismaClientKnownRequestError).code === 'P2002') {
      sendError(res, 'Employee ID already exists', 409);
    } else {
      sendError(res, (error as Error).message || 'Failed to update user', 500);
    }
  }
};

// ── PUT /users/:id/roles  (role-only assignment, no user-field update) ───────
export const updateUserRoles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { role_ids, default_role_id } = req.body as { role_ids: number[]; default_role_id?: number };

    if (!Array.isArray(role_ids) || role_ids.length === 0) {
      sendValidationError(res, 'At least one role must be assigned');
      return;
    }

    // Determine which role is default: explicit default_role_id wins, else first in array
    const defaultId = default_role_id ?? role_ids[0];

    await prisma.$transaction([
      prisma.user_role.deleteMany({ where: { user_id: userId } }),
      prisma.user_role.createMany({
        data: role_ids.map(roleId => ({
          user_id: userId, role_id: Number(roleId), is_default: Number(roleId) === Number(defaultId),
        })),
      }),
    ]);

    const rows = await prisma.user_role.findMany({
      where: { user_id: userId },
      select: {
        role_id: true, is_default: true,
        role_master: { select: { role_name: true, role_code: true } },
      },
      orderBy: { is_default: 'desc' },
    });
    const savedRoles = rows.map(r => ({
      role_id: r.role_id, role_name: r.role_master.role_name,
      role_code: r.role_master.role_code, is_default: r.is_default,
    }));
    await invalidateUserPermissionCache(userId);

    logger.info(`User roles updated: user_id=${userId}, roles=${role_ids.join(',')}`);

    logAudit({
      userId: req.user?.id, employeeId: req.user?.employee_id, fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action: 'ASSIGN', module: AUDIT_MODULE.USER_ROLE, recordId: userId,
      description: `Assigned ${savedRoles.length} role(s) to user ${userId}`,
      newValues: { role_ids, default_role_id: defaultId },
      ipAddress: req.ip,
    });

    sendSuccess(res, savedRoles, `${savedRoles.length} role(s) assigned successfully`);
  } catch (error) {
    logger.error('Update user roles error:', error);
    sendError(res, 'Failed to update role assignment', 500, (error as Error).message);
  }
};

// ── DELETE /users/:id  (toggle active/inactive) ──────────────
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { inactive_date, inactive_reason } = req.body ?? {};

    const user = await prisma.user_master.findUnique({
      where: { user_id: userId },
      select: { user_id: true, user_status: true, expiry_date: true },
    });
    if (!user) { sendError(res, 'User not found', 404); return; }

    const newStatus = !user.user_status;

    // Block activation if expiry_date is in the past
    if (newStatus && user.expiry_date) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (new Date(user.expiry_date) < today) {
        const expiryStr = new Date(user.expiry_date).toISOString().substring(0, 10);
        sendError(res, `Cannot activate: expiry date (${expiryStr}) has passed. Update the expiry date first.`, 400);
        return;
      }
    }

    if (!newStatus) {
      // Deactivating — store inactive_date and inactive_reason
      await prisma.user_master.update({
        where: { user_id: userId },
        data: {
          user_status: newStatus,
          inactive_date: inactive_date ? new Date(inactive_date) : null,
          inactive_reason: inactive_reason || null,
          updated_at: new Date(),
        },
      });
    } else {
      // Activating — clear inactive fields
      await prisma.user_master.update({
        where: { user_id: userId },
        data: { user_status: newStatus, inactive_date: null, inactive_reason: null, updated_at: new Date() },
      });
    }

    const action = newStatus ? 'activated' : 'deactivated';
    logger.info(`User ${action}: ${userId}`);

    logAudit({
      userId: req.user?.id, employeeId: req.user?.employee_id, fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action: newStatus ? 'ACTIVATE' : 'DEACTIVATE', module: AUDIT_MODULE.USERS, recordId: userId,
      description: `User ${userId} ${action}`,
      ipAddress: req.ip,
    });

    sendSuccess(res, { user_id: userId, user_status: newStatus }, `User ${action} successfully`);
  } catch (error) {
    logger.error('Toggle user status error:', error);
    sendError(res, 'Failed to update user status', 500, (error as Error).message);
  }
};

// ── GET /users/stats ──────────────────────────────────────────
export const getUserStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [active, inactive] = await Promise.all([
      prisma.user_master.count({ where: { user_status: true } }),
      prisma.user_master.count({ where: { user_status: false } }),
    ]);
    sendSuccess(res, { active, inactive });
  } catch (error) {
    logger.error('User stats error:', error);
    sendError(res, 'Failed to fetch user stats', 500, (error as Error).message);
  }
};

// ── PUT /users/permissions/bulk ───────────────────────────────
export const savePermissionsBulk = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role_id, permissions } = req.body as {
      role_id: number;
      permissions: {
        menu_id: number;
        can_view: boolean;
        can_create: boolean;
        can_update: boolean;
        can_delete: boolean;
        can_print: boolean;
        can_export: boolean;
      }[];
    };

    if (!role_id || !Array.isArray(permissions) || permissions.length === 0) {
      sendValidationError(res, 'role_id and permissions array are required');
      return;
    }

    await prisma.$transaction(
      permissions.map(p => prisma.role_menu_mapping.upsert({
        where: { role_id_menu_id: { role_id, menu_id: p.menu_id } },
        create: {
          role_id, menu_id: p.menu_id,
          can_view: p.can_view, can_create: p.can_create, can_update: p.can_update,
          can_delete: p.can_delete, can_print: p.can_print, can_export: p.can_export,
          is_active: true,
        },
        update: {
          can_view: p.can_view, can_create: p.can_create, can_update: p.can_update,
          can_delete: p.can_delete, can_print: p.can_print, can_export: p.can_export,
          is_active: true,
        },
      })),
    );

    await invalidateRolePermissionCache(role_id);

    logger.info(`Bulk permissions saved: role_id=${role_id}, menus=${permissions.length}`);
    sendSuccess(res, { role_id, updated: permissions.length }, 'Permissions saved successfully');
  } catch (error) {
    logger.error('Save permissions bulk error:', error);
    sendError(res, 'Failed to save permissions', 500, (error as Error).message);
  }
};

// ── GET /users/:id/menu-permissions ───────────────────────────
// Returns every active menu with its role baseline (from the user's
// default/first role) plus this user's tri-state override, if any.
// Kept as $queryRaw: correlated subquery inside a JOIN condition plus a
// self-join on menu_master (parent name) have no Prisma builder equivalent.
export const getUserMenuPermissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id, 10);

    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT
        m.id          AS menu_id,
        m.menu_code,
        m.menu_name,
        m.parent_id,
        m.menu_level,
        m.menu_order,
        pm.menu_name  AS parent_name,
        COALESCE(rm.can_view,   FALSE) AS role_can_view,
        COALESCE(rm.can_create, FALSE) AS role_can_create,
        COALESCE(rm.can_update, FALSE) AS role_can_update,
        COALESCE(rm.can_delete, FALSE) AS role_can_delete,
        COALESCE(rm.can_print,  FALSE) AS role_can_print,
        COALESCE(rm.can_export, FALSE) AS role_can_export,
        umm.can_view   AS user_can_view,
        umm.can_create AS user_can_create,
        umm.can_update AS user_can_update,
        umm.can_delete AS user_can_delete,
        umm.can_print  AS user_can_print,
        umm.can_export AS user_can_export
      FROM menu_master m
      LEFT JOIN menu_master pm
        ON pm.id = m.parent_id AND pm.is_active = TRUE
      LEFT JOIN role_menu_mapping rm
        ON rm.menu_id = m.id
        AND rm.role_id = (
          SELECT ur.role_id FROM user_role ur
          WHERE ur.user_id = ${userId}
          ORDER BY ur.is_default DESC LIMIT 1
        )
      LEFT JOIN user_menu_mapping umm
        ON umm.menu_id = m.id AND umm.user_id = ${userId}
      WHERE m.is_active = TRUE
        AND (m.parent_id IS NULL OR m.parent_id IN (
          SELECT id FROM menu_master WHERE is_active = TRUE
        ))
      ORDER BY m.menu_level, m.menu_order
    `);

    sendSuccess(res, rows, 'Menu permissions fetched successfully');
  } catch (error) {
    logger.error('Get user menu permissions error:', error);
    sendError(res, 'Failed to fetch user menu permissions', 500, (error as Error).message);
  }
};

// ── PUT /users/:id/menu-permissions/bulk ──────────────────────
// Upserts the tri-state override for every menu in the payload.
// Each can_x is true (force allow) / false (force deny) / null (inherit role).
export const saveUserMenuPermissionsBulk = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { permissions } = req.body as {
      permissions: {
        menu_id: number;
        can_view: boolean | null;
        can_create: boolean | null;
        can_update: boolean | null;
        can_delete: boolean | null;
        can_print: boolean | null;
        can_export: boolean | null;
      }[];
    };

    if (!userId || !Array.isArray(permissions) || permissions.length === 0) {
      sendValidationError(res, 'A valid user id and permissions array are required');
      return;
    }

    const actorId = req.user?.id ?? null;

    await prisma.$transaction(
      permissions.map(p => prisma.user_menu_mapping.upsert({
        where: { user_id_menu_id: { user_id: userId, menu_id: p.menu_id } },
        create: {
          user_id: userId, menu_id: p.menu_id,
          can_view: p.can_view, can_create: p.can_create, can_update: p.can_update,
          can_delete: p.can_delete, can_print: p.can_print, can_export: p.can_export,
          created_by: actorId, is_active: true,
        },
        update: {
          can_view: p.can_view, can_create: p.can_create, can_update: p.can_update,
          can_delete: p.can_delete, can_print: p.can_print, can_export: p.can_export,
          updated_by: actorId, updated_at: new Date(), is_active: true,
        },
      })),
    );

    await invalidateUserPermissionCache(userId);

    logger.info(`User menu permissions saved: user_id=${userId}, menus=${permissions.length}`);

    logAudit({
      userId: actorId, employeeId: req.user?.employee_id, fullName: `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action: 'UPDATE', module: AUDIT_MODULE.USER_MENU_PERMISSION, recordId: userId,
      description: `Updated ${permissions.length} menu permission override(s) for user ${userId}`,
      ipAddress: req.ip,
    });

    sendSuccess(res, { user_id: userId, updated: permissions.length }, 'User menu permissions saved successfully');
  } catch (error) {
    logger.error('Save user menu permissions bulk error:', error);
    sendError(res, 'Failed to save user menu permissions', 500, (error as Error).message);
  }
};
