import { describe, expect, test } from "vitest";
import { JSDOMDocs } from "../../setup";
import { serializeDoc } from "./src/parsing/docSerializer";
import { serializeDocAssertionMaster } from "./0/parsing/serializer/gold-sight";
import { collection } from "./0/parsing/serializer/collection";
describe("serialiezDoc", () => {
  test.each(JSDOMDocs)("should serialize the doc", ({ doc, index }) => {
    serializeDocAssertionMaster.master = collection[index];
    serializeDoc(doc, {
      globalConfig: { isBrowser: false, autoForce: true },
    });

    serializeDocAssertionMaster.assertQueue();
  });
});
