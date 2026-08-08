import { Response } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import { AuthRequest } from '../middleware/auth.middleware';
import { logAudit } from '../utils/audit';
import { AUDIT_MODULE } from '../constants/auditModules';
import {
  RateLineInput, FieldMapEntry,
  toDateOnly, dateStr, round4,
  getDailyRateConfig, normalizeFieldMap,
  saveRateSheet, runDailyRateUpdate, recordRunOutcome,
} from '../services/dailyRate.service';

// Daily Rate master — one rate sheet per date, each sheet a set of metal lines
// priced in ₹ per gram. The grid lists sheets; the form edits one sheet and its
// whole line set, the same shape Customer Price Master uses.

const str = (v: unknown, max: number): string | null => {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, max) : null;
};

const SORT_COLS: Record<string, string> = {
  rate_date:   'rate_date',
  update_mode: 'update_mode',
  source:      'source',
  created_at:  'created_at',
};

function parseListQuery(req: AuthRequest) {
  const page    = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit   = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 10));
  const search  = ((req.query.search as string) || '').trim();
  const status  = (req.query.status as string) || 'active';
  const sortKey = SORT_COLS[req.query.sort_by as string] || 'rate_date';
  const sortDir: 'asc' | 'desc' = req.query.sort_dir === 'asc' ? 'asc' : 'desc';

  let cf: Record<string, string> = {};
  try {
    if (req.query.col_filters) cf = JSON.parse(req.query.col_filters as string) as Record<string, string>;
  } catch { /* ignore */ }

  return { page, limit, offset: (page - 1) * limit, search, status, sortKey, sortDir, cf };
}

