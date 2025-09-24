import { describe, test, expect } from "vitest";
import { masterCollection } from "./masterCollection";
import { a } from "./1/logic";
import { assertionMaster } from "./assertions";
import { getQueue } from "../../../src";

describe("math1", () => {
  test.each(masterCollection)("should pass", (master) => {
    assertionMaster.callTopFn(a, master);

    assertionMaster.assertQueue();
  });
});
