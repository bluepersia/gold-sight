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

export { getEventBus, EventBus, IEvent, IEventBus };