function buildWhere(search: string, status: string, cf: Record<string, string>): Prisma.daily_rate_hdrWhereInput {
  const AND: Prisma.daily_rate_hdrWhereInput[] = [];
  if (status === 'active')   AND.push({ is_active: true });
  if (status === 'inactive') AND.push({ is_active: false });

  // Search covers the free-text columns only. A date is filtered through the
  // Rate Date column filter below, which parses it properly.
  if (search) {
    AND.push({
      OR: [
        { source:      { contains: search, mode: 'insensitive' } },
        { update_mode: { contains: search, mode: 'insensitive' } },
        { remarks:     { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  const dateFilter = (cf.rate_date || '').trim();
  if (dateFilter) {
    // Accepts a full date (2026-07-29 → that day) or a prefix (2026-07 → that
    // month), which is what people actually type into a column filter.
    const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(dateFilter);
    if (m) {
      const [, y, mo, d] = m;
      const from = toDateOnly(`${y}-${mo ?? '01'}-${d ?? '01'}`);
      const to   = new Date(from);
      if (d)       to.setUTCDate(to.getUTCDate() + 1);
      else if (mo) to.setUTCMonth(to.getUTCMonth() + 1);
      else         to.setUTCFullYear(to.getUTCFullYear() + 1);
      AND.push({ rate_date: { gte: from, lt: to } });
    } else {
      // An unparseable date filter should return nothing, not everything.
      AND.push({ id: -1 });
    }
  }

  const modeFilter = (cf.update_mode || '').trim();
  if (modeFilter) AND.push({ update_mode: { contains: modeFilter, mode: 'insensitive' } });

  const sourceFilter = (cf.source || '').trim();
  if (sourceFilter) AND.push({ source: { contains: sourceFilter, mode: 'insensitive' } });

  return AND.length ? { AND } : {};
}

// ── GET /daily-rate ──────────────────────────────────────────────
export const getDailyRates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, offset, search, status, sortKey, sortDir, cf } = parseListQuery(req);
    const where = buildWhere(search, status, cf);

    const [total, rows] = await Promise.all([
      prisma.daily_rate_hdr.count({ where }),
      prisma.daily_rate_hdr.findMany({
        where,
        orderBy: { [sortKey]: sortDir },
        skip: offset, take: limit,
        include: {
          daily_rate_line: {
            orderBy: { line_no: 'asc' },
            select: { metal_type: true, purity: true, rate_per_gram: true, change_pct: true },
          },
        },
      }),
    ]);

    const dataRows = rows.map(({ daily_rate_line, rate_date, ...rest }) => ({
      ...rest,
      rate_date:  dateStr(rate_date),
      line_count: daily_rate_line.length,
      // The grid shows the sheet's metals inline rather than making the user
      // open every row to see what it covers.
      lines: daily_rate_line.map(l => ({
        metal_type:    l.metal_type,
        purity:        l.purity,
        rate_per_gram: Number(l.rate_per_gram),
        change_pct:    l.change_pct === null ? null : Number(l.change_pct),
      })),
    }));

    sendSuccess(res, dataRows, 'Daily rates fetched', 200, {
      total, total_pages: Math.ceil(total / limit) || 1, page, limit,
    });
  } catch (error) {
    sendError(res, 'Failed to fetch daily rates', 500, (error as Error).message);
  }
};

// ── GET /daily-rate/stats ────────────────────────────────────────
export const getDailyRateStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [active, inactive] = await Promise.all([
      prisma.daily_rate_hdr.count({ where: { is_active: true } }),
      prisma.daily_rate_hdr.count({ where: { is_active: false } }),
    ]);
    sendSuccess(res, { active, inactive }, 'Stats fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch stats', 500, (error as Error).message);
  }
};

// ── GET /daily-rate/latest ───────────────────────────────────────
// The newest active sheet, plus which of its lines Sales Order prices against.
// Feeds the page's rate banner and the dashboard's metal strip.
export const getLatestDailyRate = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cfg = await getDailyRateConfig();

    const hdr = await prisma.daily_rate_hdr.findFirst({
      where:   { is_active: true },
      orderBy: { rate_date: 'desc' },
      include: { daily_rate_line: { orderBy: { line_no: 'asc' } } },
    });

    if (!hdr) {
      sendSuccess(res, null, 'No rate sheet on file yet');
      return;
    }

    const { daily_rate_line, rate_date, ...rest } = hdr;
    sendSuccess(res, {
      ...rest,
      rate_date: dateStr(rate_date),
      pricing:   { metal_type: cfg.pricing_metal_type, purity: cfg.pricing_purity },
      lines: daily_rate_line.map(l => ({
        ...l,
        rate_per_gram: Number(l.rate_per_gram),
        prev_rate:     l.prev_rate  === null ? null : Number(l.prev_rate),
        change_pct:    l.change_pct === null ? null : Number(l.change_pct),
      })),
    }, 'Latest daily rate fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch the latest daily rate', 500, (error as Error).message);
  }
};

// ── GET /daily-rate/:id ──────────────────────────────────────────
export const getDailyRateById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const hdr = await prisma.daily_rate_hdr.findUnique({
      where:   { id },
      include: { daily_rate_line: { orderBy: { line_no: 'asc' } } },
    });
    if (!hdr) { sendError(res, 'Rate sheet not found', 404); return; }

    const { daily_rate_line, rate_date, ...rest } = hdr;
    sendSuccess(res, {
      ...rest,
      rate_date: dateStr(rate_date),
      lines: daily_rate_line.map(l => ({
        ...l,
        rate_per_gram: Number(l.rate_per_gram),
        prev_rate:     l.prev_rate  === null ? null : Number(l.prev_rate),
        change_pct:    l.change_pct === null ? null : Number(l.change_pct),
      })),
    }, 'Rate sheet fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch the rate sheet', 500, (error as Error).message);
  }
};

// ── Body parsing ─────────────────────────────────────────────────
type ParsedSheet = {
  rate_date:     Date;
  currency_code: string;
  remarks:       string | null;
  lines:         RateLineInput[];
};

