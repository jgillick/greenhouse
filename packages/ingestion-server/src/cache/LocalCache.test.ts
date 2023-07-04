import "jest";
import { LocalCache } from "./LocalCache";

describe("LocalCache", () => {
  let cache: LocalCache;

  beforeEach(() => {
    cache = new LocalCache(10);
  });

  test("clear", async () => {
    await cache.set("foo", "bar");
    await cache.set("baz", "boo");

    expect(cache.storage.size).toBe(2);
    await cache.clear();
    expect(cache.storage.size).toBe(0);
    expect(cache.expires.size).toBe(0);
  });

  describe("set", () => {
    test("add a new cache entry", async () => {
      await cache.set("foo", "bar");
      expect(cache.storage.size).toBe(1);
      expect(cache.storage.get("foo")).toBe("bar");
    });

    test("set TTL expiration", async () => {
      const expectedExpiration = Date.now() + 10 * 1000;
      await cache.set("foo", "bar");
      const expiresAt = cache.expires.get("foo") ?? 0;
      expect(cache.expires.size).toBe(1);
      expect(Math.abs(expiresAt - expectedExpiration)).toBeLessThan(2);
    });
  });

  describe("get", () => {
    test("get value", async () => {
      await cache.set("foo", "bar");
      const result = await cache.get("foo");
      expect(result).toBe("bar");
    });

    test("no value exists for this key", async () => {
      const result = await cache.get("unknown");
      expect(result).toBe(undefined);
    });

    test("the value has expired", async () => {
      await cache.set("foo", "bar");
      cache.expires.set("foo", Date.now() - 1);
      const result = await cache.get("foo");
      expect(result).toBe(undefined);
      expect(cache.storage.size).toBe(0);
    });
  });
});
