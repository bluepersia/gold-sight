type IEvent = {
  name: string;
  payload: any;
  state?: any;
};

type IEventBus = {
  events: {
    [name: string]: IEvent[];
  };

  emit(name: string, payload: any): void;
  getUninitializedEvents(): IEvent[];
};

class EventBus implements IEventBus {
  events: {
    [name: string]: IEvent[];
  } = {};

  uninitialized: IEvent[] = [];
  emit(name: string, payload: any) {
    const newEvent: IEvent = {
      name,
      payload,
    };
    if (!this.events[name]) {
      this.events[name] = [];
    }
    this.events[name].push(newEvent);
    this.uninitialized.push(newEvent);
  }

  getUninitializedEvents(): IEvent[] {
    const uninitializedEvents = this.uninitialized;
    this.uninitialized = [];
    return uninitializedEvents;
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

function getFirstEventByState(
  eventBus: EventBus,
  name: string,
  state: any
): IEvent | null {
  const events = filterEventsByState(eventBus, name, state);
  return events[0] || null;
}

function getFirstEventByPayload(
  eventBus: EventBus,
  name: string,
  payload: any
): IEvent | null {
  const events = filterEventsByPayload(eventBus, name, payload);
  return events[0] || null;
}

function getFirstEventByPayloadAndState(
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
  const events = filterEventsByPayload(eventBus, name, payload);
  return filterEventsByState(eventBus, name, state);
}

export {
  getEventBus,
  EventBus,
  IEvent,
  IEventBus,
  getFirstEventByState,
  getFirstEventByPayload,
  getFirstEventByPayloadAndState,
};
