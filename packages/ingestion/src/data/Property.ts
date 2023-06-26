import { clickhouse } from "../lib/clickhouse";

export enum PropFor {
  EVENT = "event",
  USER = "user",
}

export enum PropDataType {
  str = "str",
  num = "num",
  bool = "bool",
  date = "date",
}

export type PropValue = string | number | boolean;

export type PropertyTuple = {
  str: string | null;
  num: number | null;
  bool: boolean | null;
  date: string | null;
};

export type PropertyRecord = {
  name: string;
  for: PropFor;
  column: string;
  dataTypes: PropDataType[];
  timestamp: number;
};

export type PropertyRow = {
  name: string;
  for: PropFor;
  column: string;
  data_type: PropDataType;
  timestamp?: number;
};

export const PROPERTY_PREFIX = "p";

/**
 * Data model for the property table
 */
export const Property = {
  /**
   * Get all property definitions for a particular type
   */
  getProps(propFor: PropFor) {
    return clickhouse
      .query({
        query_params: { propFor },
        query: `
          SELECT
            name,
            for,
            column,
            groupArray(10)(data_type) as dataTypes
          FROM property
          WHERE for = {propFor: String}
          GROUP BY name, for, column
        `,
        format: "JSONEachRow",
      })
      .then((result) => result.json<PropertyRecord[]>());
  },

  /**
   * Create new property definitions
   */
  async create(rows: PropertyRow[]) {
    await clickhouse.insert({
      table: "property",
      values: rows,
      format: "JSONEachRow",
    });
  },

  /**
   * Define property columns on target table (i.e. event or user)
   */
  async addPropColumns(onTable: PropFor, cols: string[]) {
    const work = cols.map(async (col) => {
      if (!col) {
        return;
      }
      const resultSet = await clickhouse.exec({
        query: `ALTER TABLE ${onTable} ADD COLUMN IF NOT EXISTS "${col}" Tuple(
          str Nullable(String),
          num Nullable(Float64),
          bool Nullable(Boolean),
          date Nullable(DateTime)
        ) DEFAULT (NULL, NULL, NULL, NULL)`,
      });
      resultSet.stream.destroy();
    });
    await Promise.all(work);
  },
};
