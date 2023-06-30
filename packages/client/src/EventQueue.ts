import { GreenhouseOptions, GreenhouseOptionDefaults } from "./options";
import { Api } from "./Api";
import { User } from "./User";

type EventProperties = Record<string, string | number | boolean>;
export type QueuedEvent = {
  /** Time of the event in milliseconds */
  t: number;

  /** The event name */
  n: string;

  /** Event props */
  p: EventProperties;
};

/**
 * Event tracking client
 */
export class EventQueue {
  protected api: Api;
  protected options: GreenhouseOptions;
  private queue: QueuedEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private user: User;

  constructor(api: Api, user: User, options: GreenhouseOptions) {
    this.api = api;
    this.user = user;
    this.options = options;

    // Automatically flush on page unload
    if (document?.addEventListener) {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          this.flush();
        }
      });
    }
  }

  /**
   * Track an event
   */
  track(name: string, props: EventProperties) {
    this.queue.push({ t: Date.now(), n: name, p: props });
    this.startFlushTimer();
  }

  /**
   * Clear the existing event queue.
   */
  resetQueue() {
    this.queue = [];
  }

  /**
   * Send the queue to the server
   */
  async flush() {
    const sendQueue = this.queue;
    this.stopFlusTimer();
    this.queue = [];

    if (!this.user.id) {
      console.warn("Greenhouse: No user created");
      return;
    }
    const payload = {
      t: Date.now(),
      u: this.user.id,
      e: sendQueue,
    };
    await this.api.send(`/event`, payload);
  }

  /**
   * Start the flush timer
   */
  private startFlushTimer() {
    if (this.flushTimer) {
      return;
    }
    this.flushTimer = setTimeout(
      () => this.flush(),
      (this.options.flushInterval ?? GreenhouseOptionDefaults.flushInterval) *
        1000
    );
  }

  /**
   * Stop the flush timer
   */
  private stopFlusTimer() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
}
