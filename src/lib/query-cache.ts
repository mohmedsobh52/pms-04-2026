// Tiny in-memory TTL cache for reference reads. Not a replacement for react-query;
// just a guard against hammering small lookup tables (currency rates, cost codes, roles).
type Entry<T> = { value: T; expires: number };
const store = new Map<string, Entry<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
  const e = store.get(key) as Entry<T> | undefined;
  if (!e) return undefined;
  if (e.expires < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return e.value;
}

export function cacheSet<T>(key: string, value: T, ttlMs = 5 * 60 * 1000): void {
  store.set(key, { value, expires: Date.now() + ttlMs });
}

export async function cached<T>(key: string, fetcher: () => Promise<T>, ttlMs?: number): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const value = await fetcher();
  cacheSet(key, value, ttlMs);
  return value;
}

export function cacheInvalidate(prefix?: string): void {
  if (!prefix) return store.clear();
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
