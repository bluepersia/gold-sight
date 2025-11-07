import { describe, expect, test } from "vitest";
import { JSDOMDocs } from "../../setup";
import { serializeDoc } from "./src/parsing/docSerializer";
import { serializeDocAssertionMaster } from "./parsing/serializer/gold-sight";
import { collection } from "./parsing/serializer/collection";
import { EventBus } from "../../../src/utils/eventBus";
describe("serialiezDoc", () => {
  test.each(JSDOMDocs)("should serialize the doc", ({ doc, index }) => {
    serializeDocAssertionMaster.master = collection[index];
    serializeDoc(doc, {
      globalConfig: { isBrowser: false, autoForce: true },
      event: new EventBus(),
      eventUUID: "",
    });

    serializeDocAssertionMaster.assertQueue({ verbose: false });
  });

  describe("should attempt to serialize the doc and break", () => {
    test.each(JSDOMDocs)(
      "should break with firstOfDeepest",
      ({ doc, index }) => {
        serializeDocAssertionMaster.master = collection[index];
        serializeDoc(doc, {
          break: [".product-card", ".product-card__title"],
          globalConfig: { isBrowser: false, autoForce: true },
          event: new EventBus(),
          eventUUID: "",
        });
        try {
          serializeDocAssertionMaster.assertQueue();
        } catch (err) {
          expect(err.message).includes(`.product-card/baseline`);
        }
      }
    );
    test.each(JSDOMDocs)("should break with deepest", ({ doc, index }) => {
      serializeDocAssertionMaster.master = collection[index];
      serializeDoc(doc, {
        break: [".product-card", ".product-card__title"],
        globalConfig: { isBrowser: false, autoForce: true },
        event: new EventBus(),
        eventUUID: "",
      });
      try {
        serializeDocAssertionMaster.assertQueue({ errorAlgorithm: "deepest" });
      } catch (err) {
        expect(err.message).includes(`.product-card/600`);
      }
    });

    test.each(JSDOMDocs)(
      "should break with firstOfDeepest",
      ({ doc, index }) => {
        serializeDocAssertionMaster.master = collection[index];
        serializeDoc(doc, {
          breakMedia: 375,
          globalConfig: { isBrowser: false, autoForce: true },
          event: new EventBus(),
          eventUUID: "",
        });
        try {
          serializeDocAssertionMaster.assertQueue();
        } catch (err) {
          expect(err.message).includes(`(min-width: 375px)`);
        }
      }
    );
  });
});
