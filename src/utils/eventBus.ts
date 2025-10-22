type IEvent = {
  name: string;
  payload?: any;
  state?: any;
  callIndex: number;
};

type IEventBus = {
  events: {
    [name: string]: IEvent[];
  };

  emit(name: string, payload: any): void;
  incrementCallIndex(): void;
  getEventsForCallIndex(callIndex: number): IEvent[];
};

class EventBus implements IEventBus {
  private callIndex: number = 0;

  constructor(
    callIndex: number = 0,
    events: { [name: string]: IEvent[] } = {}
  ) {
    this.callIndex = callIndex;
    this.events = events;
  }
  events: {
    [name: string]: IEvent[];
  } = {};

  uninitialized: IEvent[] = [];

  incrementCallIndex() {
    this.callIndex++;
  }
  getCallIndex(): number {
    return this.callIndex;
  }
  emit(name: string, payload?: any) {
    const newEvent: IEvent = {
      name,
      payload,
      callIndex: this.callIndex,
    };
    if (!this.events[name]) {
      this.events[name] = [];
    }
    this.events[name].push(newEvent);
    this.uninitialized.push(newEvent);
  }

  getEventsForCallIndex(callIndex: number): IEvent[] {
    return Object.values(this.events)
      .flat()
      .filter((event: IEvent) => event.callIndex === callIndex);
  }
}

function getEventBus(args: any[]): EventBus | null {
  for (const arg of args) {
    if (arg instanceof EventBus) {
      return arg;
    }
    if (typeof arg === "object") {
      if ("events" in arg) {
        return arg.events;
      }
      if ("eventBus" in arg) {
        return arg.eventBus;
      }
    }
  }
  return null;
}

function getEventByState(
  eventBus: EventBus,
  name: string,
  state: any
): IEvent | null {
  const events = filterEventsByState(eventBus, name, state);
  return events[0] || null;
}

function getEventByPayload(
  eventBus: EventBus,
  name: string,
  payload: any
): IEvent | null {
  const events = filterEventsByPayload(eventBus, name, payload);
  return events[0] || null;
}

function getEventByPayloadAndState(
  eventBus: EventBus,
  name: string,
  payload: any,
  state: any
): IEvent | null {
  const events = filterEventsByPayloadAndState(eventBus, name, payload, state);
  return events[0] || null;
}

function filterEventsByState(
  eventBus: EventBus,
  name: string,
  state: any
): IEvent[] {
  const events = eventBus.events[name];
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
  const events = eventBus.events[name];
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

function filterEventsByPayloadAndState(
  eventBus: EventBus,
  name: string,
  payload: any,
  state: any
): IEvent[] {
  let events = eventBus.events[name];
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

export {
  getEventBus,
  EventBus,
  IEvent,
  IEventBus,
  getEventByState,
  getEventByPayload,
  getEventByPayloadAndState,
};
