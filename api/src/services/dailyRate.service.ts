import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';

// Daily Rate engine — everything that writes a rate sheet without a user
// sitting in front of the screen, plus the one read Sales Order pricing needs.
//
// Two ways a sheet appears on its own:
//   AUTO       the configured provider is called and its JSON mapped to lines
//   CARRY_FWD  the previous sheet is copied forward, because the feed is off,
//              unconfigured, or its call just failed
//
// Both are driven from daily_rate_config (single row, id = 1) and both are
// safe to run twice on the same day — the day's sheet is upserted, never
// duplicated, and a MANUAL sheet is left alone unless overwrite_manual is set.

// ── Date handling ────────────────────────────────────────────────
// Prisma normalises a DATE column to UTC midnight in both directions, so a
// plain YYYY-MM-DD round-trips exactly. Going through the local timezone here
// (new Date('2026-07-29') vs new Date(2026, 6, 29)) is what shifts a rate onto
// the wrong day, so both helpers stay on the UTC side of the line.
export const toDateOnly = (s: string): Date => new Date(`${s}T00:00:00.000Z`);
export const dateStr    = (d: Date): string => d.toISOString().slice(0, 10);

export const round4 = (n: number) => Math.round(n * 10000) / 10000;

export interface RateLineInput {
  metal_type:    string;
  purity:        string;
  rate_per_gram: number;
  remarks:       string | null;
}

export interface DailyRateConfig {
  id:                 number;
  auto_enabled:       boolean;
  provider_name:      string | null;
  provider_url:       string | null;
  auth_header_name:   string | null;
  auth_header_value:  string | null;
  run_at:             string;
  markup_pct:         number;
  carry_forward:      boolean;
  overwrite_manual:   boolean;
  pricing_metal_type: string;
  pricing_purity:     string;
  field_map:          FieldMapEntry[];
  // Preformatted on the database side. last_run_at is TIMESTAMP WITHOUT TIME
  // ZONE written with NOW(), i.e. the database's wall clock; handing the raw
  // value to JS would have it re-read as UTC and displayed hours off.
  last_run_at:        string | null;
  last_run_status:    string | null;
  last_run_message:   string | null;
}

export interface FieldMapEntry {
  metal_type: string;
  purity:     string;
  json_path:  string;
  multiplier: number;
}

// ── Config ───────────────────────────────────────────────────────
// The row is created by the migration; the upsert is belt-and-braces for a
// database restored from a dump taken before it.
export const getDailyRateConfig = async (): Promise<DailyRateConfig> => {
  const row = await prisma.daily_rate_config.upsert({
    where:  { id: 1 },
    update: {},
    create: { id: 1 },
  });

  const stamp = await prisma.$queryRaw<{ last_run_at: string | null }[]>(Prisma.sql`
    SELECT to_char(last_run_at, 'DD-Mon-YYYY HH24:MI') AS last_run_at
    FROM   daily_rate_config
    WHERE  id = 1
  `);

  return {
    id:                 row.id,
    auto_enabled:       row.auto_enabled ?? false,
    provider_name:      row.provider_name,
    provider_url:       row.provider_url,
    auth_header_name:   row.auth_header_name,
    auth_header_value:  row.auth_header_value,
    run_at:             row.run_at ?? '09:00',
    markup_pct:         Number(row.markup_pct ?? 0),
    carry_forward:      row.carry_forward ?? true,
    overwrite_manual:   row.overwrite_manual ?? false,
    pricing_metal_type: row.pricing_metal_type ?? 'GO',
    pricing_purity:     row.pricing_purity ?? '916',
    field_map:          normalizeFieldMap(row.field_map),
    last_run_at:        stamp[0]?.last_run_at ?? null,
    last_run_status:    row.last_run_status,
    last_run_message:   row.last_run_message,
  };
};

// field_map is JSONB, so anything could be in there — a hand-edited row, an
// older shape. Rows that don't carry the four fields we need are dropped
// rather than allowed to throw halfway through a fetch.
export const normalizeFieldMap = (raw: unknown): FieldMapEntry[] => {
  if (!Array.isArray(raw)) return [];
  const out: FieldMapEntry[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue;
    const e          = r as Record<string, unknown>;
    const metal_type = String(e.metal_type ?? '').trim();
    const purity     = String(e.purity     ?? '').trim();
    const json_path  = String(e.json_path  ?? '').trim();
    if (!metal_type || !purity || !json_path) continue;
    const mult = Number(e.multiplier);
    out.push({
      metal_type,
      purity,
      json_path,
      multiplier: Number.isFinite(mult) && mult !== 0 ? mult : 1,
    });
  }
  return out;
};

