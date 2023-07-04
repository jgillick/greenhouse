export interface GreenhouseCache {
  /**
   * Does a cache value exist for this key
   */
  has(key: string): Promise<boolean>;

  /**
   * Get a value from cache
   */
  get<T = unknown>(key: string): Promise<T | undefined>;

  /**
   * Set a value in the cache
   */
  set(key: string, value: unknown, ttlMinutes?: number): Promise<void>;

  /**
   * Clear entire cache
   */
  clear(): Promise<void>;
}
