import { describe, test, expect } from "vitest";
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
} from "../src/utils/eventBus";

const eventBus = new EventBus();
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

describe("eventHelpers", () => {
  const args = [
    0,
    {
      event: eventBus,
      eventUUID: "789",
      eventUUIDs: ["123", "456", "789"],
      funcData: { funcName: "b", funcIndex: 2 },
    },
  ];
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
