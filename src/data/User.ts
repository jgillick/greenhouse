import { v4 as uuid } from "uuid";
import { clickhouse } from "../lib/clickhouse";

type UserRecord = {
  id: string;
  alias_id: string;
  timestamp: number;
  [key: string]: any;
};

/**
 * Data model for a user record
 */
export const User = {
  RESERVED_COLUMNS: ["id", "timestamp"],

  /**
   * Get user record by ID or alias ID
   */
  async get(id: string): Promise<UserRecord> {
    return clickhouse
      .query({
        query_params: { id },
        query: `
          SELECT
            user.id,
            user_alias.id as alias_id
          FROM user
          join user_alias on user_alias.user_id = user.id
          WHERE
            user_alias.alias = {id: String}
            OR user_alias.user_id = {id: String} limit 1
        `,
        format: "JSONEachRow",
      })
      .then((result) => result.json<UserRecord[]>())
      .then((list) => list[0]);
  },

  /**
   * Create new user record
   */
  async create() {
    const id = uuid();
    await clickhouse.insert({
      table: "user",
      values: [{ id }],
      format: "JSONEachRow",
    });
    return id;
  },

  /**
   * Create a user alias
   * @param userId - The internal greenhouse user ID
   * @param aliasId - The ID to alias to the internal ID
   */
  async alias(userId: string, alias: string) {
    const id = uuid();
    await clickhouse.insert({
      table: "user_alias",
      values: [
        {
          id,
          alias,
          user_id: userId,
        },
      ],
      format: "JSONEachRow",
    });
  },

  /**
   * Set properties on user object
   */
  async update(data: Record<string, any>) {
    await clickhouse.insert({
      table: "user",
      values: [data],
      format: "JSONEachRow",
    });
  },

  /**
   * Get table columns
   */
  async getColumns() {
    const rows = await clickhouse
      .query({ query: `DESCRIBE user` })
      .then((resultSet) => resultSet.json<{ data: any[] }>())
      .then((results) => results.data);
    return rows.map<string>((row) => row.name);
  },
};
