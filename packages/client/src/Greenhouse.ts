import { GreenhouseOptions } from "./options";
import { EventQueue } from "./EventQueue";
import { Persistance } from "./Persistance";
import { User } from "./User";
import { Api } from "./Api";

export class Greenhouse {
  user: User;
  events: EventQueue;
  private api: Api;
  private options: GreenhouseOptions;
  private persistance: Persistance;

  constructor(options: GreenhouseOptions) {
    this.options = options;

    this.api = new Api(this.options);
    this.persistance = new Persistance(this.options);
    this.user = new User(this.api, this.persistance);
    this.events = new EventQueue(this.api, this.user, this.options);
  }

  /**
   * Set an option value
   */
  setOption<T extends keyof GreenhouseOptions>(
    name: T,
    value: GreenhouseOptions[T]
  ) {
    this.options[name] = value;
  }

  /**
   * Reset the current persistance data and defined a new user.
   * Use this when the user logs out.
   */
  reset() {
    this.events.flush();
    this.events.resetQueue();
    this.persistance.clear();
    this.user.reset();
  }
}
