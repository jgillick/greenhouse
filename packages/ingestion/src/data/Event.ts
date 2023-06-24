import { clickhouse } from "../lib/clickhouse";

export type EventProps = Record<string, any>;

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
  RESERVED_COLUMNS: ["id", "user_alias_id", "event", "timestamp"],

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
