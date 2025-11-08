import { describe, expect, test } from "vitest";
import { JSDOMDocs } from "../../setup";
import { cloneDoc } from "./src/parsing/serialization/docCloner";
import { docClonerAssertionMaster } from "./parsing/serialization/docClonerGoldSight";
import { docClonerCollection } from "./parsing/serialization/docClonerCollection";
import { EventBus, makeEventContext } from "../../../src/utils/eventBus";
import { makeDefaultGlobal } from "./src/utils/global";
import { DocClone } from "../docCloner/src/parsing/docClone";
import { MEDIA_RULE_TYPE, STYLE_RULE_TYPE } from "./src/index.types";

function countSheets(doc: Document) {
  return doc.styleSheets.length;
}

function countRules(doc: Document) {
  let count = 0;
  for (const sheet of doc.styleSheets) {
    count++;
    for (const rule of sheet.cssRules) {
      if (rule.type === MEDIA_RULE_TYPE) count++;
    }
  }
  return count;
}

function countRule(doc: Document) {
  let count = 0;
  for (const sheet of doc.styleSheets) {
    for (const rule of sheet.cssRules) {
      count++;
      if (rule.type === MEDIA_RULE_TYPE) {
        for (const childRule of (rule as CSSMediaRule).cssRules) count++;
      }
    }
  }
  return count;
}

function countStyleRule(doc: Document) {
  let count = 0;
  for (const sheet of doc.styleSheets) {
    for (const rule of sheet.cssRules) {
      if (rule.type === STYLE_RULE_TYPE) count++;

      if (rule.type === MEDIA_RULE_TYPE) {
        for (const childRule of (rule as CSSMediaRule).cssRules) count++;
      }
    }
  }
  return count;
}

function countMediaRule(doc: Document) {
  let count = 0;
  for (const sheet of doc.styleSheets) {
    for (const rule of sheet.cssRules) {
      if (rule.type === MEDIA_RULE_TYPE) count++;
    }
  }
  return count;
}

describe("cloneDoc", () => {
  test.each(JSDOMDocs)("should clone the doc", ({ doc, index }) => {
    docClonerAssertionMaster.master = docClonerCollection[index];
    cloneDoc(doc, {
      ...makeDefaultGlobal(),
      counter: { orderID: -1 },
      isBrowser: false,
      ...makeEventContext(),
    });

    const verifiedAssertions = docClonerAssertionMaster.assertQueue();
    expect(verifiedAssertions.get("should clone style sheet")).toEqual(
      countSheets(doc)
    );
    expect(verifiedAssertions.get("should clone rules")).toEqual(
      countRules(doc)
    );
    expect(verifiedAssertions.get("should clone rule")).toEqual(countRule(doc));

    expect(verifiedAssertions.get("should clone style rule")).toEqual(
      countStyleRule(doc)
    );

    expect(verifiedAssertions.get("should clone media rule")).toEqual(
      countMediaRule(doc)
    );
  });

  describe("should attempt to clone the doc and break", () => {
    test.each(JSDOMDocs)(
      "should break with firstOfDeepest",
      ({ doc, index }) => {
        docClonerAssertionMaster.master = docClonerCollection[index];
        cloneDoc(doc, {
          breakStyleRules: [".product-card", ".product-card__title"],
          ...makeDefaultGlobal(),
          counter: { orderID: -1 },
          isBrowser: false,
          ...makeEventContext(),
        });
        try {
          docClonerAssertionMaster.assertQueue();
        } catch (err) {
          expect(err.message).includes(
            `"mediaWidth": "baseline",\n  "selector": ".product-card"`
          );
        }
      }
    );
  });

  test.each(JSDOMDocs)("should break with deepest", ({ doc, index }) => {
    docClonerAssertionMaster.master = docClonerCollection[index];
    cloneDoc(doc, {
      breakStyleRules: [".product-card", ".product-card__title"],
      ...makeDefaultGlobal(),
      counter: { orderID: -1 },
      isBrowser: false,
      ...makeEventContext(),
    });
    try {
      docClonerAssertionMaster.assertQueue({ errorAlgorithm: "deepest" });
    } catch (err) {
      expect(err.message).includes(
        '"mediaWidth": 600,\n  "selector": ".product-card"'
      );
    }
  });

  test.each(JSDOMDocs)("should break with firstOfDeepest", ({ doc, index }) => {
    docClonerAssertionMaster.master = docClonerCollection[index];
    cloneDoc(doc, {
      breakMedia: 375,
      ...makeDefaultGlobal(),
      counter: { orderID: -1 },
      isBrowser: false,
      ...makeEventContext(),
    });
    try {
      docClonerAssertionMaster.assertQueue();
    } catch (err) {
      expect(err.message).includes(`"mediaText": "(min-width: 375px)"`);
    }
  });
});
