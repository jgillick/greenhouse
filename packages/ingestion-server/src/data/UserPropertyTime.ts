import { clickhouse } from "../lib/clickhouse";

/**
 * How the property was set
 *  - normal: was set normally. When merging, the most recent should be used
 *  - once: The property was set with setOnce and should be retained when merging
 *          When merging if the other property is 'normal' it will fall back to most recent time.
 */
export type UserPropertySetType = "normal" | "once";

export type UserPropertyTypeRecord = {
  user_id: string;
  property: string;
  timestamp: number;
  type: UserPropertySetType;
};

/**
 * Data model for a user record
 */
export const UserPropertyTime = {
  /**
   * Return the properties for a user
   */
  async getForUsers(userIds: string[]) {
    return clickhouse
      .query({
        query_params: { userIds },
        query: `
          SELECT
            DISTINCT ON (user_id, property)
            user_id,
            property
          FROM user_property_time
          WHERE user_id in ({userIds: Array(UUID)})
          ORDER BY timestamp DESC
        `,
        format: "JSONEachRow",
      })
      .then((resultSet) => {
        return resultSet.json<UserPropertyTypeRecord[]>();
      });
  },

  /**
   * Set the update time on a list of user properties
   */
  async setPropertyTimes(
    userId: string,
    properties: [string, UserPropertySetType][]
  ) {
    await clickhouse.insert({
      table: "user_property_time",
      values: properties.map(([property, type]) => ({
        property,
        type,
        user_id: userId,
      })),
      format: "JSONEachRow",
    });
  },
};
