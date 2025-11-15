import { EventContext } from "../index.types";

type IEvent = {
  name: string;
  payload?: any;
  id?: string;
  state?: any;
  uuidStack: string[];
  funcData: IFuncData;
  eventUUID: string;
};

type IFuncData = {
  funcName: string;
  funcIndex: number;
};

type IEventBus = {
  events: {
    [name: string]: IEvent[];
  };

  isEventBus: boolean;
  emit(name: string, payload: any): IEvent;
  getEventsForUUID(uuid: string): IEvent[];
};

class EventBus implements IEventBus {
  public isEventBus: boolean = true;
  private queueIndex: number = 0;
  constructor(
    queueIndex: number = 0,
    events: { [name: string]: IEvent[] } = {}
  ) {
    this.queueIndex = queueIndex;
    this.events = events;
  }
  events: {
    [name: string]: IEvent[];
  } = {};

  uninitialized: IEvent[] = [];

  private emitOnceEvents: {
    [name: string]: IEvent[];
  } = {};

  setQueueIndex(queueIndex: number) {
    this.queueIndex = queueIndex;
  }
  getQueueIndex(): number {
    return this.queueIndex;
  }
  emit(
    name: string,
    ctx: { eventUUID?: string; eventUUIDs?: string[]; funcData?: IFuncData },
    payload?: any
  ): IEvent {
    if (!payload) payload = {};

    const newEvent: IEvent = {
      name,
      payload,
      uuidStack: ctx.eventUUIDs!,
      funcData: ctx.funcData!,
      eventUUID: ctx.eventUUID!,
    };
    let events = this.events[name];
    if (!events) {
      events = this.events[name] = [];
    }
    events.push(newEvent);
    this.uninitialized.push(newEvent);
    return newEvent;
  }

  emitOne(
    name: string,
    uuid: { eventUUIDs?: string[] },
    key: any,
    payload?: any
  ) {
    const exisitingEvents = filterEventsByPayload(this, "*", key);
    for (const [name, events] of Object.entries(this.events)) {
      this.events[name] = events.filter(
        (event) => !exisitingEvents.includes(event)
      );
    }
    if (!payload) payload = {};
    payload = { ...payload, ...key };
    return this.emit(name, uuid, payload);
  }

  emitOnce(
    name: string,
    ctx: { eventUUID?: string; eventUUIDs?: string[]; funcData?: IFuncData },
    payload?: any
  ): IEvent | null {
    let emitOnceEvents = this.emitOnceEvents[name];
    if (!emitOnceEvents) this.emitOnceEvents[name] = emitOnceEvents = [];

    if (
      emitOnceEvents.find((event) => event.uuidStack.includes(ctx.eventUUID!))
    )
      return null;

    emitOnceEvents.push({
      name,
      payload,
      uuidStack: ctx.eventUUIDs!,
      funcData: ctx.funcData!,
      eventUUID: ctx.eventUUID!,
    });

    return this.emit(name, ctx, payload);
  }

  getEventsForUUID(uuid: string): IEvent[] {
    return Object.values(this.events)
      .flat()
      .filter((event: IEvent) => event.uuidStack.includes(uuid));
  }
}

function getEventBus(args: any[]): EventBus | null {
  for (const arg of args) {
    if (arg?.isEventBus) return arg as EventBus;
    if (typeof arg === "object") {
      if ("events" in arg) {
        return arg.events;
      }
      if ("eventBus" in arg) {
        return arg.eventBus;
      }
      if ("event" in arg) {
        return arg.event;
      }
      for (const value of Object.values(arg)) {
        if ((value as any)?.isEventBus) return value as EventBus;
      }
    }
  }
  return null;
}

function getEventUUID(args: any[]): string | undefined {
  for (const arg of args) {
    if (typeof arg === "object" && "eventUUID" in arg) {
      return arg.eventUUID;
    }
  }
  return undefined;
}

function getEventByState(
  eventBus: EventBus,
  name: string,
  state: any
): IEvent | null {
  const events = filterEventsByName(eventBus, name);
  const event = events.find((e) => {
    for (const key in state) {
      if (state[key] !== e.state[key]) {
        return false;
      }
    }
    return true;
  });
  return event || null;
}

function getEventByPayload(
  eventBus: EventBus,
  name: string,
  payload: any
): IEvent | null {
  const events = filterEventsByName(eventBus, name);
  const event = events.find((e) => {
    for (const key in payload) {
      if (payload[key] !== e.payload[key]) {
        return false;
      }
    }
    return true;
  });
  return event || null;
}

function getEvent(
  eventBus: EventBus,
  name: string,
  payload: any,
  state: any
): IEvent | null {
  const events = filterEventsByName(eventBus, name);
  const event = events.find((e) => {
    for (const key in state) {
      if (state[key] !== e.state[key]) {
        return false;
      }
    }
    for (const key in payload) {
      if (payload[key] !== e.payload[key]) {
        return false;
      }
    }
    return true;
  });
  return event || null;
}

type FuncData = { funcName: string; funcIndex: number };

function getEventByUUID(
  eventBus: EventBus,
  name: string,
  uuid: string,
  funcData?: FuncData
): IEvent | null {
  let events = filterEventsByName(eventBus, name);

  events = events.filter((event: IEvent) => event.uuidStack.includes(uuid));
  if (funcData) {
    events = filterRecursion(events, funcData);
  }
  return events[0] || null;
}

