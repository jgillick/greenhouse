import { GreenhouseOptions } from "./options";

type SendOptions = {
  /** Automatically retry when a request fails */
  retry?: boolean;
};

/**
 * Join two paths together without duplicate slashes
 */
function joinPaths(path1: string, path2: string) {
  if (path1 && path1.charAt(path1.length - 1) === "/") {
    path1 = path1.substring(0, path1.length - 1);
  }
  if (path2 && path2.charAt(0) === "/") {
    path2 = path2.substring(1);
  }
  return `${path1 || ""}/${path2 || ""}`;
}

/**
 * Api handler
 */
export class Api {
  options: GreenhouseOptions;

  constructor(options: GreenhouseOptions) {
    if (typeof options.endpoint !== "string") {
      console.warn("No Greenhouse endpoint defined. Tracking is disabled");
      options.enabled = false;
    }

    this.options = options;
  }

  /**
   * Sends a request to the endpoint and retries once if it fails.
   */
  async send(
    path: string,
    data: Record<string, unknown>,
    options: SendOptions = {}
  ) {
    if (!this.options.enabled || typeof this.options.endpoint !== "string") {
      return;
    }

    const url = joinPaths(this.options.endpoint, path);
    const serializedData = JSON.stringify(data);

    // If we need to automatically retry, we should use fetch
    if (options.retry || !navigator?.sendBeacon) {
      const response = await fetch(url, {
        method: "POST",
        body: serializedData,
        keepalive: true,
      });
      // Try again
      if (!response.ok && options.retry) {
        await this.send(path, data, { ...options, retry: false });
      }
    }
    // Fire and forget
    else {
      navigator.sendBeacon(url, serializedData);
    }
  }
}
