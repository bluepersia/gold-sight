import { expect } from "vitest";
import AssertionMaster from "../../../src/index";
import { AssertionChainForFunc, FuncSpy } from "../../../src/index.types";
import { a, b, c, a2, b2, wrap } from "./logic";
import { Master } from "./master";

type AsyncState = {
  index: number;
  funcSpies?: Record<string, FuncSpy>;
};

const aAssertionChain: AssertionChainForFunc<AsyncState, typeof a> = {
  a: (state, args, result) => {
    expect(state.index).toBe(0);
    expect(result).toEqual([5, 10]);

    return true;
  },
};

const bAssertionChain: AssertionChainForFunc<AsyncState, typeof b> = {
  b: (state, args, result) => {
    expect(state.index).toBe(1);
    expect(result).toEqual(5);
    return true;
  },
};

const cAssertionChain: AssertionChainForFunc<AsyncState, typeof c> = {
  c: (state, args, result) => {
    expect(state.index).toBe(2);
    expect(result).toEqual(10);

    return true;
  },
};

const a2AssertionChain: AssertionChainForFunc<AsyncState, typeof a2> = {
  a2: (state, args, result) => {
    if (Object.keys(state.funcSpies!).length > 0) {
      expect(state.funcSpies!.b2.calls.length).toBe(1);
      expect(state.funcSpies!.b2.calls[0].error).toBeDefined();
      expect(state.funcSpies!.b2.calls[0].error?.message).toBe("test");
    }
    return true;
  },
};

const b2AssertionChain: AssertionChainForFunc<AsyncState, typeof b2> = {
  b2: (state, args, result) => {},
};
const defaultAssertions = {
  a: aAssertionChain,
  b: bAssertionChain,
  c: cAssertionChain,
  a2: a2AssertionChain,
  b2: b2AssertionChain,
};

class AsyncAssertions extends AssertionMaster<AsyncState, Master> {
  constructor() {
    super(defaultAssertions, "async");
  }

  newState(): AsyncState {
    return {
      index: 0,
    };
  }

  a = this.wrapTopFn(a, "a", {
    post: (state, args, result) => {
      state.index++;
      if (!Array.isArray(result)) throw new Error("Result is not an array");
    },
  });
  b = this.wrapFn(b, "b", {
    post: (state, args, result) => {
      state.index++;
      if (typeof result !== "number") throw new Error("Result is not a number");
    },
  });
  c = this.wrapFn(c, "c", {
    post: (state) => {
      state.index++;
    },
  });

  a2 = this.wrapTopFn(a2, "a2");
  b2 = this.wrapFn(b2, "b2", {
    catchError: true,
  });
}
const assertionMaster = new AsyncAssertions();
function wrapAll() {
  wrap(
    assertionMaster.a,
    assertionMaster.b,
    assertionMaster.c,
    assertionMaster.a2,
    assertionMaster.b2
  );
}

export { assertionMaster, wrapAll };
