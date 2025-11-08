import { describe, test, expect, beforeAll } from "vitest";
import {
  EventBus,
  filterEventsByState,
  filterEventsByUUID,
  filterEventsByPayload,
  getEventBus,
  getEventUUID,
  withEventBus,
  withEvents,
  withEventNames,
  getFuncData,
  filterEventsByName,
} from "../src/utils/eventBus";

let eventBus: EventBus;
let args;

describe("eventHelpers", () => {
  beforeAll(() => {
    eventBus = new EventBus();
    eventBus.events = {
      a: [
        {
          name: "a",
          payload: { test2: "test2" },
          uuidStack: ["123", "456"],
          funcData: { funcName: "a", funcIndex: 1 },
          eventUUID: "456",
          state: { absIndex: 0 },
        },
      ],
      b: [
        {
          name: "b",
          payload: { test1: "test1" },
          uuidStack: ["123", "456", "789"],
          funcData: { funcName: "b", funcIndex: 2 },
          eventUUID: "789",
          state: { absIndex: 1 },
        },
        {
          name: "b",
          payload: { test4: "test4" },
          uuidStack: ["123", "456", "789", "101112", "131415"],
          funcData: { funcName: "b", funcIndex: 4 },
          eventUUID: "131415",
          state: { absIndex: 4 },
        },
      ],

      c: [
        {
          name: "c",
          payload: { test3: "test3" },
          uuidStack: ["123", "456", "789", "101112"],
          funcData: { funcName: "c", funcIndex: 3 },
          eventUUID: "101112",
          state: { absIndex: 2 },
        },
      ],
      d: [
        {
          name: "d",
          payload: { test4: "test4" },
          uuidStack: ["123", "456", "789", "101112", "131415"],
          funcData: { funcName: "d", funcIndex: 4 },
          eventUUID: "131415",
          state: { absIndex: 3 },
        },
      ],
    };
    args = [
      0,
      {
        event: eventBus,
        eventUUID: "789",
        eventUUIDs: ["123", "456", "789"],
        funcData: { funcName: "b", funcIndex: 2 },
      },
    ];
  });

  test("getEvent", () => {
    const event = getEventBus(args);
    expect(event).toBeDefined();
    expect(event).not.toBeNull();
    const eventUUID = getEventUUID(args);
    expect(eventUUID).toBe("789");
  });
  test("getEventsForUUID", () => {
    const events = filterEventsByUUID(eventBus, "b", "123", getFuncData(args));
    expect(events.length).toBe(1);
    expect(events[0].name).toBe("b");
  });

  test("getAllEvents", () => {
    const events = filterEventsByUUID(eventBus, "*", "123", getFuncData(args));
    expect(events.length).toBe(3);
  });

  test("filterEventsByState", () => {
    const events = filterEventsByState(eventBus, "b", { absIndex: 1 });
    expect(events.length).toBe(1);
    expect(events[0].name).toBe("b");
  });
  test("filterEventsByPayload", () => {
    const events = filterEventsByPayload(eventBus, "b", { test1: "test1" });
    expect(events.length).toBe(1);
    expect(events[0].name).toBe("b");
  });

  test("filterEventsByName", () => {
    const events = filterEventsByName(eventBus, "b");
    expect(events.length).toBe(2);
  });
  test("filterEventsByName *", () => {
    const events = filterEventsByName(eventBus, "*");
    expect(events.length).toBe(5);
  });
  test("withEventBus", () => {
    return withEventBus(args, (eventBusGot) => {
      expect(eventBusGot).toBe(eventBus);
    });
  });

  test("withEvents", () => {
    return withEvents(args, (bus, uuid) => {
      expect(bus).toBe(eventBus);
      expect(uuid).toBe("789");
    });
  });
  test("withEventNames", () => {
    return withEventNames(args, ["a", "b", "c", "d"], (events) => {
      expect(events.a).toBeUndefined();

      expect(events.b).toBeDefined();
      expect(events.b).not.toBeNull();
      expect(events.b.payload.test1).toBeDefined();

      expect(events.c).toBeDefined();
      expect(events.c).not.toBeNull();

      expect(events.d).toBeDefined();
      expect(events.d).not.toBeNull();
    });
  });
});
let ctx;
let eventRef;

describe("event bus methods", () => {
  beforeAll(() => {
    eventBus = new EventBus();
    ctx = { eventBus, eventUUID: "test", eventUUIDs: ["test1", "test"] };
  });

  describe("3 emits", () => {
    beforeAll(() => {
      eventBus.emit("testFunc", ctx, { testValue: 42 });
      eventBus.emit("testFunc2", ctx, { testValue: 42 });
      eventBus.emit("testFunc3", ctx, { testValue: 42 });
    });

    test("should have 3 events", () => {
      const firstEvents = eventBus.events["testFunc"];
      expect(firstEvents.length).toBe(1);

      const secondEvents = eventBus.events["testFunc2"];
      expect(secondEvents.length).toBe(1);

      const thirdEvents = eventBus.events["testFunc3"];
      expect(thirdEvents.length).toBe(1);
      expect(Object.values(eventBus.events).length).toBe(3);
    });
  });

  describe("3 emitOnce", () => {
    beforeAll(() => {
      eventBus = new EventBus();
      eventBus.emitOnce("testFunc", ctx);
      eventBus.emitOnce("testFunc", ctx);
      eventBus.emitOnce("testFunc", ctx);
    });

    test("expect 1 event", () => {
      expect(eventBus.events["testFunc"].length).toBe(1);
    });
  });
  describe("3 emitOne", () => {
    beforeAll(() => {
      eventBus = new EventBus();
      eventBus.emitOne("testFunc", ctx, { scopeKey: "red" });
      eventBus.emitOne("testFunc2", ctx, { scopeKey: "red" });
      eventRef = eventBus.emitOne("testFunc3", ctx, { scopeKey: "red" });
    });

    test("expect 1 event", () => {
      const allEvents = filterEventsByName(eventBus, "*");
      expect(allEvents.length).toBe(1);
      expect(allEvents[0]).toBe(eventRef);
    });
  });
});

describe("event bus errors", () => {
  test("should throw error if event bus is not found", () => {
    expect(() => withEventBus([], () => {})).toThrow("Event bus not found");
  });
  test("should throw error if event uuid is not found", () => {
    expect(() => withEvents([{ event: new EventBus() }], () => {})).toThrow(
      "Event UUID not found"
    );
  });
});
