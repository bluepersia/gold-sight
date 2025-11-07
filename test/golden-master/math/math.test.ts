import { describe, test, expect, vi } from "vitest";
import { masterCollection } from "./masterCollection";
import { a } from "./1/logic";
import { getQueue } from "../../../src";
import { AssertionBlueprint } from "../../../src/index.types";
import { EventBus } from "../../../src/utils/eventBus";

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
      assertionMaster.state!.queueIndex = 1;
      assertionMaster.state!.branchCounter = new Map([[0, 0]]);
      assertionMaster.state!.callStack = [0];

      const eventBus = new EventBus();
      master.subfunc([], {
        eventBus,
        eventUUID: "",
      });

      for (const [eventName, events] of Object.entries(eventBus.events)) {
        expect(events.length).toBe(master.eventMap.get(eventName)!);
      }

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

    const eventBus = new EventBus();
    topFunc({
      eventBus,
      eventUUID: "",
    });

    for (const [key, value] of master.eventMap.entries()) {
      expect(eventBus.events[key].length).toBe(value);
    }

    expect(assertionMaster.runPostOps).toHaveBeenCalledTimes(1);
    expect(assertionMaster.resetState).toHaveBeenCalledTimes(1);

    const queue = getQueue(assertionMaster.globalKey);
    const allAssertions = Array.from(queue.values());

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
        expect(assertion).toHaveBeenCalledWith(
          state,
          args,
          result,
          allAssertions
        );
      }
    }
  });

  test.each(masterCollection)("run assertions correctly", (master) => {
    const { assertionMaster, topFunc } = master;

    assertionMaster.master = master;

    topFunc({
      eventBus: new EventBus(),
      eventUUID: "",
    });

    const queue = getQueue(assertionMaster.globalKey);
    const allAssertions = Array.from(queue.values());
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
        expect(assertion).toHaveBeenCalledWith(
          state,
          args,
          result,
          allAssertions
        );
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
          args: stripEventContext(value.args),
          originalArgs: undefined,
          originalResult: undefined,
          requirement: undefined,
          postOp: undefined,
          snapshot: undefined,
          eventBus: undefined,
          eventUUID: undefined,
          address: undefined,
          state: {
            ...value.state,
            master: undefined,
            callStack: undefined,
            branchCounter: undefined,
            queueIndex: undefined,
            uuidStack: undefined,
          },
        },
      ];
    })
  );

  function emptyEventUUIDs(eventBus: EventBus | undefined) {
    if (!eventBus) return undefined;
    for (const [key, value] of Object.entries(eventBus.events)) {
      for (const event of value) {
        event.eventUUID = "";
        event.uuidStack = [];
      }
    }
    return eventBus;
  }
}

function stripEventContext(args: any[]) {
  for (const [index, arg] of args.entries()) {
    if ("eventUUID" in arg) args[index] = {};
  }
  return args;
}
