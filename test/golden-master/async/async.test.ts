import { test, expect, describe } from "vitest";
import { assertionMaster } from "./assertions";
import { master } from "./master";
import { a } from "./logic";

describe("async", () => {
  test("async", async () => {
    assertionMaster.master = master;

    await a();

    assertionMaster.assertQueue();
  });
});
