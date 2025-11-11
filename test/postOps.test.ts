import { vi, describe, test, expect } from "vitest";
import { b } from "./golden-master/math/1WithLocalConfig/logic";
import { b as b2 } from "./golden-master/math/2/logic";
import { assertionMaster as math1WithLocalConfigAssertionMaster } from "./golden-master/math/1WithLocalConfig/assertions";
import { assertionMaster as math2AssertionMaster } from "./golden-master/math/2/assertions";
import { LogicContext } from "./golden-master/math/index.types";
import { getGlobalConfig } from "../src";

test("should run all post ops on b with local config", () => {
  const postOpSpy = vi.spyOn(math1WithLocalConfigAssertionMaster, "runPostOp");
  getGlobalConfig().getSnapshot = undefined;
  math1WithLocalConfigAssertionMaster.reset();
  math1WithLocalConfigAssertionMaster.resetState();
  const args: [number[], LogicContext] = [[], {}];
  const result = b(...args);

  math1WithLocalConfigAssertionMaster.runPostOps();

  expect(postOpSpy).toHaveBeenCalled();
  expect(postOpSpy.mock.calls[0][0]).toBe(
    math1WithLocalConfigAssertionMaster.state
  );
  expect(postOpSpy.mock.calls[0][1]).toEqual(args);
  expect(postOpSpy.mock.calls[0][2]).toEqual(result);

  const queue = math1WithLocalConfigAssertionMaster.getQueue();
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
  math2AssertionMaster.reset();
  math2AssertionMaster.resetState();
  const args: [number[], LogicContext] = [[], {}];
  b2(...args);

  math2AssertionMaster.runPostOps();

  const queue = math2AssertionMaster.getQueue();
  queue.forEach((assertion) => {
    expect(assertion.snapshot).toBe(42);
  });
});
