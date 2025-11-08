import { vi, describe, test, expect } from "vitest";
import { b } from "./golden-master/math/extra/logic";
import { b as b2 } from "./golden-master/math/2/logic";
import { assertionMaster } from "./golden-master/math/extra/assertions";
import { assertionMaster as assertionMaster2 } from "./golden-master/math/2/assertions";
import { LogicContext } from "./golden-master/math/index.types";
import { getGlobalConfig } from "../src";

test("should run all post ops on b extra", () => {
  const postOpSpy = vi.spyOn(assertionMaster, "runPostOp");
  getGlobalConfig().getSnapshot = undefined;
  assertionMaster.reset();
  assertionMaster.resetState();
  const args: [number[], LogicContext] = [[], {}];
  const result = b(...args);

  assertionMaster.runPostOps();

  expect(postOpSpy).toHaveBeenCalled();
  expect(postOpSpy.mock.calls[0][0]).toBe(assertionMaster.state);
  expect(postOpSpy.mock.calls[0][1]).toEqual(args);
  expect(postOpSpy.mock.calls[0][2]).toEqual(result);

  const queue = assertionMaster.getQueue();
  queue.forEach((assertion) => {
    expect(assertion.snapshot).toBe(42);
  });

  const bAssertion = Array.from(queue.values()).find(
    (assertion) => assertion.name === "b"
  )!;
  expect(bAssertion.address).toBe("b");
});

test("should run all post ops with global snapshot", () => {
  getGlobalConfig().getSnapshot = () => 42;
  assertionMaster2.reset();
  assertionMaster2.resetState();
  const args: [number[], LogicContext] = [[], {}];
  b2(...args);

  assertionMaster2.runPostOps();

  const queue = assertionMaster2.getQueue();
  queue.forEach((assertion) => {
    expect(assertion.snapshot).toBe(42);
  });
});
