import { expect } from "vitest";
import AssertionMaster from "../../../../src";
import { master } from "./master";
import { AssertionChain } from "../../../../src/index.types";
import { a, b, c, d, e, wrap, c2, f } from "./logic";
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
    if (Object.keys(state.funcSpies!).length > 0) {
      expect(state.funcSpies!.b.calls.length).toBe(1);
      expect(state.funcSpies!.b.calls[0].args[0]).toEqual([]);
      expect(state.funcSpies!.b.calls[0].result).toEqual([3, 0, 4, 12]);
      expect(state.funcSpies!.b.calls[0].index).toBeGreaterThan(
        state.funcSpies!.a.calls[0].index
      );
      expect(state.funcSpies!.c.calls.length).toBe(1);
    }
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
    if (Object.keys(state.funcSpies!).length > 0) {
      expect(state.funcSpies!.a).toBeUndefined();
      expect(state.funcSpies!.e.calls.length).toBe(1);
      expect(state.funcSpies!.e.calls[0].args[0]).toEqual([3, 0, 4]);
      expect(state.funcSpies!.e.calls[0].result).toEqual([3, 0, 4, 12]);
      expect(state.funcSpies!.e.calls[0].index).toBeGreaterThan(
        state.funcSpies!.b.calls[0].index
      );
    }
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

    if (Object.keys(state.funcSpies!).length > 0) {
      expect(state.funcSpies!.f.calls.length).toBe(1);
      expect(state.funcSpies!.f.calls[0].error).toBeDefined();
      expect(state.funcSpies!.f.calls[0].error?.message).toBe("test");
    }
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
      const event = getEventByState(eventBus, "e", {});
      expect(event).toBeDefined();
      expect(event).not.toBeNull();

      expect(event?.state.absIndex).toBe(state.absIndex);
    }
    expect(result[state.absIndex]).toBe(master.finalResults[state.absIndex]);
    expect(result[state.absIndex]).toBe(master.multResults[state.multAbsIndex]);

    return true;
  },
};

const fDefaultAssertions: AssertionChain<MathState, [], any> = {
  f: (state, args, result) => {
    expect(result).toBeUndefined();
    return true;
  },
};
const assertionChains = {
  a: aDefaultAssertions,
  b: bDefaultAssertions,
  c: cDefaultAssertions,
  d: dDefaultAssertions,
  e: eDefaultAssertions,
  f: fDefaultAssertions,
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
      return [args[0].map((r) => r * 2, args[1])];
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
      const snapshotResult = result?.map((r) => r * 2);
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

  f = this.wrapFn(f, "f", {
    catchError: true,
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
    assertionMaster.e,
    assertionMaster.f
  );
  master.topFunc = logic.a;
  master.subfunc = logic.b;
}

export { assertionMaster, wrapAll, assertionChains };
