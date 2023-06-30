import { v4 as uuid } from "uuid";
import { Api } from "./Api";
import { Persistance } from "./Persistance";

type UserProperties = Record<string, string | number | boolean>;

export class User {
  private api: Api;
  private persistance: Persistance;
  private internalId: string;

  constructor(api: Api, persistance: Persistance) {
    this.api = api;
    this.persistance = persistance;

    let id = persistance.get("userId");
    if (!id) {
      id = uuid();
      persistance.set("userId", id);
    }
    this.internalId = id as string;
  }

  /**
   * Get the current user identifier
   */
  get id() {
    return this.internalId;
  }

  /**
   * Clear the current user ID and create a new unique one
   */
  reset() {
    this.internalId = uuid();
    this.persistance.set("userId", this.internalId);
  }

  /**
   * Set the user ID or alias
   */
  async identify(alias: string) {
    if (this.internalId === alias) {
      return;
    }

    const user = this.internalId;
    this.internalId = alias;
    await this.api.send(
      `/users/alias`,
      {
        user,
        alias,
      },
      { retry: true }
    );
  }

  /**
   * Set user properties
   */
  async set(properties: UserProperties) {
    await this.api.send(
      `/users/properties/set`,
      {
        user: this.internalId,
        properties,
      },
      { retry: true }
    );
  }

  /**
   * Set the user properties once for the lifetime of this user
   */
  async once(properties: UserProperties) {
    await this.api.send(
      `/users/properties/once`,
      {
        user: this.internalId,
        properties,
      },
      { retry: true }
    );
  }

  /**
   * Increment a numeric value on this user
   */
  async increment(property: string) {
    await this.api.send(
      `/users/properties/increment`,
      {
        user: this.internalId,
        property,
      },
      { retry: true }
    );
  }
}
