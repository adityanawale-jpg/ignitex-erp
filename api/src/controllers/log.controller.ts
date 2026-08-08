import { Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

// ── helpers ───────────────────────────────────────────────────
const parsePage  = (v: unknown) => Math.max(1, parseInt(v as string) || 1);
const parseLimit = (v: unknown) => Math.min(200, Math.max(1, parseInt(v as string) || 50));

// ── GET /logs/login ───────────────────────────────────────────
// full_name comes from the user_master relation (real FK on user_id);
// stats use 4 separate count() calls instead of one query with FILTER
// (WHERE ...) — Prisma's builder has no equivalent to conditional
// aggregates in a single query.
export const getLoginLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page   = parsePage(req.query.page);
    const limit  = parseLimit(req.query.limit);
    const offset = (page - 1) * limit;

    const search   = ((req.query.search as string) || '').trim();
    const status   = (req.query.status as string) || '';
    const dateFrom = (req.query.date_from as string) || '';
    const dateTo   = (req.query.date_to   as string) || '';

    const AND: Prisma.login_historyWhereInput[] = [];
    if (status) AND.push({ status });
    if (dateFrom) AND.push({ login_time: { gte: new Date(dateFrom + ' 00:00:00') } });
    if (dateTo)   AND.push({ login_time: { lte: new Date(dateTo   + ' 23:59:59') } });
    if (search) {
      AND.push({
        OR: [
          { employee_id: { contains: search, mode: 'insensitive' } },
          { user_master: { first_name: { contains: search, mode: 'insensitive' } } },
          { ip_address: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    const where: Prisma.login_historyWhereInput = AND.length ? { AND } : {};

    const [total, rows, totalAll, success, failed, today] = await Promise.all([
      prisma.login_history.count({ where }),
      prisma.login_history.findMany({
        where,
        select: {
          id: true, employee_id: true, status: true, ip_address: true, user_agent: true,
          remarks: true, login_time: true,
          user_master: { select: { first_name: true, last_name: true } },
        },
        orderBy: { login_time: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.login_history.count(),
      prisma.login_history.count({ where: { status: 'success' } }),
      prisma.login_history.count({ where: { status: 'failed' } }),
      prisma.login_history.count({ where: { login_time: { gte: new Date(new Date().toDateString()) } } }),
    ]);

    const dataRows = rows.map(({ user_master, ...rest }) => ({
      ...rest,
      full_name: `${user_master?.first_name ?? ''} ${user_master?.last_name ?? ''}`.trim(),
    }));

    const total_pages = Math.ceil(total / limit);

    sendSuccess(res, dataRows, 'Login logs fetched', 200, {
      total, page, limit, total_pages,
      stats: { total: totalAll, success, failed, today },
    });
  } catch (error) {
    logger.error('Get login logs error:', error);
    sendError(res, 'Failed to fetch login logs', 500);
  }
};

// ── GET /logs/errors ──────────────────────────────────────────
export const getErrorLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page   = parsePage(req.query.page);
    const limit  = parseLimit(req.query.limit);
    const offset = (page - 1) * limit;

    const severity = (req.query.severity as string) || '';
    const dateFrom  = (req.query.date_from as string) || '';
    const dateTo    = (req.query.date_to   as string) || '';
    const search    = ((req.query.search as string) || '').trim();

    const AND: Prisma.system_error_logWhereInput[] = [];
    if (severity) AND.push({ severity });
    if (dateFrom) AND.push({ created_at: { gte: new Date(dateFrom + ' 00:00:00') } });
    if (dateTo)   AND.push({ created_at: { lte: new Date(dateTo   + ' 23:59:59') } });
    if (search) {
      AND.push({
        OR: [
          { message: { contains: search, mode: 'insensitive' } },
          { error_type: { contains: search, mode: 'insensitive' } },
          { request_path: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    const where: Prisma.system_error_logWhereInput = AND.length ? { AND } : {};

    const todayStart = new Date(new Date().toDateString());
    const weekStart  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [total, rows, totalAll, today, week, critical] = await Promise.all([
      prisma.system_error_log.count({ where }),
      prisma.system_error_log.findMany({
        where,
        select: {
          id: true, severity: true, error_type: true, message: true, stack_trace: true,
          request_path: true, request_method: true, employee_id: true, ip_address: true, created_at: true,
        },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.system_error_log.count(),
      prisma.system_error_log.count({ where: { created_at: { gte: todayStart } } }),
      prisma.system_error_log.count({ where: { created_at: { gte: weekStart } } }),
      prisma.system_error_log.count({ where: { severity: { in: ['CRITICAL', 'FATAL'] }, created_at: { gte: todayStart } } }),
    ]);

    const total_pages = Math.ceil(total / limit);

    sendSuccess(res, rows, 'Error logs fetched', 200, {
      total, page, limit, total_pages,
      stats: { total: totalAll, today, week, critical },
    });
  } catch (error) {
    logger.error('Get error logs error:', error);
    sendError(res, 'Failed to fetch error logs', 500);
  }
};

// ── GET /logs/audit ───────────────────────────────────────────
export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page   = parsePage(req.query.page);
    const limit  = parseLimit(req.query.limit);
    const offset = (page - 1) * limit;

    const action   = (req.query.action   as string) || '';
    const module_  = (req.query.module   as string) || '';
    const dateFrom = (req.query.date_from as string) || '';
    const dateTo   = (req.query.date_to   as string) || '';
    const search   = ((req.query.search  as string) || '').trim();

    const AND: Prisma.audit_logWhereInput[] = [];
    if (action)  AND.push({ action });
    if (module_) AND.push({ module: module_ });
    if (dateFrom) AND.push({ created_at: { gte: new Date(dateFrom + ' 00:00:00') } });
    if (dateTo)   AND.push({ created_at: { lte: new Date(dateTo   + ' 23:59:59') } });
    if (search) {
      AND.push({
        OR: [
          { description: { contains: search, mode: 'insensitive' } },
          { employee_id: { contains: search, mode: 'insensitive' } },
          { full_name: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    const where: Prisma.audit_logWhereInput = AND.length ? { AND } : {};
    const todayStart = new Date(new Date().toDateString());

    const [total, rows, totalAll, today, creates, updates, deletes, modules] = await Promise.all([
      prisma.audit_log.count({ where }),
      prisma.audit_log.findMany({
        where,
        select: {
          id: true, employee_id: true, full_name: true, action: true, module: true,
          record_id: true, description: true, ip_address: true, created_at: true,
        },
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.audit_log.count(),
      prisma.audit_log.count({ where: { created_at: { gte: todayStart } } }),
      prisma.audit_log.count({ where: { action: 'CREATE' } }),
      prisma.audit_log.count({ where: { action: 'UPDATE' } }),
      prisma.audit_log.count({ where: { action: 'DELETE' } }),
      prisma.audit_log.findMany({ distinct: ['module'], select: { module: true }, orderBy: { module: 'asc' } }),
    ]);

    const total_pages = Math.ceil(total / limit);

    sendSuccess(res, rows, 'Audit logs fetched', 200, {
      total, page, limit, total_pages,
      stats: { total: totalAll, today, creates, updates, deletes },
      modules: modules.map(m => m.module),
    });
  } catch (error) {
    logger.error('Get audit logs error:', error);
    sendError(res, 'Failed to fetch audit logs', 500);
  }
};
