import { describe, test, expect, vi } from "vitest";
import { masterCollection } from "./masterCollection";
import { a } from "./1/logic";
import { getQueue } from "../../../src";
import { AssertionBlueprint } from "../../../src/index.types";

describe("assert queue", () => {
  test.each(masterCollection)("set queue", (master) => {
    const { assertionMaster } = master;

    assertionMaster.master = master;

    assertionMaster.resetState();
    assertionMaster.setQueue(new Map(master.finalQueue));

    const assertionQueue = getQueue(assertionMaster.globalKey);
    for (const [key, value] of assertionQueue.entries()) {
      const assertionChain = master.assertionChains![value.name];
      for (const [descriptor, assertion] of Object.entries(assertionChain)) {
        vi.spyOn(assertionChain, descriptor as keyof typeof assertion);
      }
    }

    assertionMaster.assertQueue();
    for (const [key, value] of assertionQueue.entries()) {
      for (const [descriptor, assertion] of Object.entries(
        master.assertionChains![value.name]
      )) {
        expect(assertion).toHaveBeenCalledWith(
          value.state,
          value.result,
          value.args
        );
      }
    }
  });
});

describe("post ops", () => {
  test.each(masterCollection)("run post ops", (master) => {
    const { assertionMaster } = master;

    assertionMaster.master = master;

    assertionMaster.setQueue(new Map());

    let finalQueue = new Map(master.finalQueue);
    for (const [key, value] of finalQueue.entries()) {
      finalQueue.set(key, {
        ...value,
        state: { ...value.state, ...assertionMaster.newState() },
      });
    }
    assertionMaster.setQueue(new Map(master.finalQueue));

    let assertionQueue = getQueue(assertionMaster.globalKey);
    for (const [key, value] of assertionQueue.entries()) {
      if (value.postOp) vi.spyOn(value, "postOp");
    }
    assertionMaster.runPostOps();

    for (const [key, value] of assertionQueue.entries()) {
      if (value.postOp) expect(value.postOp).toHaveBeenCalledTimes(1);
    }

    assertionQueue = stripQueue(assertionQueue);
    const masterFinalQueue = stripQueue(master.finalQueue);

    expect(assertionQueue).toEqual(masterFinalQueue);
  });
});

describe("wrapped function call", () => {
  test.each(masterCollection)(
    "run sub func and assemble assertions",
    (master) => {
      const { assertionMaster } = master;

      assertionMaster.master = master;

      assertionMaster.setQueue(new Map());

      assertionMaster.resetState();
      assertionMaster.state!.funcIndex = 1;

      master.subfunc([]);

      let queue = new Map(getQueue(assertionMaster.globalKey));

      queue = stripQueue(queue);

      let masterQueue = new Map(master.finalQueue);
      masterQueue.delete(0);

      masterQueue = stripQueue(masterQueue);

      for (const [key, value] of masterQueue.entries()) {
        masterQueue.set(key, {
          ...value,
          state: {
            ...assertionMaster.newState(),
            funcIndex: undefined,
            master: undefined,
          },
        });
      }
      expect(queue).toEqual(masterQueue);
    }
  );
});

describe("top level function", () => {
  test.each(masterCollection)("run and generate assertions", (master) => {
    const { assertionMaster, topFunc } = master;

    assertionMaster.master = master;

    vi.spyOn(assertionMaster, "runPostOps");
    vi.spyOn(assertionMaster, "resetState");

    topFunc();

    expect(assertionMaster.runPostOps).toHaveBeenCalledTimes(1);
    expect(assertionMaster.resetState).toHaveBeenCalledTimes(1);

    const queue = getQueue(assertionMaster.globalKey);

    expect(stripQueue(queue)).toEqual(stripQueue(master.finalQueue));

    const queueCopy = new Map(queue);

    const queueIndexes = Array.from(queue.keys()).sort((a, b) => a - b);
    for (const queueIndex of queueIndexes) {
      const { name, result, args, state } = queue.get(queueIndex)!;

      const assertions = master.assertionChains![name];
      for (const [key, assertion] of Object.entries(assertions)) {
        const methodName = key as keyof typeof assertion;
        vi.spyOn(assertions, methodName);
      }
    }

    assertionMaster.assertQueue();

    for (const queueIndex of queueIndexes) {
      const { name, result, args, state } = queueCopy.get(queueIndex)!;

      const assertions = master.assertionChains![name];
      for (const [key, assertion] of Object.entries(assertions)) {
        expect(assertion).toHaveBeenCalledWith(state, args, result);
      }
    }
  });

  test.each(masterCollection)("run assertions correctly", (master) => {
    const { assertionMaster, topFunc } = master;

    assertionMaster.master = master;

    topFunc();

    const queue = getQueue(assertionMaster.globalKey);
    const queueCopy = new Map(queue);

    const queueIndexes = Array.from(queue.keys()).sort((a, b) => a - b);
    for (const queueIndex of queueIndexes) {
      const { name, result, args, state } = queue.get(queueIndex)!;

      const assertions = master.assertionChains![name];
      for (const [key, assertion] of Object.entries(assertions)) {
        const methodName = key as keyof typeof assertion;
        vi.spyOn(assertions, methodName);
      }
    }

    assertionMaster.assertQueue();

    for (const queueIndex of queueIndexes) {
      const { name, result, args, state } = queueCopy.get(queueIndex)!;

      const assertions = master.assertionChains![name];
      for (const [key, assertion] of Object.entries(assertions)) {
        expect(assertion).toHaveBeenCalledWith(state, args, result);
      }
    }
  });
});

function stripQueue(map: Map<number, AssertionBlueprint>) {
  return new Map(
    Array.from(map.entries()).map(([key, value]) => {
      return [
        key,
        {
          ...value,
          postOp: undefined,
          state: { ...value.state, master: undefined, funcIndex: undefined },
        },
      ];
    })
  );
}
