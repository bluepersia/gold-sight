import { describe, test, expect } from "vitest";
import { masterCollection } from "./masterCollection";
import { a } from "./1/logic";
import { assertionMaster } from "./1/assertions";

describe("math1", () => {
  test.each(masterCollection)("should pass", (master) => {
    a();

    assertionMaster.assertQueue();
  });
});
