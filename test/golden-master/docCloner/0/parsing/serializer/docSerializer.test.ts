import { test, expect, describe, beforeAll, afterAll } from "vitest";
import {
  initPlaywrightPages,
  teardownPlaywrightPages,
  JSDOMDocs,
} from "../../setup";
import { PlaywrightPage } from "../../index.types";
import { serializeDocAssertionMaster } from "./gold-sight";
import { collection } from "./collection";
import { AssertionBlueprint, EventBus } from "gold-sight";
import { serializeDoc } from "../../../src/parsing/docSerializer";
import { makeDefaultGlobalConfig } from "../../../src/utils/globalConfig";
import {
  DocClone,
  MediaRuleClone,
  StyleRuleClone,
  StyleSheetClone,
} from "../../../src/parsing/docClone";
import {
  normalizeZero,
  normalizeSelector,
} from "../../../src/parsing/normalizer";

let playwrightPages: PlaywrightPage[];
beforeAll(async () => {
  playwrightPages = await initPlaywrightPages();
});

afterAll(async () => {
  await teardownPlaywrightPages(playwrightPages);
});

describe("serializeDoc", () => {
  test.each(collection)("should serialize doc", async (master) => {
    const { index } = master;
    const { page } = playwrightPages[index];

    const queue: [number, AssertionBlueprint][] = await page.evaluate(
      (master) => {
        (window as any).serializeDocAssertionMaster.master = master;
        (window as any).serializeDoc(document, {
          event: new (window as any).EventBus(),
          eventUUID: "",
          globalConfig: { isBrowser: true },
        });

        const queue = (window as any).serializeDocAssertionMaster.getQueue();

        return Array.from(queue.entries());
      },
      master
    );

    serializeDocAssertionMaster.setQueueFromArray(queue);
    serializeDocAssertionMaster.assertQueue({ master });
  });

  test.each(collection)("should serialize the JSDOM doc", (master) => {
    const { index } = master;
    const { doc } = JSDOMDocs[index];

    serializeDocAssertionMaster.master = master;
    serializeDoc(doc, {
      event: new EventBus(),
      eventUUID: "",
      globalConfig: { ...makeDefaultGlobalConfig(), isBrowser: false },
    });

    serializeDocAssertionMaster.assertQueue();
  });

  describe("normalize zero", () => {
    test("should normalize zero", () => {
      expect(normalizeZero("0")).toBe("0px");
      expect(normalizeZero("0px")).toBe("0px");
      expect(normalizeZero("0.0")).toBe("0px");
      expect(normalizeZero("0 5px")).toBe("0px 5px");
      expect(normalizeZero("0px 5px")).toBe("0px 5px");
    });

    test("should normalize zero in depth 1", () => {
      expect(normalizeZero("min(2rem, 0)")).toBe("min(2rem, 0px)");
      expect(normalizeZero("5rem 0.0 3rem")).toBe("5rem 0px 3rem");
      expect(normalizeZero("min(4rem, 0) min(3rem, 2rem)")).toBe(
        "min(4rem, 0px) min(3rem, 2rem)"
      );
    });

    test("should normalize zero in depth 2", () => {
      expect(normalizeZero("min(2rem, max(2rem, 0)) min(3rem, 2rem)")).toBe(
        "min(2rem, max(2rem, 0px)) min(3rem, 2rem)"
      );
    });

    test("should not normalize non-zero", () => {
      expect(normalizeZero("1")).toBe("1");
      expect(normalizeZero("1px")).toBe("1px");
      expect(normalizeZero("1.0")).toBe("1.0");
    });
  });

  describe("normalize selector", () => {
    test("should normalize selector", () => {
      expect(normalizeSelector("*::before")).toBe("::before");
      expect(normalizeSelector("*::after")).toBe("::after");
      expect(normalizeSelector("*::before,\n*::after")).toBe(
        "::before, ::after"
      );
    });
  });
});

describe("docClone", () => {
  test("should add a new style sheet", () => {
    const docClone = new DocClone(makeDefaultGlobalConfig());
    const styleSheet = docClone.addStyleSheet();
    expect(styleSheet).toBe(
      docClone.styleSheets[docClone.styleSheets.length - 1]
    );
    expect(styleSheet).toEqual(new StyleSheetClone(makeDefaultGlobalConfig()));
  });

  test("should add a new style rule to a style sheet", () => {
    const styleSheet = new StyleSheetClone(makeDefaultGlobalConfig());
    const styleRule = styleSheet.addStyleRule();
    expect(styleRule).toBe(styleSheet.rules[styleSheet.rules.length - 1]);
    expect(styleRule).toEqual(new StyleRuleClone(makeDefaultGlobalConfig()));
  });
  test("should add a new media rule to a style sheet", () => {
    const styleSheet = new StyleSheetClone(makeDefaultGlobalConfig());
    const mediaRule = styleSheet.addMediaRule();
    expect(mediaRule).toBe(styleSheet.rules[styleSheet.rules.length - 1]);
    expect(mediaRule).toEqual(new MediaRuleClone(makeDefaultGlobalConfig()));
  });

  test("should add a new style rule to a media rule", () => {
    const mediaRule = new MediaRuleClone(makeDefaultGlobalConfig());
    const styleRule = mediaRule.addStyleRule();
    expect(styleRule).toBe(mediaRule.rules[mediaRule.rules.length - 1]);
    expect(styleRule).toEqual(new StyleRuleClone(makeDefaultGlobalConfig()));
  });
});
