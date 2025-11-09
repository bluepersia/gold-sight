import { expect, test } from "vitest";
import { AbsCounter } from "../src";

test("absCounter", () => {
  const values = [1, 2, 3, 4, 5];

  const absCounter = new AbsCounter(2);

  for (const value of values) {
    if (absCounter.match()) {
      expect(value).toBe(3);
      break;
    }
  }
});
