import { expect } from "vitest";
import AssertionMaster from "../../../src/index";
import { AssertionChainForFunc } from "../../../src/index.types";
import { a, b, c, wrap } from "./logic";
import { Master } from "./master";

type AsyncState = {
  index: number;
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

const defaultAssertions = {
  a: aAssertionChain,
  b: bAssertionChain,
  c: cAssertionChain,
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
}
const assertionMaster = new AsyncAssertions();
function wrapAll() {
  wrap(assertionMaster.a, assertionMaster.b, assertionMaster.c);
}

export { assertionMaster, wrapAll };
