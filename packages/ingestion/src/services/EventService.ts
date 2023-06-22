import { Event, EventProps, EventRow } from "../data/Event";
import { PropFor } from "../data/Property";
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
  sharedProps?: EventProps;
  events: EventItem[];
};

export class EventService {
  /**
   * Add one or more events into the system
   */
  static async create(payload: EventSubmitPayload) {
    // Create user, if necessary
    const user = await UserService.getOrCreate(payload.userId);

    // Create new event property table columns
    let propEntries = Object.entries(payload.sharedProps || {});
    payload.events.forEach((event) => {
      propEntries = propEntries.concat(Object.entries(event.props ?? {}));
    });
    const propColumnMap = await PropertyService.createProps(
      PropFor.EVENT,
      propEntries
    );

    // Create event rows
    const now = Date.now();
    const startTime = payload.time;
    const rows = payload.events.map((event) => {
      const timediff = event.time - startTime;
      const time = now + timediff;

      // Combine props
      const eventProps = {
        ...(payload.sharedProps || {}),
        ...(event.props || {}),
      };

      // Remap props to DB columns
      const props = Object.entries(eventProps).reduce<Record<string, any>>(
        (prev, [name, value]) => {
          const col = propColumnMap.get(name);
          if (col) {
            const tuple = PropertyService.getValueTuple(value);
            prev[col as string] = tuple;
          }
          return prev;
        },
        {}
      );

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
