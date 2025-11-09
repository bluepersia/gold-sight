import { test, expect, describe, vi, beforeAll } from "vitest";
import { d, e } from "./golden-master/math/1/logic";
import { d as dExtra } from "./golden-master/math/1WithLocalConfig/logic";
import * as deepClone from "../src/utils/deepClone";
import { getGlobalConfig } from "../src";
import { assertionMaster } from "./golden-master/math/1/assertions";
import { assertionMaster as assertionMasterExtra } from "./golden-master/math/1WithLocalConfig/assertions";
import { LogicContext } from "./golden-master/math/index.types";

describe("no deep clone", () => {
  beforeAll(() => {
    getGlobalConfig().deepClone = {
      result: false,
      args: false,
    };
    assertionMaster.reset();
  });
  test("should not deep clone args and result", () => {
    assertionMaster.resetState();
    const spy = vi.spyOn(deepClone, "deepClone");

    const args: [number[], LogicContext] = [[], {}];
    const result = e(...args);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();

    const assertion = Array.from(assertionMaster.getQueue().values()).find(
      (a) => a.name === "e"
    )!;
    expect(assertion.result).toBe(result);
  });
});

describe("global deep clone", () => {
  beforeAll(() => {
    getGlobalConfig().deepClone = {
      result: true,
      args: true,
    };
    assertionMaster.reset();
  });

  test("should deep clone args and result", () => {
    assertionMaster.resetState();
    const spy = vi.spyOn(deepClone, "deepClone");

    const args: [number[], LogicContext] = [[], {}];
    const result = e(...args);
    expect(spy).toHaveBeenCalledWith(result);
    expect(spy).toHaveBeenCalledWith(args);
    spy.mockRestore();

    const assertion = Array.from(assertionMaster.getQueue().values()).find(
      (a) => a.name === "e"
    )!;
    expect(assertion.args).not.toBe(args);
    expect(assertion.result).not.toBe(result);
  });
});

describe("func-based deep clone", () => {
  beforeAll(() => {
    getGlobalConfig().deepClone = {
      result: false,
      args: false,
    };
    assertionMaster.reset();
  });

  test("should deep clone args and result", () => {
    assertionMaster.resetState();
    const spy = vi.spyOn(deepClone, "deepClone");

    const args: [number[], LogicContext] = [[], {}];
    const result = d(...args);
    expect(spy).toHaveBeenCalledWith(result);
    expect(spy).toHaveBeenCalledWith(args);
    spy.mockRestore();

    const assertion = Array.from(assertionMaster.getQueue().values()).find(
      (a) => a.name === "d"
    )!;
    expect(assertion.args).not.toBe(args);
    expect(assertion.result).not.toBe(result);
  });
});

describe("local deep clone", () => {
  beforeAll(() => {
    getGlobalConfig().deepClone = {
      result: false,
      args: false,
    };
    assertionMaster.reset();
  });

  test("should deep clone args and result", () => {
    assertionMasterExtra.resetState();

    const spy = vi.spyOn(deepClone, "deepClone");

    const args: [number[], LogicContext] = [[], {}];
    const result = dExtra(...args);
    expect(spy).toHaveBeenCalledWith(result);
    expect(spy).toHaveBeenCalledWith(args);
    spy.mockRestore();

    const assertion = Array.from(assertionMasterExtra.getQueue().values()).find(
      (a) => a.name === "d"
    )!;
    expect(assertion.args).not.toBe(args);
    expect(assertion.result).not.toBe(result);
  });
});
