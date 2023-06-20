import { v4 as uuid } from "uuid";
import { clickhouse } from "../lib/clickhouse";

export type AliasRecord = {
  id: string;
  user_id: string;
  alias: string;
  created_at?: number;
  updated_at?: number;
};

/**
 * Data model for a user record
 */
export const UserAlias = {
  /**
   * Get record by alias
   */
  async get(alias: string) {
    return clickhouse
      .query({
        query_params: { alias },
        query: `
          SELECT DISTINCT ON (alias)
            *
          FROM user_alias
          WHERE alias = {alias: String} AND is_deleted = 0
          ORDER BY updated_at DESC
        `,
        format: "JSONEachRow",
      })
      .then((resultSet) => {
        return resultSet.json<AliasRecord[]>();
      })
      .then((rows) => (rows.length ? rows[0] : undefined));
  },

  /**
   * Get the alias records for a user ID
   */
  async getForUser(userId: string) {
    return clickhouse
      .query({
        query_params: { userId },
        query: `
          SELECT DISTINCT ON (alias) *
          FROM user_alias
          WHERE
            user_id = {userId: UUID}
            AND is_deleted = 0
          ORDER BY updated_at DESC
        `,
        format: "JSONEachRow",
      })
      .then((resultSet) => {
        return resultSet.json<AliasRecord[]>();
      });
  },

  /**
   * Create a user alias
   * @param userId - The internal greenhouse user ID
   * @param aliasId - The ID to alias to the internal ID
   */
  async create(userId: string, alias: string) {
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
   * Update alias records
   */
  async update(data: AliasRecord[]) {
    const now = Math.round(Date.now() / 1000);
    await clickhouse.insert({
      table: "user_alias",
      values: data.map((item) => ({ ...item, updated_at: now })),
      format: "JSONEachRow",
    });
  },
};
