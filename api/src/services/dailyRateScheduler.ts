import { Prisma } from '../generated/prisma/client';
import { prisma } from '../database/prisma';
import { logger } from '../utils/logger';
import { runDailyRateUpdate, recordRunOutcome } from './dailyRate.service';

// Unattended half of the Daily Rate master: once a day, at the configured
// time, pull the rates in (or carry the last sheet forward).
//
// There is no cron dependency in this project, so this is a plain interval
// that wakes up every minute and asks the database whether the run is due.
// The database is the only clock and the only lock — see claimRun() — which
// keeps the behaviour identical whether the API runs as one process or three
// behind a load balancer.

const TICK_MS = 60_000;

let timer: NodeJS.Timeout | null = null;
// Guards against a slow provider: a fetch that outlives its minute must not
// have the next tick start a second one inside the same process.
let running = false;

// Atomically claim today's run. The WHERE clause is the lock: whichever
// instance's UPDATE matches a row gets to do the work, everyone else sees zero
// rows and goes back to sleep. All the time arithmetic stays in SQL so the
// database's wall clock decides, not each container's TZ setting.
//
// A failed attempt is retried after 30 minutes rather than being written off
// until tomorrow — a provider that is briefly down shouldn't cost a whole day
// of rates.
const claimRun = async (): Promise<boolean> => {
  const rows = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
    UPDATE daily_rate_config
    SET    last_run_at      = NOW(),
           last_run_status  = 'RUNNING',
           last_run_message = 'Update in progress…'
    WHERE  id = 1
      AND  auto_enabled = TRUE
      AND  to_char(NOW(), 'HH24:MI') >= COALESCE(run_at, '09:00')
      AND  (
             last_run_at IS NULL
             OR last_run_at::date < CURRENT_DATE
             OR (last_run_status = 'FAILED' AND last_run_at < NOW() - INTERVAL '30 minutes')
           )
    RETURNING id
  `);
  return rows.length > 0;
};

const tick = async (): Promise<void> => {
  if (running) return;
  running = true;
  try {
    if (!(await claimRun())) return;

    logger.info('Daily Rate: scheduled update starting');
    const result = await runDailyRateUpdate({ trigger: 'scheduler' });
    await recordRunOutcome(result);

    if (result.status === 'OK') logger.info(`Daily Rate: ${result.message}`);
    else                        logger.warn(`Daily Rate: ${result.status} — ${result.message}`);
  } catch (error) {
    const message = (error as Error).message;
    logger.error('Daily Rate: scheduled update crashed', message);
    // The claim is already recorded as RUNNING; without this the retry
    // condition never matches and the loop would stay stuck until midnight.
    await recordRunOutcome({ status: 'FAILED', message: `Scheduled update crashed — ${message}` });
  } finally {
    running = false;
  }
};

// Called once from server startup. Set DAILY_RATE_SCHEDULER=off to keep a
// process out of the rotation (a worker-less container, a debugging session)
// without touching the auto_enabled switch the business owns.
export const startDailyRateScheduler = (): void => {
  if (process.env.DAILY_RATE_SCHEDULER === 'off') {
    logger.info('Daily Rate scheduler disabled (DAILY_RATE_SCHEDULER=off)');
    return;
  }
  if (timer) return;

  timer = setInterval(() => { void tick(); }, TICK_MS);
  // Nothing should be held open by a rate check.
  timer.unref?.();

  logger.info('Daily Rate scheduler started (checks every minute)');
};

export const stopDailyRateScheduler = (): void => {
  if (timer) { clearInterval(timer); timer = null; }
};