function filterRecursion(events: IEvent[], funcData: FuncData): IEvent[] {
  const names = new Set<string>([...events.map((e) => e.funcData.funcName)]);

  events = events.filter((e) => {
    return e.funcData.funcIndex >= funcData.funcIndex;
  });

  let newEvents: IEvent[] = [];
  for (const name of names) {
    newEvents = newEvents.concat(filterRecursionForName(events, name));
  }

  return newEvents;
}

function filterRecursionForName(events: IEvent[], name: string): IEvent[] {
  events = events.filter((e) => e.funcData.funcName === name);

  const firstIndex = Math.min(...events.map((e) => e.funcData.funcIndex));
  const nextIndex =
    Math.min(
      ...events
        .filter((e) => e.funcData.funcIndex > firstIndex)
        .map((e) => e.funcData.funcIndex)
    ) || Infinity;

  const newEvents = events.filter(
    (e) =>
      e.funcData.funcIndex >= firstIndex && e.funcData.funcIndex < nextIndex
  );

  return newEvents;
}

function filterEventsByState(
  eventBus: EventBus,
  name: string,
  state: any
): IEvent[] {
  const events = filterEventsByName(eventBus, name);
  return events.filter((event: IEvent) => {
    for (const key in state) {
      if (state[key] !== event.state[key]) {
        return false;
      }
    }
    return true;
  });
}

function filterEventsByPayload(
  eventBus: EventBus,
  name: string,
  payload: any
): IEvent[] {
  const events = filterEventsByName(eventBus, name);
  return events.filter((event: IEvent) => {
    for (const key in payload) {
      if (payload[key] !== event.payload[key]) {
        return false;
      }
    }
    return true;
  });
}

function filterEventsByUUID(
  events: IEvent[],
  uuid: string,
  funcData?: FuncData
): IEvent[] {
  events = events.filter((event: IEvent) => event.uuidStack.includes(uuid));
  if (funcData) events = filterRecursion(events, funcData);
  return events;
}

function filterEvents(
  eventBus: EventBus,
  name: string,
  payload: any,
  state: any
): IEvent[] {
  let events = filterEventsByName(eventBus, name);
  events = events.filter((event: IEvent) => {
    for (const key in payload) {
      if (payload[key] !== event.payload[key]) {
        return false;
      }
    }
    return true;
  });

  return events.filter((event: IEvent) => {
    for (const key in state) {
      if (state[key] !== event.state[key]) {
        return false;
      }
    }
    return true;
  });
}

function withEventBus(
  args: any[],
  func: (eventBus: EventBus) => any
): (...args: any[]) => any {
  const eventBus = getEventBus(args);
  if (!eventBus) {
    throw new Error("Event bus not found");
  }
  return func(eventBus);
}

function withEvents(
  args: any[],
  func: (eventBus: EventBus, eventUUID: string, funcData: IFuncData) => any
): (...args: any[]) => any {
  const eventBus = getEventBus(args);
  const eventUUID = getEventUUID(args);
  const funcData = getFuncData(args);

  if (!eventBus) {
    throw new Error("Event bus not found");
  }
  if (!eventUUID) {
    throw new Error("Event UUID not found");
  }
  if (!funcData) {
    throw new Error("Function data not found");
  }
  return func(eventBus, eventUUID, funcData);
}
function withEventNames(
  args: any[],
  eventNames: string[],
  func: (
    events: Record<string, IEvent>,
    eventBus: EventBus,
    eventUUID: string
  ) => any
): (...args: any[]) => any {
  const eventBus = getEventBus(args);
  const eventUUID = getEventUUID(args);

  if (!eventBus) {
    throw new Error("Event bus not found");
  }
  if (!eventUUID) {
    throw new Error("Event UUID not found");
  }

  const funcData = getFuncData(args);

  const events: IEvent[] = [];
  for (const eventName of eventNames) {
    events.push(...filterEventsByName(eventBus, eventName));
  }
  // Fetch all events into a record keyed by their name
  const eventsMap: Record<string, IEvent> = {};
  const filteredEvents = filterEventsByUUID(events, eventUUID, funcData);

  for (const event of filteredEvents) {
    eventsMap[event.name] = event;
  }
  return func(eventsMap, eventBus, eventUUID);
}

function getFuncData(args: any[]): IFuncData | undefined {
  for (const arg of args) {
    if (typeof arg === "object" && "funcData" in arg) {
      return arg.funcData;
    }
  }
}

function filterEventsByName(eventBus: EventBus, name: string) {
  let events =
    name === "*"
      ? Object.values(eventBus.events).flat()
      : eventBus.events[name];
  if (!events) {
    return [];
  }

  return events;
}

function makeEventContext() {
  return {
    event: new EventBus(),
    eventUUID: "",
    eventUUIDs: [],
  } as EventContext;
}

export {
  getEventBus,
  EventBus,
  IEvent,
  IEventBus,
  getEventByState,
  getEventByPayload,
  getEvent,
  filterEventsByState,
  filterEventsByPayload,
  filterEvents,
  getEventUUID,
  getEventByUUID,
  filterEventsByUUID,
  withEventBus,
  withEvents,
  withEventNames,
  getFuncData,
  filterEventsByName,
  IFuncData,
  makeEventContext,
};
