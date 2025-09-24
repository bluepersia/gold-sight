import { expect } from "vitest";
import AssertionMaster from "../../../../src";
import { master } from "./master";
import { AssertionChain, State } from "../../../../src/index.types";
import { a, b, c, d, e, wrap } from "./logic";

type Math1State = State & {
  absIndex: number;
  addAbsIndex: number;
  multAbsIndex: number;
  subAbsIndex: number;
  divAbsIndex: number;
  master: typeof master;
};

let state = newState();
function newState() {
  return {
    funcIndex: 0,
    absIndex: 0,
    addAbsIndex: 0,
    multAbsIndex: 0,
    subAbsIndex: 0,
    divAbsIndex: 0,
    master,
  };
}

const aDefaultAssertions = {
  a: (state, result) => {
    expect(result).toEqual(master.finalResults);
  },
};
const bDefaultAssertions = {
  b: (state, result) => {
    expect(result[state.absIndex]).toBe(master.finalResults[state.absIndex]);
    expect(result[state.absIndex]).toBe(master.addResults[state.addAbsIndex]);
  },
};
const cDefaultAssertions = {
  c: (state, result) => {
    console.log(state.absIndex, state.subAbsIndex);
    expect(result[state.absIndex]).toBe(master.finalResults[state.absIndex]);
    expect(result[state.absIndex]).toBe(master.subResults[state.subAbsIndex]);
  },
};
const dDefaultAssertions = {
  d: (state, result) => {
    expect(result[state.absIndex]).toBe(master.finalResults[state.absIndex]);
    expect(result[state.absIndex]).toBe(master.addResults[state.addAbsIndex]);
  },
};
const eDefaultAssertions = {
  e: (state, result) => {
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

class Math1Assertions extends AssertionMaster<Math1State> {
  constructor() {
    super(state, assertionChains, "math1");
  }

  a = this.wrapTopFn(a, {
    pre: () => {
      state = newState();
    },
  });

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

function wrapAll() {
  wrap(
    assertionMaster.a,
    assertionMaster.b,
    assertionMaster.c,
    assertionMaster.d,
    assertionMaster.e
  );
}

export { assertionMaster, wrapAll };
