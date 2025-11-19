import { EventContext } from "../index.types";

type FilterOptions = {
  includeOverwritten?: boolean;
  includeRecursive?: boolean;
};

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
  emitOne(
    name: string,
    uuid: { eventUUIDs?: string[] },
    key: any,
    payload?: any
  ): IEvent;
  emitOnce(
    name: string,
    ctx: { eventUUID?: string; eventUUIDs?: string[]; funcData?: IFuncData },
    payload?: any
  ): IEvent | null;

  getAllEventsForUUID(uuid: string): IEvent[];
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

  overwrittenEvents: {
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
    for (const event of exisitingEvents) {
      if (!this.overwrittenEvents[event.name]) {
        this.overwrittenEvents[event.name] = [];
      }
      this.overwrittenEvents[event.name].push(event);
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

  getAllEventsForUUID(uuid: string): IEvent[] {
    let events = Object.values(this.events).flat();

    events = events.concat(Object.values(this.overwrittenEvents).flat());

    return filterEventsByUUID(events, uuid, undefined, {
      includeOverwritten: true,
      includeRecursive: true,
    });
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
  state: any,
  options?: FilterOptions
): IEvent | null {
  const events = filterEventsByName(eventBus, name, options);
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
  payload: any,
  options?: FilterOptions
): IEvent | null {
  const events = filterEventsByName(eventBus, name, options);
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
  state: any,
  options?: FilterOptions
): IEvent | null {
  const events = filterEventsByName(eventBus, name, options);
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
  funcData?: FuncData,
  options?: FilterOptions
): IEvent | null {
  let events = filterEventsByName(eventBus, name, options);

  events = events.filter((event: IEvent) => event.uuidStack.includes(uuid));
  if (funcData && !options?.includeRecursive) {
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

  // Helper function to check if stackB extends stackA (stackA is a prefix of stackB)
  const isExtension = (stackA: string[], stackB: string[]): boolean => {
    if (stackA.length >= stackB.length) return false;
    return stackA.every((uuid, index) => uuid === stackB[index]);
  };

  // Filter out events that are recursive calls (their uuidStack extends another event's stack)
  const nonRecursiveEvents = events.filter((event) => {
    // Check if this event is a recursive call of another event
    const isRecursive = events.some((otherEvent) => {
      return (
        otherEvent !== event &&
        otherEvent.funcData.funcIndex < event.funcData.funcIndex &&
        isExtension(otherEvent.uuidStack, event.uuidStack)
      );
    });
    return !isRecursive;
  });

  return nonRecursiveEvents;
}

function filterEventsByState(
  eventBus: EventBus,
  name: string,
  state: any,
  options?: FilterOptions
): IEvent[] {
  const events = filterEventsByName(eventBus, name, options);

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
  payload: any,
  options?: FilterOptions
): IEvent[] {
  const events = filterEventsByName(eventBus, name, options);
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
  funcData?: FuncData,
  options?: FilterOptions
): IEvent[] {
  events = events.filter((event: IEvent) => event.uuidStack.includes(uuid));

  if (funcData && !options?.includeRecursive)
    events = filterRecursion(events, funcData);
  return events;
}

function filterEvents(
  eventBus: EventBus,
  name: string,
  payload: any,
  state: any,
  options?: FilterOptions
): IEvent[] {
  let events = filterEventsByName(eventBus, name, options);
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
  ) => any,
  options?: FilterOptions
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
    events.push(...filterEventsByName(eventBus, eventName, options));
  }
  // Fetch all events into a record keyed by their name
  const eventsMap: Record<string, IEvent> = {};
  const filteredEvents = filterEventsByUUID(
    events,
    eventUUID,
    funcData,
    options
  );

  for (const event of filteredEvents) {
    eventsMap[event.name] = event;
  }
  return func(eventsMap, eventBus, eventUUID);
}
function withEventNamesList(
  args: any[],
  eventNames: string[],
  func: (
    events: Record<string, IEvent[]>,
    eventBus: EventBus,
    eventUUID: string
  ) => any,
  options?: FilterOptions
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

  const eventsMap: Record<string, IEvent[]> = {};
  const events: IEvent[] = [];
  for (const eventName of eventNames) {
    eventsMap[eventName] = [];
    events.push(...filterEventsByName(eventBus, eventName, options));
  }
  const filteredEvents = filterEventsByUUID(
    events,
    eventUUID,
    funcData,
    options
  );

  for (const event of filteredEvents) {
    eventsMap[event.name].push(event);
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

function filterEventsByName(
  eventBus: EventBus,
  name: string,
  options?: FilterOptions
) {
  let events =
    name === "*"
      ? Object.values(eventBus.events).flat()
      : eventBus.events[name];

  if (options?.includeOverwritten) {
    if (name === "*")
      events = events.concat(Object.values(eventBus.overwrittenEvents).flat());
    else events = events.concat(eventBus.overwrittenEvents[name] || []);
  }
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
  withEventNamesList,
};
