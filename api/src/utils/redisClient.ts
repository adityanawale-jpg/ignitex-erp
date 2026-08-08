import Redis from 'ioredis';
import { logger } from './logger';

// Redis is a performance optimization (query cache, rate-limit store), never
// a hard dependency: every helper here fails open (logs + returns a neutral
// value) so a Redis outage degrades to "slower" (falls through to the DB),
// not "down".
const REDIS_URL = process.env.REDIS_URL;

export const redis: Redis | null = REDIS_URL
  ? new Redis(REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      // Commands issued while disconnected reject immediately instead of
      // queuing until reconnect — without this, every request stalls for
      // however long the reconnect backoff takes (seconds), and the
      // "fail open" fallback below never gets a chance to run promptly.
      enableOfflineQueue: false,
      // Cap the reconnect backoff at 30s: a dead Redis is retried quietly in
      // the background (and picked up if it comes back) without hammering it.
      retryStrategy: (times) => Math.min(times * 500, 30000),
    })
  : null;

// Node's net.connect can reject with an AggregateError whose own .message is
// empty (the detail lives in .errors[]) — unwrap it so the log isn't blank.
const describeError = (err: Error): string => {
  const inner = (err as Error & { errors?: Error[] }).errors?.map((e) => e.message).join('; ');
  return err.message || inner || (err as NodeJS.ErrnoException).code || err.name || 'unknown error';
};

if (redis) {
  // A dead Redis re-emits the same connect error on every retry — log it at
  // most once a minute (immediately if the message changes), not per attempt.
  let lastErrMsg = '';
  let lastErrAt = 0;
  redis.on('error', (err) => {
    const msg = describeError(err);
    const now = Date.now();
    if (msg !== lastErrMsg || now - lastErrAt > 60_000) {
      logger.warn(`Redis error: ${msg} (cache disabled until reconnect)`);
      lastErrMsg = msg;
      lastErrAt = now;
    }
  });
  redis.on('ready', () => {
    lastErrMsg = '';
    lastErrAt = 0;
    logger.info('Redis connected');
  });
  // lazyConnect defers the socket until first command; kick it off now so
  // the very first cache lookup doesn't pay the connect latency.
  redis.connect().catch((error) => logger.warn(`Redis initial connect failed: ${describeError(error as Error)}`));
}

// Only ever attempt a command when the connection is actually up. This is
// what makes the outage case fast: skip straight to "no cache" instead of
// letting ioredis's own reconnect/retry cycle run first.
const ready = (): boolean => redis !== null && redis.status === 'ready';

export const cacheGetJson = async <T>(key: string): Promise<T | null> => {
  if (!ready()) return null;
  try {
    const raw = await redis!.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (error) {
    logger.warn(`Redis GET failed for ${key}: ${(error as Error).message}`);
    return null;
  }
};

export const cacheSetJson = async (key: string, value: unknown, ttlSeconds: number): Promise<void> => {
  if (!ready()) return;
  try {
    await redis!.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (error) {
    logger.warn(`Redis SET failed for ${key}: ${(error as Error).message}`);
  }
};

export const cacheDel = async (...keys: string[]): Promise<void> => {
  if (!ready() || !keys.length) return;
  try {
    await redis!.del(...keys);
  } catch (error) {
    logger.warn(`Redis DEL failed for ${keys.join(', ')}: ${(error as Error).message}`);
  }
};

// Pattern delete via SCAN (not KEYS — non-blocking, safe on a live prod instance).
export const cacheDelPattern = async (pattern: string): Promise<void> => {
  if (!ready()) return;
  try {
    let cursor = '0';
    do {
      const [next, keys] = await redis!.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      if (keys.length) await redis!.del(...keys);
    } while (cursor !== '0');
  } catch (error) {
    logger.warn(`Redis SCAN/DEL failed for pattern ${pattern}: ${(error as Error).message}`);
  }
};

export const isRedisConfigured = (): boolean => redis !== null;
