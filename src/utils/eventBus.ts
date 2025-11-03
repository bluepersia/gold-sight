type IEvent = {
  name: string;
  payload?: any;
  id?: string;
  state?: any;
  uuid: string;
};

type IEventBus = {
  events: {
    [name: string]: IEvent[];
  };

  isEventBus: boolean;
  emit(name: string, payload: any): void;
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

  emitOnceEvents: {
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
    uuid: string | { eventUUID?: string },
    payload?: any
  ): IEvent {
    const uuidValue = typeof uuid === "string" ? uuid : uuid.eventUUID;
    if (!payload) payload = {};

    const newEvent: IEvent = {
      name,
      payload,
      uuid: uuidValue!,
    };
    let events = this.events[name];
    if (!events) {
      events = this.events[name] = [];
    }
    events.push(newEvent);
    this.uninitialized.push(newEvent);
    return newEvent;
  }

  emitOnce(
    name: string,
    uuid: string | { eventUUID?: string },
    payload?: any
  ): IEvent | null {
    const uuidValue = typeof uuid === "string" ? uuid : uuid.eventUUID;
    let emitOnceEvents = this.emitOnceEvents[name];
    if (!emitOnceEvents) this.emitOnceEvents[name] = emitOnceEvents = [];

    if (emitOnceEvents.find((event) => event.uuid === uuidValue)) return null;

    emitOnceEvents.push({
      name,
      payload,
      uuid: uuidValue!,
    });

    return this.emit(name, uuid, payload);
  }

  getEventsForUUID(uuid: string): IEvent[] {
    return Object.values(this.events)
      .flat()
      .filter((event: IEvent) => event.uuid === uuid);
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
  const event = eventBus.events[name]?.find((e) => {
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
  const event = eventBus.events[name]?.find((e) => {
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
  const event = eventBus.events[name]?.find((e) => {
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

function getEventByUUID(
  eventBus: EventBus,
  name: string,
  uuid: string
): IEvent | null {
  const event = eventBus.events[name]?.find((e) => e.uuid === uuid);
  return event || null;
}

function filterEventsByState(
  eventBus: EventBus,
  name: string,
  state: any
): IEvent[] {
  const events =
    name === "*"
      ? Object.values(eventBus.events).flat()
      : eventBus.events[name];
  if (!events) {
    return [];
  }
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
  const events =
    name === "*"
      ? Object.values(eventBus.events).flat()
      : eventBus.events[name];
  if (!events) {
    return [];
  }
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
  eventBus: EventBus,
  name: string,
  uuid: string
): IEvent[] {
  const events =
    name === "*"
      ? Object.values(eventBus.events).flat()
      : eventBus.events[name];
  if (!events) {
    return [];
  }
  return events.filter((event: IEvent) => event.uuid === uuid);
}

function filterEvents(
  eventBus: EventBus,
  name: string,
  payload: any,
  state: any
): IEvent[] {
  let events =
    name === "*"
      ? Object.values(eventBus.events).flat()
      : eventBus.events[name];
  if (!events) {
    return [];
  }
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
  func: (eventBus: EventBus, ...args: any[]) => any
): (...args: any[]) => any {
  const eventBus = getEventBus(args);
  if (!eventBus) {
    throw new Error("Event bus not found");
  }
  return func(eventBus, ...args);
}

function withEvents(
  args: any[],
  func: (eventBus: EventBus, eventUUID: string, ...args: any[]) => any
): (...args: any[]) => any {
  const eventBus = getEventBus(args);
  const eventUUID = getEventUUID(args);
  if (!eventBus) {
    throw new Error("Event bus not found");
  }
  if (!eventUUID) {
    throw new Error("Event UUID not found");
  }
  return func(eventBus, eventUUID, ...args);
}
function withEventNames(
  args: any[],
  eventNames: string[],
  func: (events: Record<string, IEvent>, ...args: any[]) => any
): (...args: any[]) => any {
  const eventBus = getEventBus(args);
  const eventUUID = getEventUUID(args);

  if (!eventBus) {
    throw new Error("Event bus not found");
  }
  if (!eventUUID) {
    throw new Error("Event UUID not found");
  }

  // Fetch all events into a record keyed by their name
  const events: Record<string, IEvent> = {};
  for (const name of eventNames) {
    const event = getEventByUUID(eventBus, name, eventUUID);
    if (event) {
      events[name] = event;
    }
  }

  return func(events, ...args);
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
};
