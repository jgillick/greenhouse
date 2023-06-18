import { v4 as uuid } from "uuid";
import { clickhouseClient } from "../lib/clickhouse";

/**
 * Manages users
 */
export class UserService {
  /**
   * Get or create user by ID.
   */
  static async getOrCreate(id: string) {
    // The ID could be the greenhouse user ID or an alias ID, so we check the alias table
    const existing = await clickhouseClient
      .query({
        query_params: {
          id,
        },
        query: `SELECT user_id, alias FROM user_alias WHERE alias = {id: String} OR user_id = {id: String} limit 1`,
        format: "JSONEachRow",
      })
      .then((result) => result.json<Record<string, any>[]>());

    // Return existing ID
    if (existing?.length) {
      return existing[0].user_id;
    }

    // Create new user and alias this ID to it
    const userId = uuid();
    await clickhouseClient.insert({
      table: "user",
      values: [{ id: userId }],
      format: "JSONEachRow",
    });

    // Create alias ID
    await clickhouseClient.insert({
      table: "user_alias",
      values: [{ user_id: userId, alias: id }],
      format: "JSONEachRow",
    });

    return userId;
  }

  /**
   * Create a user alias
   */
  alias(greenhouseId: string, aliasId: string) {}
}
