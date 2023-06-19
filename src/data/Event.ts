import { clickhouse } from "../lib/clickhouse";

const NOT_PROP_COLS = ["user_id", "event", "time"];

export type EventProps = Record<string, any>;

type EventRow = {
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
    const rows = await clickhouse
      .query({ query: `DESCRIBE event` })
      .then((resultSet) => resultSet.json<{ data: any[] }>())
      .then((results) => results.data);
    return rows.map<string>((row) => row.name);
  },
};
