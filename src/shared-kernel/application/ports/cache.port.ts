export const CACHE = Symbol('CACHE');

/**
 * Application cache. Namespace-agnostic — callers pass fully-qualified keys (e.g. `iam:user:<id>`,
 * `media:assets`). No `health()`: a cache miss is non-fatal, so cache-down must not make the app
 * report not-ready (readiness rides the existing db0 Redis health indicator).
 */
export interface CachePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  flushByPrefix(prefix: string): Promise<void>;
}
