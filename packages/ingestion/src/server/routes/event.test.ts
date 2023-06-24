import "jest";
import { convertPayload, IncomingEventPayload } from "./event";

describe("event", () => {
  describe("convertPayload", () => {
    test("return normalized payload", () => {
      const now = Date.now();
      const result = convertPayload({
        t: 5,
        u: "foo",
        e: [
          {
            t: 1,
            n: "event",
            p: { prop1: "value1" },
          },
        ],
      });

      expect(result).toEqual({
        userId: "foo",
        events: [
          {
            time: expect.anything(),
            name: "event",
            props: { prop1: "value1" },
          },
        ],
      });
    });

    test("adjust submitted times to server times", () => {
      const now = Date.now();
      const result = convertPayload({
        t: 5,
        u: "foo",
        e: [
          {
            t: 1,
            n: "event",
            p: { prop1: "value1" },
          },
        ],
      });

      expect(result).toEqual(
        expect.objectContaining({
          events: [
            expect.objectContaining({
              time: now - 4,
            }),
          ],
        })
      );
    });

    test("return null if missing t (time)", () => {
      const result = convertPayload({
        u: "foo",
        e: [
          {
            t: 1,
            n: "event",
            p: { prop1: "value1" },
          },
        ],
      } as unknown as IncomingEventPayload);
      expect(result).toBeNull();
    });

    test("return null if missing u (user)", () => {
      const result = convertPayload({
        t: 5,
        e: [
          {
            t: 1,
            n: "event",
            p: { prop1: "value1" },
          },
        ],
      } as unknown as IncomingEventPayload);
      expect(result).toBeNull();
    });

    test("add shared props", () => {
      const result = convertPayload({
        t: 5,
        u: "foo",
        s: { foo: "bar" },
        e: [
          {
            t: 1,
            n: "event",
            p: { prop1: "value1" },
          },
        ],
      });
      expect(result).toEqual(
        expect.objectContaining({
          events: [
            expect.objectContaining({
              props: {
                foo: "bar",
                prop1: "value1",
              },
            }),
          ],
        })
      );
    });

    test("do not overwrite event props with shared props", () => {
      const result = convertPayload({
        t: 5,
        u: "foo",
        s: { prop1: "shared" },
        e: [
          {
            t: 1,
            n: "event",
            p: { prop1: "value1" },
          },
        ],
      });
      expect(result).toEqual(
        expect.objectContaining({
          events: [
            expect.objectContaining({
              props: {
                prop1: "value1",
              },
            }),
          ],
        })
      );
    });

    test("skip event if missing t (time)", () => {
      const result = convertPayload({
        t: 5,
        u: "foo",
        s: { prop1: "shared" },
        e: [
          {
            n: "event",
            p: { prop1: "value1" },
          },
        ],
      } as unknown as IncomingEventPayload);
      expect(result?.events.length).toBe(0);
    });

    test("skip event if missing n (name)", () => {
      const result = convertPayload({
        t: 5,
        u: "foo",
        s: { prop1: "shared" },
        e: [
          {
            t: 1,
            p: { prop1: "value1" },
          },
        ],
      } as unknown as IncomingEventPayload);
      expect(result?.events.length).toBe(0);
    });
  });
});