function parseSheetBody(body: Record<string, unknown>): { error: string } | ParsedSheet {
  const rawDate = String(body.rate_date ?? '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return { error: 'Rate Date is required' };
  const rate_date = toDateOnly(rawDate);
  if (isNaN(rate_date.getTime())) return { error: 'Rate Date is not a valid date' };

  const rawLines = Array.isArray(body.lines) ? body.lines as Record<string, unknown>[] : [];
  const lines: RateLineInput[] = [];
  // Caught here rather than by the unique index so the message can name the
  // metal instead of surfacing a constraint violation.
  const seen = new Set<string>();

  for (let i = 0; i < rawLines.length; i++) {
    const l          = rawLines[i];
    const metal_type = String(l.metal_type ?? '').trim();
    const purity     = String(l.purity     ?? '').trim();
    const rawRate    = String(l.rate_per_gram ?? '').trim();

    // Drop rows the user added but never filled in
    if (!metal_type && !purity && !rawRate) continue;

    if (!metal_type) return { error: `Line ${i + 1}: Metal Type is required` };
    if (!purity)     return { error: `Line ${i + 1}: Purity is required` };

    const key = `${metal_type}|${purity}`;
    if (seen.has(key)) return { error: `Line ${i + 1}: this metal and purity is already rated on another line` };
    seen.add(key);

    const rate_per_gram = Number(rawRate);
    if (!Number.isFinite(rate_per_gram)) return { error: `Line ${i + 1}: Rate must be a number` };
    if (rate_per_gram < 0)               return { error: `Line ${i + 1}: Rate cannot be negative` };

    lines.push({
      metal_type,
      purity,
      rate_per_gram: round4(rate_per_gram),
      remarks:       str(l.remarks, 500),
    });
  }

  if (lines.length === 0) return { error: 'At least one rate line is required' };

  return {
    rate_date,
    currency_code: str(body.currency_code, 10) || 'INR',
    remarks:       str(body.remarks, 500),
    lines,
  };
}

// ── POST /daily-rate ─────────────────────────────────────────────
export const createDailyRate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = parseSheetBody(req.body as Record<string, unknown>);
    if ('error' in parsed) { sendValidationError(res, parsed.error); return; }

    const clash = await prisma.daily_rate_hdr.findUnique({
      where:  { rate_date: parsed.rate_date },
      select: { id: true },
    });
    if (clash) {
      sendValidationError(res, `A rate sheet already exists for ${dateStr(parsed.rate_date)} — edit that one instead`);
      return;
    }

    const saved = await saveRateSheet(parsed.rate_date, parsed.lines, {
      update_mode:   'MANUAL',
      source:        'Manual entry',
      currency_code: parsed.currency_code,
      remarks:       parsed.remarks,
      userId:        req.user?.id ?? null,
    });

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'CREATE',
      module:      AUDIT_MODULE.DAILY_RATE,
      recordId:    saved.id,
      description: `Created daily rate sheet for ${dateStr(parsed.rate_date)} with ${parsed.lines.length} line(s)`,
      newValues:   req.body,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id: saved.id }, 'Daily rate created successfully', 201);
  } catch (error) {
    const err = error as Prisma.PrismaClientKnownRequestError & Error;
    if (err.code === 'P2002') {
      sendValidationError(res, 'A rate sheet already exists for that date — edit that one instead');
      return;
    }
    sendError(res, 'Failed to create the daily rate', 500, err.message);
  }
};

