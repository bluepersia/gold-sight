import { expect } from "vitest";
import AssertionMaster from "../../../../src";
import { master } from "./master";
import { AssertionChain } from "../../../../src/index.types";
import { a, b, c, d, e, f, wrap } from "./logic";
import * as logic from "./logic";
import { Master, MathState } from "../index.types";

const aDefaultAssertions: AssertionChain<MathState, [], number[]> = {
  a: (state, args, result) => {
    expect(result).toEqual(master.finalResults);
  },
};
const bDefaultAssertions: AssertionChain<MathState, number[], number[]> = {
  b: (state, args, result) => {
    expect(result[state.absIndex]).toBe(master.finalResults[state.absIndex]);
    expect(result[state.absIndex]).toBe(master.addResults[state.addAbsIndex]);
  },
};
const cDefaultAssertions: AssertionChain<MathState, number[], number[]> = {
  c: (state, args, result) => {
    expect(result[state.absIndex]).toBe(master.finalResults[state.absIndex]);
    expect(result[state.absIndex]).toBe(master.subResults[state.subAbsIndex]);
  },
};

const dDefaultAssertions: AssertionChain<MathState, number[], number[]> = {
  d: (state, args, result) => {
    expect(result[state.absIndex]).toBe(master.finalResults[state.absIndex]);
    expect(result[state.absIndex]).toBe(master.addResults[state.addAbsIndex]);
  },
};
const eDefaultAssertions: AssertionChain<MathState, number[], number[]> = {
  e: (state, args, result) => {
    expect(result[state.absIndex]).toBe(master.finalResults[state.absIndex]);
    expect(result[state.absIndex]).toBe(master.multResults[state.multAbsIndex]);
  },
};
const fDefaultAssertions: AssertionChain<MathState, number[], number[]> = {
  f: (state, args, result) => {
    expect(result[state.absIndex]).toBe(master.finalResults[state.absIndex]);
    expect(
      result[state.absIndex],
      JSON.stringify({
        absIndex: state.absIndex,
        divAbsIndex: state.divAbsIndex,
      })
    ).toBe(master.divResults[state.divAbsIndex]);
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

class Math2Assertions extends AssertionMaster<MathState, Master> {
  constructor() {
    super(assertionChains, "math2");
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

  a = this.wrapTopFn(a, "a");

  b = this.wrapFn(b, "b", {
    post: (state) => {
      state.absIndex++;
      state.addAbsIndex++;
    },
  });

  c = this.wrapFn(c, "c", {
    post: (state) => {
      state.absIndex++;
      state.subAbsIndex++;
    },
  });

  d = this.wrapFn(d, "d", {
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
    post: (state) => {
      state.absIndex++;
      state.divAbsIndex++;
    },
  });
}

const assertionMaster = new Math2Assertions();

master.assertionMaster = assertionMaster;

function wrapAll() {
  wrap(
    assertionMaster.a,
    assertionMaster.b,
    assertionMaster.c,
    assertionMaster.d,
    assertionMaster.e,
    assertionMaster.f
  );
  master.topFunc = logic.a;
  master.subfunc = logic.b;
}

export { assertionMaster, wrapAll, assertionChains };
