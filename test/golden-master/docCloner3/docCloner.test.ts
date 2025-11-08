import { describe, expect, test } from "vitest";
import { JSDOMDocs } from "../../setup";
import { cloneDoc } from "./src/parsing/serialization/docCloner";
import { docClonerAssertionMaster } from "./parsing/serialization/docClonerGoldSight";
import { docClonerCollection } from "./parsing/serialization/docClonerCollection";
import { EventBus, makeEventContext } from "../../../src/utils/eventBus";
import { makeDefaultGlobal } from "./src/utils/global";
describe("cloneDoc", () => {
  test.each(JSDOMDocs)("should clone the doc", ({ doc, index }) => {
    docClonerAssertionMaster.master = docClonerCollection[index];
    cloneDoc(doc, {
      ...makeDefaultGlobal(),
      counter: { orderID: -1 },
      isBrowser: false,
      ...makeEventContext(),
    });

    docClonerAssertionMaster.assertQueue({ verbose: false });
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
          expect(err.message).includes(`.product-card/mediaWidth:baseline`);
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
      expect(err.message).includes(`.product-card/mediaWidth:600`);
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
      expect(err.message).includes(`mediaText:(min-width: 375px)`);
    }
  });
});
