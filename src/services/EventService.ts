import Stream from "stream";
import { clickhouseClient } from "../lib/clickhouse";
import { UserService } from "./UserService";

const COL_TYPES = {
  num: "Decimal64(4)",
  str: "String",
  bool: "Boolean",
  time: "DateTime",
};

const NOT_PROP_COLS = ["user_id", "event", "time"];

type EventItem = {
  name: string;
  props: EventProps;
  time: number;
};
type EventProps = Record<string, any>;
export type EventSubmitPayload = {
  time: number;
  userId: string;
  sharedProps?: EventProps;
  events: EventItem[];
};

export class EventService {
  /**
   * Add one or more events into the system
   */
  static async create(payload: EventSubmitPayload) {
    // Create user, if necessary
    const userId = await UserService.getOrCreate(payload.userId);

    // Update event schema with event props
    const propColMap = await EventService.createEventPropertyColumns(payload);

    // Insert events
    const now = Date.now();
    const startTime = payload.time;
    const stream = new Stream.Readable({ objectMode: true, read() {} });
    const insertPromise = clickhouseClient.insert({
      table: "event",
      values: stream,
      format: "JSONEachRow",
    });
    payload.events.map(async (event) => {
      const timediff = event.time - startTime;
      const time = now + timediff;

      const eventProps = {
        ...(payload.sharedProps || {}),
        ...(event.props || {}),
      };
      // Remap props to DB columns
      const props = Object.entries(eventProps).reduce<Record<string, any>>(
        (prev, [name, value]) => {
          prev[propColMap[name]] = value;
          return prev;
        },
        {}
      );

      console.log({
        ...props,
        time,
        event: event.name,
        user_id: userId,
      });
      stream.push({
        ...props,
        time,
        event: event.name,
        user_id: userId,
      });
    });

    // Close stream
    stream.push(null);
    await insertPromise;
    await clickhouseClient.close();
  }

  /**
   * Parse prop object into column names and types
   */
  static propsToColumns(payload: EventSubmitPayload) {
    let propEntries = Object.entries(payload.sharedProps || {});
    payload.events.forEach((event) => {
      propEntries = propEntries.concat(Object.entries(event.props ?? {}));
    });

    const dbCols: Record<string, string> = {};
    const propMap: Record<string, string> = {};
    propEntries.forEach(([name, value]) => {
      // Get data-type column suffix
      let typeSuffix: keyof typeof COL_TYPES | null = null;
      switch (typeof value) {
        case "number":
          typeSuffix = "num";
          break;
        case "string":
          typeSuffix = "str";
          break;
        case "boolean":
          typeSuffix = "bool";
          break;
        case "object":
          if (value?.time) {
            typeSuffix = "time";
            break;
          }
        // Unknown/unsupported type, convert to string
        default:
          typeSuffix = "str";
          value = String(value);
      }

      // TODO: ensure valid column name
      const colName = `${name}_${typeSuffix}`;

      // Add to column list
      dbCols[colName] = COL_TYPES[typeSuffix];
      propMap[name] = colName;
    });

    return { dbCols, propMap };
  }

  /**
   * Get the current event property columns
   */
  static async getEventPropertyColumns(): Promise<string[]> {
    const rows = await clickhouseClient
      .query({
        query: "DESCRIBE event",
      })
      .then((resultSet) => resultSet.json<{ data: any[] }>())
      .then((results) => results.data);

    return rows
      .map((row) => row.name)
      .filter((name) => !NOT_PROP_COLS.includes(name));
  }

  /**
   * Create missing event property columns and return a map to event properties and column names
   */
  static async createEventPropertyColumns(payload: EventSubmitPayload) {
    // Get all the prop names and types from the event payload
    const { dbCols, propMap } = EventService.propsToColumns(payload);

    // Get existing event property columns
    const existingCols = await EventService.getEventPropertyColumns();

    // Add missing cols
    const missing = Object.keys(dbCols).filter(
      (name) => !existingCols.includes(name)
    );
    if (missing.length) {
      // Create alter table query syntax
      const work = missing.map(async (colName) => {
        const resultSet = await clickhouseClient.exec({
          query: `ALTER TABLE event ADD COLUMN IF NOT EXISTS ${colName} Nullable(${dbCols[colName]})`,
        });
        resultSet.stream.destroy();
      });
      await Promise.all(work);
    }

    return propMap;
  }
}