// ── Sales Order pricing rate ─────────────────────────────────────
export interface PricingRate {
  rate_per_gram: number;
  rate_date:     string;
  metal_type:    string;
  purity:        string;
  update_mode:   string;
  source:        string | null;
}

// The rate a percentage-based customer price is struck against: the configured
// metal + purity, taken from the most recent ACTIVE sheet that carries it.
//
// Deliberately not restricted to today's sheet — a Sunday order should price
// off Friday's rate rather than fail. It never reads forward, though: a sheet
// dated after `on` (someone entering tomorrow's rate early) is ignored so the
// price matches the day the order was raised.
export const resolvePricingRate = async (on?: Date): Promise<PricingRate | null> => {
  const cfg = await getDailyRateConfig();
  const asOf = on ?? new Date();

  const line = await prisma.daily_rate_line.findFirst({
    where: {
      metal_type:     cfg.pricing_metal_type,
      purity:         cfg.pricing_purity,
      daily_rate_hdr: {
        is_active: true,
        rate_date: { lte: toDateOnly(dateStr(asOf)) },
      },
    },
    orderBy: { daily_rate_hdr: { rate_date: 'desc' } },
    include: { daily_rate_hdr: { select: { rate_date: true, update_mode: true, source: true } } },
  });

  if (!line) return null;

  return {
    rate_per_gram: Number(line.rate_per_gram),
    rate_date:     dateStr(line.daily_rate_hdr.rate_date),
    metal_type:    line.metal_type,
    purity:        line.purity,
    update_mode:   line.daily_rate_hdr.update_mode,
    source:        line.daily_rate_hdr.source,
  };
};

// ── Sheet write ──────────────────────────────────────────────────
// Saves one date's lines, filling prev_rate / change_pct from the newest
// earlier sheet so the movement chips need no self-join at read time.
export const saveRateSheet = async (
  rate_date:   Date,
  lines:       RateLineInput[],
  meta: {
    update_mode:   'MANUAL' | 'AUTO' | 'CARRY_FWD';
    source:        string | null;
    currency_code: string;
    remarks:       string | null;
    userId:        number | null;
  },
): Promise<{ id: number; created: boolean }> => {
  // The comparison baseline is the sheet before this one by date, not the row
  // this write replaces — re-saving today shouldn't make every change read 0%.
  const prevHdr = await prisma.daily_rate_hdr.findFirst({
    where:   { rate_date: { lt: rate_date }, is_active: true },
    orderBy: { rate_date: 'desc' },
    select:  { daily_rate_line: { select: { metal_type: true, purity: true, rate_per_gram: true } } },
  });

  const prevMap = new Map<string, number>();
  for (const l of prevHdr?.daily_rate_line ?? []) {
    prevMap.set(`${l.metal_type}|${l.purity}`, Number(l.rate_per_gram));
  }

  const existing = await prisma.daily_rate_hdr.findUnique({
    where:  { rate_date },
    select: { id: true },
  });

  const hdrId = await prisma.$transaction(async (tx) => {
    let id: number;

    if (existing) {
      id = existing.id;
      await tx.daily_rate_hdr.update({
        where: { id },
        data: {
          update_mode:   meta.update_mode,
          source:        meta.source,
          currency_code: meta.currency_code,
          remarks:       meta.remarks,
          updated_by:    meta.userId,
          updated_at:    new Date(),
        },
      });
      await tx.daily_rate_line.deleteMany({ where: { hdr_id: id } });
    } else {
      const hdr = await tx.daily_rate_hdr.create({
        data: {
          rate_date,
          update_mode:   meta.update_mode,
          source:        meta.source,
          currency_code: meta.currency_code,
          remarks:       meta.remarks,
          is_active:     true,
          created_by:    meta.userId,
        },
        select: { id: true },
      });
      id = hdr.id;
    }

    await tx.daily_rate_line.createMany({
      data: lines.map((l, i) => {
        const prev = prevMap.get(`${l.metal_type}|${l.purity}`);
        return {
          hdr_id:        id,
          line_no:       i + 1,
          metal_type:    l.metal_type,
          purity:        l.purity,
          rate_per_gram: new Prisma.Decimal(l.rate_per_gram),
          prev_rate:     prev !== undefined ? new Prisma.Decimal(prev) : null,
          // A previous rate of 0 has no meaningful percentage move.
          change_pct:    prev !== undefined && prev > 0
            ? new Prisma.Decimal(round4(((l.rate_per_gram - prev) / prev) * 100))
            : null,
          remarks:       l.remarks,
        };
      }),
    });

    return id;
  });

  return { id: hdrId, created: !existing };
};

