import type { GreenhouseCache } from "./index.d";

/**
 * Saves cache to memory.
 */
export class LocalCache implements GreenhouseCache {
  ttlSeconds: number;
  storage: Map<string, unknown>;
  expires: Map<string, number>;

  constructor(ttlSeconds: number) {
    this.storage = new Map();
    this.expires = new Map();
    this.ttlSeconds = ttlSeconds;
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.expires.clear();
    this.storage.clear();
    return Promise.resolve();
  }

  /**
   * Does the cache have this value
   */
  has(key: string) {
    const expiration = this.expires.get(key);

    // The value is expired
    if (typeof expiration !== "number" || expiration < Date.now()) {
      this.expires.delete(key);
      this.storage.delete(key);
      return Promise.resolve(false);
    }

    return Promise.resolve(this.storage.has(key));
  }

  /**
   * Get cache value
   */
  async get<T = unknown>(key: string) {
    const hasValue = await this.has(key);
    if (hasValue) {
      return this.storage.get(key) as T;
    }
    return undefined;
  }

  /**
   * Save cache value
   */
  set(key: string, value: unknown): Promise<void> {
    const expiration = Date.now() + this.ttlSeconds * 1000;
    this.storage.set(key, value);
    this.expires.set(key, expiration);
    return Promise.resolve();
  }
}
