import { expect } from "vitest";
import AssertionMaster from "../../../../src";
import { master } from "./master";
import { AssertionChain } from "../../../../src/index.types";
import { a, b, c, d, e, wrap, c2 } from "./logic";
import * as logic from "./logic";
import { Master, MathState } from "../index.types";
import {
  EventBus,
  filterEventsByPayload,
  filterEventsByState,
  getEventBus,
  getEventByState,
} from "../../../../src/utils/eventBus";

const aDefaultAssertions: AssertionChain<MathState, [EventBus], number[]> = {
  a: (state, args, result) => {
    const eventBus = getEventBus(args)!;
    if (eventBus) {
      const events = filterEventsByState(eventBus, "a", {
        absIndex: state.absIndex,
      });
      expect(events.length).toBe(1);
      const [event] = events;
      expect(event?.state.absIndex).toBe(state.absIndex);
    }
    expect(result).toEqual(master.finalResults);
    return true;
  },
};
const bDefaultAssertions: AssertionChain<
  MathState,
  [number[], EventBus],
  number[]
> = {
  b: (state, args, result) => {
    const eventBus = getEventBus(args);
    if (eventBus) {
      const events = filterEventsByPayload(eventBus, "b", {
        b: true,
      });
      expect(events.length).toBe(2);
      for (const event of events) {
        expect(event.state.absIndex).toBe(state.absIndex);
      }
    }
    expect(result[state.absIndex]).toBe(
      master.finalResults[state.absIndex] * 2
    );
    expect(result[state.absIndex]).toBe(
      master.addResults[state.addAbsIndex] * 2
    );
    return true;
  },
};
const cDefaultAssertions: AssertionChain<
  MathState,
  [number[], EventBus],
  number[]
> = {
  c: (state, args, result) => {
    const eventBus = getEventBus(args);
    if (eventBus) {
      const event = getEventByState(eventBus, "c", {
        absIndex: state.absIndex,
      });
      expect(event).toBeDefined();
      expect(event).not.toBeNull();
      expect(event?.state.absIndex).toBe(state.absIndex);
    }
    expect(result[state.absIndex]).toBe(master.finalResults[state.absIndex]);
    expect(result[state.absIndex]).toBe(master.subResults[state.subAbsIndex]);
    return true;
  },
};

const c2DefaultAssertions: AssertionChain<
  MathState,
  [number[], EventBus],
  number[]
> = {
  c2: (state, args, result) => {
    expect(result[state.absIndex]).toBe(master.finalResults[state.absIndex]);

    return true;
  },
};
const dDefaultAssertions: AssertionChain<
  MathState,
  [number[], EventBus],
  number[]
> = {
  d: (state, args, result) => {
    const eventBus = getEventBus(args);
    if (eventBus) {
      const event = getEventByState(eventBus, "d", {});
      expect(event).toBeNull();
    }
    expect(result[state.absIndex]).toBe(master.finalResults[state.absIndex]);
    expect(result[state.absIndex]).toBe(master.addResults[state.addAbsIndex]);

    return true;
  },
};
const eDefaultAssertions: AssertionChain<
  MathState,
  [number[], EventBus],
  number[]
> = {
  e: (state, args, result) => {
    const eventBus = getEventBus(args);
    if (eventBus) {
      const event = getEventByState(
        eventBus,
        "e",
        {
          absIndex: state.absIndex,
        },
        {
          includeOverwritten: true,
        }
      );
      expect(event).toBeDefined();
      expect(event).not.toBeNull();

      expect(event?.state.absIndex).toBe(state.absIndex);
    }
    expect(result[state.absIndex]).toBe(master.finalResults[state.absIndex]);
    expect(result[state.absIndex]).toBe(master.multResults[state.multAbsIndex]);

    return true;
  },
};

const assertionChains = {
  a: aDefaultAssertions,
  b: bDefaultAssertions,
  c: cDefaultAssertions,
  d: dDefaultAssertions,
  e: eDefaultAssertions,
};

master.assertionChains = assertionChains;

class Math1Assertions extends AssertionMaster<MathState, Master> {
  constructor() {
    super(assertionChains, "math1");
  }

  newState(): MathState {
    return {
      absIndex: 0,
      addAbsIndex: 0,
      multAbsIndex: 0,
      subAbsIndex: 0,
      divAbsIndex: 0,
    };
  }

  a = this.wrapTopFn(a, "a") as () => number[];

  b = this.wrapFn(b, "b", {
    resultConverter(result) {
      return result.map((r) => r * 2);
    },
    post: (state) => {
      state.absIndex++;
      state.addAbsIndex++;
    },
  });

  c = this.wrapFn(c, "c", {
    argsConverter(args) {
      const result = [args[0].map((r) => r * 2), args[1]];
      return result;
    },
    post: (state) => {
      state.absIndex++;
      state.subAbsIndex++;
    },
  });

  c2 = this.wrapFn(c2, "c2");

  d = this.wrapFn(d, "d", {
    deepClone: {
      args: true,
      result: true,
    },
    getSnapshot(state, args, result) {
      const snapshotResult = result.map((r) => r * 2);
      return snapshotResult;
    },
    post: (state) => {
      state.absIndex++;
      state.addAbsIndex++;
    },
  });

  e = this.wrapFn(e, "e", {
    post: (state) => {
      state.absIndex++;
      state.multAbsIndex++;
    },
  });
}

const assertionMaster = new Math1Assertions();

master.assertionMaster = assertionMaster;

function wrapAll() {
  wrap(
    assertionMaster.a,
    assertionMaster.b,
    assertionMaster.c,
    assertionMaster.c2,
    assertionMaster.d,
    assertionMaster.e
  );
  master.topFunc = logic.a;
  master.subfunc = logic.b;
}

export { assertionMaster, wrapAll, assertionChains };
