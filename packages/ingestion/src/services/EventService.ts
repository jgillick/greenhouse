import { Event, EventProps, EventRow } from "../data/Event";
import { PropFor, PropertyTuple } from "../data/Property";
import { UserService } from "./UserService";
import { PropertyService } from "./PropertyService";

type EventItem = {
  name: string;
  props: EventProps;
  time: number;
};

export type EventSubmitPayload = {
  time: number;
  userId: string;
  events: EventItem[];
};

export class EventService {
  /**
   * Add one or more events into the system
   */
  static async create(payload: EventSubmitPayload) {
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
    const now = Date.now();
    const startTime = payload.time;
    const rows = payload.events.map((event) => {
      const timediff = event.time - startTime;
      const time = now + timediff;

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
        time,
        event: event.name,
        user_alias_id: user.alias_id,
      } as EventRow;
    });

    // Add to DB
    await Event.insert(rows);
  }
}
