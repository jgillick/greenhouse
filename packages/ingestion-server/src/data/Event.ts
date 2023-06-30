import { clickhouse } from "../lib/clickhouse";

export type EventRow = {
  time: number;
  event: string;
  user_alias_id: string;
  [key: string]: string | number | boolean;
};

/**
 * Data model for events
 */
export const Event = {
  /**
   * A list of strongly typed properties that are built-in
   * and do not need to be created or prefixed
   */
  BUILT_IN_PROPERTIES: {},

  /**
   * Insert an event into the table
   */
  insert(eventRows: EventRow[]) {
    return clickhouse.insert({
      table: "event",
      values: eventRows,
      format: "JSONEachRow",
    });
  },

  /**
   * Get table columns
   */
  async getColumns() {
    return clickhouse
      .query({ query: `DESCRIBE event` })
      .then((resultSet) => resultSet.json<{ data: { name: string }[] }>())
      .then((results) => results.data.map((row) => row.name));
  },
};
