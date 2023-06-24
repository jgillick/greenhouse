import { Event, EventRow } from "../data/Event";
import { PropFor, PropertyTuple, PropValue } from "../data/Property";
import { UserService } from "./UserService";
import { PropertyService } from "./PropertyService";

export type EventProps = Record<string, PropValue>;

export type EventItem = {
  name: string;
  props: EventProps;
  time: number;
};

export type EventPayload = {
  userId: string;
  events: EventItem[];
};

export class EventService {
  /**
   * Add one or more events into the system
   */
  static async create(payload: EventPayload) {
    // Create user, if necessary
    const user = await UserService.getOrCreate(payload.userId);

    // Create new event property columns
    let propEntries: [string, unknown][] = [];
    payload.events.forEach((event) => {
      propEntries = propEntries.concat(Object.entries(event.props ?? {}));
    });
    const propColumnMap = await PropertyService.createPropColumns(
      PropFor.EVENT,
      propEntries
    );

    // Create event rows
    const rows = payload.events.map((event) => {
      // Remap props to DB columns
      const props = Object.entries(event.props || {}).reduce<
        Record<string, PropertyTuple>
      >((prev, [name, value]) => {
        const col = propColumnMap.get(name);
        if (
          typeof col !== "undefined" &&
          value !== null &&
          typeof value !== "undefined"
        ) {
          const tuple = PropertyService.getValueTuple(value);
          prev[col] = tuple;
        }
        return prev;
      }, {});

      return {
        ...props,
        time: event.time,
        event: event.name,
        user_alias_id: user.alias_id,
      } as EventRow;
    });

    // Add to DB
    await Event.insert(rows);
  }
}