// ── PUT /daily-rate/:id ──────────────────────────────────────────
export const updateDailyRate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const parsed = parseSheetBody(req.body as Record<string, unknown>);
    if ('error' in parsed) { sendValidationError(res, parsed.error); return; }

    const existing = await prisma.daily_rate_hdr.findUnique({
      where:  { id },
      select: { id: true, rate_date: true },
    });
    if (!existing) { sendError(res, 'Rate sheet not found', 404); return; }

    // Moving a sheet onto a date another sheet already owns.
    const clash = await prisma.daily_rate_hdr.findUnique({
      where:  { rate_date: parsed.rate_date },
      select: { id: true },
    });
    if (clash && clash.id !== id) {
      sendValidationError(res, `A rate sheet already exists for ${dateStr(parsed.rate_date)} — edit that one instead`);
      return;
    }

    // saveRateSheet keys on rate_date, so a date change has to move the header
    // first or it would create a second sheet and leave this one behind.
    if (dateStr(existing.rate_date) !== dateStr(parsed.rate_date)) {
      await prisma.daily_rate_hdr.update({ where: { id }, data: { rate_date: parsed.rate_date } });
    }

    // Hand edits mark the sheet MANUAL, which is what keeps the scheduler off
    // it unless "Overwrite manual sheets" is on.
    const saved = await saveRateSheet(parsed.rate_date, parsed.lines, {
      update_mode:   'MANUAL',
      source:        'Manual entry',
      currency_code: parsed.currency_code,
      remarks:       parsed.remarks,
      userId:        req.user?.id ?? null,
    });

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'UPDATE',
      module:      AUDIT_MODULE.DAILY_RATE,
      recordId:    saved.id,
      description: `Updated daily rate sheet for ${dateStr(parsed.rate_date)} — ${parsed.lines.length} line(s)`,
      newValues:   req.body,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id: saved.id }, 'Daily rate updated successfully');
  } catch (error) {
    const err = error as Prisma.PrismaClientKnownRequestError & Error;
    if (err.code === 'P2002') {
      sendValidationError(res, 'A rate sheet already exists for that date — edit that one instead');
      return;
    }
    sendError(res, 'Failed to update the daily rate', 500, err.message);
  }
};

// ── DELETE /daily-rate/:id (toggle status) ───────────────────────
export const toggleDailyRateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) { sendValidationError(res, 'Invalid ID'); return; }

    const { reason } = req.body as { reason?: string };

    const rows = await prisma.$queryRaw<{ id: number; is_active: boolean }[]>(
      Prisma.sql`
        UPDATE daily_rate_hdr
        SET is_active           = NOT is_active,
            deactivation_reason = CASE WHEN is_active THEN ${reason?.trim() || null} ELSE NULL END,
            deactivated_at      = CASE WHEN is_active THEN NOW() ELSE NULL END,
            updated_at          = NOW()
        WHERE id = ${id}
        RETURNING id, is_active
      `
    );

    if (rows.length === 0) { sendError(res, 'Rate sheet not found', 404); return; }
    const updated = rows[0];

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'DELETE',
      module:      AUDIT_MODULE.DAILY_RATE,
      recordId:    id,
      description: `${updated.is_active ? 'Activated' : 'Deactivated'} daily rate sheet${!updated.is_active && reason ? ` — ${reason}` : ''}`,
      ipAddress:   req.ip,
    });

    sendSuccess(res, { id, is_active: updated.is_active },
      updated.is_active ? 'Daily rate activated' : 'Daily rate deactivated');
  } catch (error) {
    sendError(res, 'Failed to toggle the daily rate status', 500, (error as Error).message);
  }
};

// ── GET /daily-rate/config ───────────────────────────────────────
// auth_header_value never travels back to the browser — the screen shows
// whether one is stored and can replace it, but cannot read it.
export const getRateConfig = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cfg = await getDailyRateConfig();
    const { auth_header_value, ...safe } = cfg;
    sendSuccess(res, { ...safe, auth_header_set: !!auth_header_value }, 'Auto update settings fetched');
  } catch (error) {
    sendError(res, 'Failed to fetch the auto update settings', 500, (error as Error).message);
  }
};

