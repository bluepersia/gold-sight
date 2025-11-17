import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { JSDOMDocs } from "../../../../../setup";
import { collection } from "./collection.ts";
import { makeEventContext } from "../../../../../../src";
import { assertionMaster } from "./goldSight";
import {
  cloneDoc,
  shouldIncludeStyleRule,
} from "../../../src/parsing/serialization/docCloner";
import { makeDefaultGlobal } from "../../../src/utils/global";
import { StyleRuleClone } from "../../../src/parsing/serialization/docClone.ts";

describe("docCloner", () => {
  test.each(collection)(
    "should clone the document with JSDOM",
    async (master) => {
      const { index } = master;
      const { doc } = JSDOMDocs[index];

      assertionMaster.master = master;
      cloneDoc(doc, {
        ...makeDefaultGlobal(),
        ...makeEventContext(),
        isBrowser: false,
      });

      assertionMaster.assertQueue();
    }
  );

  describe("shouldIncludeStyleRule", () => {
    test("should return true if the style rule has style properties", () => {
      const styleRuleClone = new StyleRuleClone(makeDefaultGlobal());
      styleRuleClone.style = { "padding-top": "10px" };
      expect(shouldIncludeStyleRule(styleRuleClone)).toBe(true);
    });

    test("should return true if the style rule has special properties", () => {
      const styleRuleClone = new StyleRuleClone(makeDefaultGlobal());
      styleRuleClone.specialProps = { "padding-top": "10px" };
      expect(shouldIncludeStyleRule(styleRuleClone)).toBe(true);
    });

    test("should return false if the style rule has no properties", () => {
      const styleRuleClone = new StyleRuleClone(makeDefaultGlobal());
      expect(shouldIncludeStyleRule(styleRuleClone)).toBe(false);
    });
  });
});
