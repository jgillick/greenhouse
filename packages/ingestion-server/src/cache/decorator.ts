/* eslint-disable @typescript-eslint/no-explicit-any */
import type { GreenhouseCache } from "./index.d";

/**
 * A simple typescript decorator that caches function return values.
 *
 * @example
 * ```
 * const serviceCache = new LocalCache(60);
 *
 * const class Service {
 *
 *    @cache(serviceCache)
 *    async getComplicatedThing(arg1: string, arg2: unknown) {
 *    }
 * }
 * ```
 */
export function cache(cache: GreenhouseCache) {
  return (target: any, propertyKey: any, descriptor?: PropertyDescriptor) => {
    // Static method decorator
    if (
      typeof target === "function" &&
      typeof propertyKey !== "string" &&
      propertyKey?.name
    ) {
      const key = propertyKey?.name;
      const obj = {
        [key]: target,
      };
      cacheDecoratorWrapper(cache, obj, key);
      return obj[key];
    }
    // Method decorator
    else if (target && typeof target === "object") {
      return cacheDecoratorWrapper(cache, target, propertyKey);
    }
    // Function decorator (make it look like a method decorator so we can use the same function)
    else if (descriptor?.value) {
      const obj = {
        [propertyKey]: descriptor.value,
      };
      cacheDecoratorWrapper(cache, obj, propertyKey);
      descriptor.value = obj[propertyKey];
      return descriptor;
    } else {
      console.error("Cache decorator: Could not determine wrapped method!");
    }
  };
}

/**
 * Create a cache key for a method and it's arguments.
 */
function createCacheKey(target: any, propertyKey: string, ...args: unknown[]) {
  const cacheArgs = args
    .map((arg) => {
      let str = String(arg);
      if (arg && typeof arg === "object") {
        try {
          str = JSON.stringify(arg);
          // eslint-disable-next-line no-empty
        } catch (e) {}
      }
      return str;
    })
    .join(",");
  return `${target?.constructor?.name ?? ""}.${propertyKey}#${cacheArgs}`;
}

/**
 * Create the decorator wrapper function
 */
function cacheDecoratorWrapper(
  cache: GreenhouseCache,
  target: any,
  propertyKey: string
) {
  const method =
    typeof target === "object" && propertyKey in target
      ? target[propertyKey]
      : null;
  if (!method) {
    console.error("Cache decorator: Could not determine wrapped method!");
    return;
  }

  // Create wrapped method
  target[propertyKey] = function (...args: unknown[]) {
    const cacheKey = createCacheKey(target, propertyKey, ...args);

    // Wrapper to call the function and cache the result
    const callFn = () => {
      const result = method.apply(this, args);

      // The result is a promise
      if (typeof result === "object" && typeof result?.then === "function") {
        result.then((value: unknown) => {
          cache.set(cacheKey, value);
        });
      } else {
        cache.set(cacheKey, result);
      }

      return result;
    };

    // Check for cache and call the function if no cache is found
    return cache
      .has(cacheKey)
      .then((hasValue) => {
        if (hasValue) {
          return cache.get(cacheKey);
        }
        return callFn();
      })
      .catch(() => callFn());
  };
}
