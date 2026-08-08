import { prisma } from '../database/prisma';

// Module-level cache — queries change only on migration (server restart) or
// via an admin edit to project_config, so caching indefinitely is safe and
// avoids a lookup per API call. clearQueryCache() handles the latter case:
// call it after any write to project_config so already-running processes
// pick up the change without a restart.
const _cache = new Map<string, string>();

export async function getQuery(key: string): Promise<string> {
  if (_cache.has(key)) return _cache.get(key)!;
  const row = await prisma.project_config.findUnique({
    where: { key_code: key },
    select: { key_value: true },
  });
  if (!row) throw new Error(`Query not found in project_config: ${key}`);
  _cache.set(key, row.key_value);
  return row.key_value;
}

/** Clears the whole cache, or just one key if given. */
export function clearQueryCache(key?: string): void {
  if (key) _cache.delete(key);
  else _cache.clear();
}

export function getQueryCacheSize(): number {
  return _cache.size;
}
