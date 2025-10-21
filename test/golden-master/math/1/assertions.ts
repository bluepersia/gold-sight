import { expect } from "vitest";
import AssertionMaster from "../../../../src";
import { master } from "./master";
import { AssertionChain } from "../../../../src/index.types";
import { a, b, c, d, e, wrap, c2 } from "./logic";
import * as logic from "./logic";
import { Master, MathState } from "../index.types";

const aDefaultAssertions: AssertionChain<MathState, [], number[]> = {
  a: (state, args, result) => {
    expect(result).toEqual(master.finalResults);
    return true;
  },
};
const bDefaultAssertions: AssertionChain<MathState, number[], number[]> = {
  b: (state, args, result) => {
    expect(result[state.absIndex]).toBe(master.finalResults[state.absIndex]);
    expect(result[state.absIndex]).toBe(master.addResults[state.addAbsIndex]);
    return true;
  },
};
const cDefaultAssertions: AssertionChain<MathState, number[], number[]> = {
  c: (state, args, result) => {
    expect(result[state.absIndex]).toBe(master.finalResults[state.absIndex]);
    expect(result[state.absIndex]).toBe(master.subResults[state.subAbsIndex]);
    return true;
  },
};

const c2DefaultAssertions: AssertionChain<MathState, number[], number[]> = {
  c2: (state, args, result) => {
    expect(result[state.absIndex]).toBe(master.finalResults[state.absIndex]);

    return true;
  },
};
const dDefaultAssertions: AssertionChain<MathState, number[], number[]> = {
  d: (state, args, result) => {
    expect(result[state.absIndex]).toBe(master.finalResults[state.absIndex]);
    expect(result[state.absIndex]).toBe(master.addResults[state.addAbsIndex]);

    return true;
  },
};
const eDefaultAssertions: AssertionChain<MathState, number[], number[]> = {
  e: (state, args, result) => {
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

  c2 = this.wrapFn(c2, "c2");

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
