type PersistanceType = "localstorage" | "cookie";

/**
 * Greenhouse constructor options
 */
export type GreenhouseOptions = {
  /**
   * The URL to the greenhouse ingestion service
   */
  endpoint: string;

  /**
   * Is tracking enabled
   */
  enabled?: boolean;

  /**
   * How often (in seconds) the client will attempt to flush queued events to the server.
   * The client will automatically flush the queue when the browser unloads the page.
   */
  flushInterval?: number;

  /**
   * Where to persist the user session
   * @default cookie
   */
  persist?: {
    type: PersistanceType;

    /**
     * Name of the persistance storage (cookie name or localStorage key)
     * @default greenhouse
     */
    name?: string;

    /**
     * Settings for cookie persistance
     */
    cookie?: {
      /**
       * Number of days until the cookie expires
       * @default 365
       */
      expires?: number;

      /**
       * The domain the cookie should be defined on
       */
      domain?: string;

      /**
       * Require the cookie only be sent over HTTPS
       * @default true
       */
      secure?: boolean;
    };
  };
};

/**
 * Default greenhouse options
 */
export const GreenhouseOptionDefaults = {
  enabled: true,
  flushInterval: 10,
  persist: {
    type: "localstorage" as PersistanceType,
    name: "greenhouse",
    cookie: {
      expires: 365,
    },
  },
};