// ── Provider JSON path ───────────────────────────────────────────
// Reads `rates.gold.916`, `data[0].price` or `$.rates.XAU` out of a parsed
// response. Small on purpose: a real JSONPath engine is a dependency and an
// attack surface for something that only ever walks a fetched object.
export const readJsonPath = (source: unknown, path: string): unknown => {
  const cleaned = path.trim().replace(/^\$\.?/, '');
  if (!cleaned) return undefined;

  const segments = cleaned
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);

  let cur: unknown = source;
  for (const seg of segments) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) {
      const idx = Number(seg);
      if (!Number.isInteger(idx)) return undefined;
      cur = cur[idx];
    } else if (typeof cur === 'object') {
      cur = (cur as Record<string, unknown>)[seg];
    } else {
      return undefined;
    }
  }
  return cur;
};

// Providers quote numbers as strings often enough ("6,820.50") that a plain
// Number() would turn a perfectly good rate into NaN.
const toRate = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = Number(v.replace(/[, ]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

// ── Provider fetch ───────────────────────────────────────────────
export interface FetchOutcome {
  ok:      boolean;
  lines:   RateLineInput[];
  message: string;
}

const FETCH_TIMEOUT_MS = 15_000;

export const fetchRatesFromProvider = async (cfg: DailyRateConfig): Promise<FetchOutcome> => {
  if (!cfg.provider_url) {
    return { ok: false, lines: [], message: 'No provider URL configured' };
  }
  if (cfg.field_map.length === 0) {
    return { ok: false, lines: [], message: 'No field mapping configured — nothing to read from the response' };
  }

  let payload: unknown;
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (cfg.auth_header_name && cfg.auth_header_value) {
      headers[cfg.auth_header_name] = cfg.auth_header_value;
    }

    const res = await fetch(cfg.provider_url, {
      method:  'GET',
      headers,
      signal:  AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!res.ok) {
      return { ok: false, lines: [], message: `Provider returned HTTP ${res.status} ${res.statusText}` };
    }
    payload = await res.json();
  } catch (error) {
    const err = error as Error;
    const reason = err.name === 'TimeoutError' || err.name === 'AbortError'
      ? `Provider did not respond within ${FETCH_TIMEOUT_MS / 1000}s`
      : err.message;
    return { ok: false, lines: [], message: `Provider request failed — ${reason}` };
  }

  const lines:   RateLineInput[] = [];
  const missing: string[]        = [];
  const factor  = 1 + (cfg.markup_pct / 100);

  for (const m of cfg.field_map) {
    const raw = toRate(readJsonPath(payload, m.json_path));
    if (raw === null || raw < 0) {
      missing.push(`${m.metal_type}/${m.purity} (${m.json_path})`);
      continue;
    }
    lines.push({
      metal_type:    m.metal_type,
      purity:        m.purity,
      rate_per_gram: round4(raw * m.multiplier * factor),
      remarks:       null,
    });
  }

  if (lines.length === 0) {
    return {
      ok: false, lines: [],
      message: `No rate could be read from the response — check the field mapping (${missing.join(', ')})`,
    };
  }

  // A partial read is still worth saving; the skipped metals are named so the
  // config screen can show which mapping is wrong.
  const note = missing.length
    ? `${lines.length} rate(s) read; skipped ${missing.join(', ')}`
    : `${lines.length} rate(s) read`;

  return { ok: true, lines, message: note };
};

// ── Carry forward ────────────────────────────────────────────────
export const carryForwardLines = async (
  before: Date,
): Promise<{ lines: RateLineInput[]; from: string } | null> => {
  const prev = await prisma.daily_rate_hdr.findFirst({
    where:   { rate_date: { lt: before }, is_active: true },
    orderBy: { rate_date: 'desc' },
    select: {
      rate_date:       true,
      daily_rate_line: {
        orderBy: { line_no: 'asc' },
        select:  { metal_type: true, purity: true, rate_per_gram: true },
      },
    },
  });

  if (!prev || prev.daily_rate_line.length === 0) return null;

  return {
    from:  dateStr(prev.rate_date),
    lines: prev.daily_rate_line.map(l => ({
      metal_type:    l.metal_type,
      purity:        l.purity,
      rate_per_gram: Number(l.rate_per_gram),
      remarks:       null,
    })),
  };
};

// ── The run ──────────────────────────────────────────────────────
export interface RunResult {
  status:  'OK' | 'FAILED' | 'SKIPPED';
  message: string;
  hdr_id?: number;
  mode?:   'AUTO' | 'CARRY_FWD';
}

// One auto-update pass for `on` (default today). Tries the provider first and
// falls back to carrying the previous sheet forward, so a dead feed degrades
// to a stale-but-usable rate instead of no rate at all.
//
// `trigger` only changes the wording of what gets recorded; the work is the
// same whether the scheduler or the Fetch Now button asked for it.
export const runDailyRateUpdate = async (
  opts: { on?: Date; userId?: number | null; trigger: 'scheduler' | 'manual' } = { trigger: 'manual' },
): Promise<RunResult> => {
  const cfg    = await getDailyRateConfig();
  const on     = opts.on ?? new Date();
  const target = toDateOnly(dateStr(on));
  const userId = opts.userId ?? null;

  // A sheet someone typed by hand outranks anything automatic, unless the
  // config explicitly says otherwise.
  const existing = await prisma.daily_rate_hdr.findUnique({
    where:  { rate_date: target },
    select: { id: true, update_mode: true },
  });
  if (existing && existing.update_mode === 'MANUAL' && !cfg.overwrite_manual) {
    return {
      status:  'SKIPPED',
      message: `${dateStr(target)} was entered manually — left untouched (enable "Overwrite manual sheets" to replace it)`,
      hdr_id:  existing.id,
    };
  }

  let feedNote = '';

  if (cfg.auto_enabled && cfg.provider_url) {
    const fetched = await fetchRatesFromProvider(cfg);
    if (fetched.ok) {
      const saved = await saveRateSheet(target, fetched.lines, {
        update_mode:   'AUTO',
        source:        cfg.provider_name || cfg.provider_url,
        currency_code: 'INR',
        remarks:       `${opts.trigger === 'scheduler' ? 'Scheduled' : 'Manual'} fetch — ${fetched.message}`,
        userId,
      });
      return {
        status:  'OK',
        message: `Rates updated from ${cfg.provider_name || 'the provider'} — ${fetched.message}`,
        hdr_id:  saved.id,
        mode:    'AUTO',
      };
    }
    feedNote = fetched.message;
  } else if (cfg.auto_enabled) {
    feedNote = 'Auto update is on but no provider URL is configured';
  } else {
    feedNote = 'Auto update is off';
  }

  if (!cfg.carry_forward) {
    return { status: 'FAILED', message: feedNote };
  }

  const carried = await carryForwardLines(target);
  if (!carried) {
    return {
      status:  'FAILED',
      message: `${feedNote}; no earlier sheet to carry forward from`,
    };
  }

  const saved = await saveRateSheet(target, carried.lines, {
    update_mode:   'CARRY_FWD',
    source:        `Carried forward from ${carried.from}`,
    currency_code: 'INR',
    remarks:       feedNote,
    userId,
  });

  return {
    status:  'OK',
    message: `Carried ${carried.lines.length} rate(s) forward from ${carried.from} — ${feedNote}`,
    hdr_id:  saved.id,
    mode:    'CARRY_FWD',
  };
};

// Records the outcome on the config row so the screen can show what the last
// unattended run did without digging through the server log.
//
// last_run_at is written with NOW() rather than a JS Date on purpose: the
// column is TIMESTAMP WITHOUT TIME ZONE and the scheduler's claim query
// compares it against NOW() too. Mixing a UTC-converted JS Date into the same
// column would offset every comparison by the server's UTC gap.
export const recordRunOutcome = async (result: RunResult): Promise<void> => {
  try {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE daily_rate_config
      SET    last_run_at      = NOW(),
             last_run_status  = ${result.status},
             last_run_message = ${result.message.slice(0, 1000)},
             updated_at       = NOW()
      WHERE  id = 1
    `);
  } catch (error) {
    logger.error('Daily Rate: failed to record run outcome', (error as Error).message);
  }
};
