import { test, expect, describe, vi, beforeAll } from "vitest";
import { d, e } from "./golden-master/math/1/logic";
import * as deepClone from "../src/utils/deepClone";
import { getGlobalConfig } from "../src";
import { assertionMaster } from "./golden-master/math/1/assertions";
import { LogicContext } from "./golden-master/math/index.types";

describe("no deep clone", () => {
  beforeAll(() => {
    getGlobalConfig().deepClone = {
      result: false,
      args: false,
    };
  });
  test("should not deep clone args and result", () => {
    assertionMaster.resetState();
    assertionMaster.state!.queueIndex = 1;
    assertionMaster.state!.branchCounter = new Map([[0, 0]]);
    assertionMaster.state!.callStack = [0];
    const spy = vi.spyOn(deepClone, "deepClone");

    const args: [number[], LogicContext] = [[], {}];
    e(...args);
    expect(spy).not.toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("global deep clone", () => {
  beforeAll(() => {
    getGlobalConfig().deepClone = {
      result: true,
      args: true,
    };
  });

  test("should deep clone args and result", () => {
    assertionMaster.resetState();
    assertionMaster.state!.queueIndex = 1;
    assertionMaster.state!.branchCounter = new Map([[0, 0]]);
    assertionMaster.state!.callStack = [0];
    const spy = vi.spyOn(deepClone, "deepClone");

    const args: [number[], LogicContext] = [[], {}];
    const result = e(...args);
    expect(spy).toHaveBeenCalledWith(result);
    expect(spy).toHaveBeenCalledWith(args);
  });
});

describe("local deep clone", () => {
  beforeAll(() => {
    getGlobalConfig().deepClone = {
      result: false,
      args: false,
    };
  });

  test("should deep clone args and result", () => {
    assertionMaster.resetState();
    assertionMaster.state!.queueIndex = 1;
    assertionMaster.state!.branchCounter = new Map([[0, 0]]);
    assertionMaster.state!.callStack = [0];
    const spy = vi.spyOn(deepClone, "deepClone");

    const args: [number[], LogicContext] = [[], {}];
    const result = d(...args);
    expect(spy).toHaveBeenCalledWith(result);
    expect(spy).toHaveBeenCalledWith(args);
  });
});
