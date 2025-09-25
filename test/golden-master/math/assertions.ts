import { expect } from "vitest";
import AssertionMaster from "../../../src";
import { master } from "./1/master";
import { AssertionChain } from "../../../src/index.types";
import { a, b, c, d, e, wrap } from "./1/logic";
import { Master } from "./index.types";

type Math1State = {
  absIndex: number;
  addAbsIndex: number;
  multAbsIndex: number;
  subAbsIndex: number;
  divAbsIndex: number;
  master?: Master;
};

const aDefaultAssertions = {
  a: (state, args, result) => {
    expect(result).toEqual(master.finalResults);
  },
};
const bDefaultAssertions = {
  b: (state, args, result) => {
    expect(result[state.absIndex]).toBe(master.finalResults[state.absIndex]);
    expect(result[state.absIndex]).toBe(master.addResults[state.addAbsIndex]);
  },
};
const cDefaultAssertions = {
  c: (state, args, result) => {
    expect(result[state.absIndex]).toBe(master.finalResults[state.absIndex]);
    expect(result[state.absIndex]).toBe(master.subResults[state.subAbsIndex]);
  },
};
const dDefaultAssertions = {
  d: (state, args, result) => {
    expect(result[state.absIndex]).toBe(master.finalResults[state.absIndex]);
    expect(result[state.absIndex]).toBe(master.addResults[state.addAbsIndex]);
  },
};
const eDefaultAssertions = {
  e: (state, args, result) => {
    expect(result[state.absIndex]).toBe(master.finalResults[state.absIndex]);
    expect(result[state.absIndex]).toBe(master.multResults[state.multAbsIndex]);
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

class Math1Assertions extends AssertionMaster<Math1State, Master> {
  constructor() {
    super(assertionChains, "math1");
  }

  newState(): Math1State {
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
}

const assertionMaster = new Math1Assertions();

master.subfunc = assertionMaster.b;
master.assertionMaster = assertionMaster;

function wrapAll() {
  wrap(
    assertionMaster.a,
    assertionMaster.b,
    assertionMaster.c,
    assertionMaster.d,
    assertionMaster.e
  );
}

export { assertionMaster, wrapAll, assertionChains };