// ── PUT /daily-rate/config ───────────────────────────────────────
export const updateRateConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const b = req.body as Record<string, unknown>;

    const run_at = String(b.run_at ?? '09:00').trim();
    if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(run_at)) {
      sendValidationError(res, 'Update time must be in HH:MM (24-hour) format');
      return;
    }

    const markup_pct = Number(b.markup_pct ?? 0);
    if (!Number.isFinite(markup_pct)) { sendValidationError(res, 'Markup % must be a number'); return; }
    if (markup_pct < -100 || markup_pct > 100) {
      sendValidationError(res, 'Markup % must be between -100 and 100');
      return;
    }

    const provider_url = str(b.provider_url, 500);
    if (provider_url && !/^https?:\/\//i.test(provider_url)) {
      sendValidationError(res, 'Provider URL must start with http:// or https://');
      return;
    }

    const auto_enabled = b.auto_enabled === true || b.auto_enabled === 'true';
    if (auto_enabled && !provider_url) {
      sendValidationError(res, 'A provider URL is required before auto update can be switched on');
      return;
    }

    const pricing_metal_type = str(b.pricing_metal_type, 50);
    const pricing_purity     = str(b.pricing_purity, 50);
    if (!pricing_metal_type || !pricing_purity) {
      sendValidationError(res, 'The Sales Order pricing metal and purity are both required');
      return;
    }

    const field_map: FieldMapEntry[] = normalizeFieldMap(b.field_map);

    // An empty string clears the stored credential; omitting the field leaves
    // it alone, so saving the form without retyping the key does not wipe it.
    const rawAuth  = b.auth_header_value;
    const authGiven = rawAuth !== undefined && rawAuth !== null;
    const authValue = authGiven ? String(rawAuth).trim() : null;

    await prisma.daily_rate_config.update({
      where: { id: 1 },
      data: {
        auto_enabled,
        provider_name:    str(b.provider_name, 100),
        provider_url,
        auth_header_name: str(b.auth_header_name, 100),
        ...(authGiven && { auth_header_value: authValue || null }),
        run_at,
        markup_pct:       new Prisma.Decimal(markup_pct),
        carry_forward:    b.carry_forward    === true || b.carry_forward    === 'true',
        overwrite_manual: b.overwrite_manual === true || b.overwrite_manual === 'true',
        pricing_metal_type,
        pricing_purity,
        field_map:        field_map as unknown as Prisma.InputJsonValue,
        updated_by:       req.user?.id ?? null,
        updated_at:       new Date(),
      },
    });

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'UPDATE',
      module:      AUDIT_MODULE.DAILY_RATE,
      recordId:    1,
      description: `Updated Daily Rate auto update settings — auto ${auto_enabled ? 'ON' : 'OFF'}, pricing rate ${pricing_metal_type}/${pricing_purity}`,
      // The credential is deliberately kept out of the audit trail.
      newValues:   { ...b, auth_header_value: undefined },
      ipAddress:   req.ip,
    });

    const cfg = await getDailyRateConfig();
    const { auth_header_value, ...safe } = cfg;
    sendSuccess(res, { ...safe, auth_header_set: !!auth_header_value }, 'Auto update settings saved');
  } catch (error) {
    sendError(res, 'Failed to save the auto update settings', 500, (error as Error).message);
  }
};

// ── POST /daily-rate/fetch-now ───────────────────────────────────
// The scheduled run, on demand. Same code path, so what the button does today
// is exactly what the scheduler will do tomorrow morning.
export const fetchRatesNow = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await runDailyRateUpdate({ userId: req.user?.id ?? null, trigger: 'manual' });
    await recordRunOutcome(result);

    logAudit({
      userId:      req.user?.id,
      employeeId:  req.user?.employee_id,
      fullName:    `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim(),
      action:      'UPDATE',
      module:      AUDIT_MODULE.DAILY_RATE,
      recordId:    result.hdr_id,
      description: `Manual rate fetch — ${result.status}: ${result.message}`,
      ipAddress:   req.ip,
    });

    if (result.status === 'OK') {
      sendSuccess(res, result, result.message);
      return;
    }
    // SKIPPED and FAILED are both "nothing changed", and the message explains
    // why; 422 keeps them off the error log while still failing the call.
    sendValidationError(res, result.message);
  } catch (error) {
    sendError(res, 'Rate fetch failed', 500, (error as Error).message);
  }
};
