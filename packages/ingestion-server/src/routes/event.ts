import { Express, Request, Response } from "express";
import {
  EventService,
  EventPayload,
  EventItem,
  EventProps,
} from "../services/EventService";

export type IncomingEvent = {
  /** The unix timestamp of when the event took place */
  t: number;

  /** Event name */
  n: string;

  /** Event properties */
  p: EventProps;
};

export type IncomingEventPayload = {
  /** The unix timestamp of when the payload was send to the server */
  t: number;

  /** The user ID or alias */
  u: string;

  /** Properties that are shared among all events */
  s?: EventProps;

  /** List of events */
  e: IncomingEvent[];
};

export const convertPayload = (
  payload: IncomingEventPayload
): EventPayload | null => {
  // Validate schema
  if (!payload.t || !payload.u || !payload.e?.length) {
    return null;
  }

  // Construct normalized event payload
  const now = Date.now();
  const startTime = payload.t;
  const data: EventPayload = {
    userId: payload.u,
    events: [],
  };
  const sharedProps = payload.s ?? {};
  data.events = payload.e
    .filter((evt) => typeof evt.t === "number" && typeof evt.n === "string")
    .map<EventItem>((evt) => {
      // Normalize event time
      const timediff = startTime - evt.t;
      const time = now - timediff;

      return {
        time,
        name: evt.n,
        props: {
          ...sharedProps,
          ...(evt.p ?? {}),
        },
      };
    });

  return data;
};

export const eventRoutes = (app: Express) => {
  app.post(
    "/event",
    async (req: Request<object, EventPayload>, res: Response) => {
      const payload = req.body;

      const data = convertPayload(payload);
      if (data && data.events?.length > 0) {
        await EventService.create(payload);
      }

      res.status(200).send();
    }
  );
};
