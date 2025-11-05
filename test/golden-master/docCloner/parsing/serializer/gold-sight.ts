let expect;
if (process.env.NODE_ENV === "test") {
  expect = (await import("vitest")).expect;
}
import { SerializeDocMaster, State } from "./index.types";
import AssertionMaster from "../../../../../src";
import { AssertionChainForFunc } from "../../../../../src/index.types";
import {
  serializeDoc,
  serializeRule,
  serializeRules,
  serializeStyleSheet,
  serializeStyleSheets,
  getAccessibleStyleSheets,
  serializeStyleRule,
  serializeMediaRule,
  wrap,
  serializeProps,
  serializeProp,
  serializeShorthandProp,
  serializeFluidProp,
} from "../../src/parsing/docSerializer";

import * as controller from "./controller";
import { withEventNames } from "../../../../../src/utils/eventBus";
import { EXPLICIT_PROPS_FOR_SHORTHAND } from "../../src/parsing/docSerializerConsts";

const serializeDocAssertionChain: AssertionChainForFunc<
  State,
  typeof serializeDoc
> = {
  "serialize document": (state, args, result) => {
    expect(result).toEqual(state.master!.docClone);
    return true;
  },
};

const getAccessibleStyleSheetsAssertionChain: AssertionChainForFunc<
  State,
  typeof getAccessibleStyleSheets
> = {
  "get accessible style sheets": (state, args, result) => {
    expect(result.length).toBe(state.master!.docClone.styleSheets.length);
    return true;
  },
};

const serializeStyleSheetsAssertionChain: AssertionChainForFunc<
  State,
  typeof serializeStyleSheets
> = {
  "serialize style sheets": (state, args, result) => {
    expect(result).toEqual(state.master!.docClone.styleSheets);
    return true;
  },
};

const serializeStyleSheetAssertionChain: AssertionChainForFunc<
  State,
  typeof serializeStyleSheet
> = {
  "serialize style sheet": (state, args, result) => {
    expect(result).toEqual(
      state.master!.docClone.styleSheets[state.sheetIndex]
    );
    return true;
  },
};

const serializeRulesAssertionChain: AssertionChainForFunc<
  State,
  typeof serializeRules
> = {
  "serialize rules": (state, args, result) => {
    expect(result).toEqual(
      controller.findRules(state.master!.docClone, state.rulesIndex)
    );
    return true;
  },
};

const serializeRuleAssertionChain: AssertionChainForFunc<
  State,
  typeof serializeRule
> = {
  "serialize rule": (state, args, result) =>
    withEventNames(args, ["ruleSerialized", "ruleOmitted"], (events) => {
      if (events.ruleSerialized) {
        expect(result).toEqual(
          controller.findRule(state.master!.docClone, state.ruleIndex)
        );
      } else if (events.ruleOmitted) {
        if (
          events.ruleOmitted?.payload.why === "unsupportedType" ||
          events.ruleOmitted?.payload.why === "nullResult"
        ) {
          expect(result).toBeNull();
        } else {
          throw new Error("Unexpected event");
        }
      } else {
        throw new Error("Unexpected event");
      }
      return true;
    }),
};

const serializeStyleRuleAssertionChain: AssertionChainForFunc<
  State,
  typeof serializeStyleRule
> = {
  "serialize style rule": (state, args, result) =>
    withEventNames(
      args,
      ["styleRuleSerialized", "styleRuleOmitted"],
      (events) => {
        if (events.styleRuleSerialized) {
          expect(result).toEqual(
            controller.findStyleRule(
              state.master!.docClone,
              state.styleRuleIndex
            )
          );
        } else if (events.styleRuleOmitted?.payload.why === "noProps") {
          expect(result).toBeNull();
        } else {
          throw new Error("Unexpected event");
        }
        return true;
      }
    ),
};

const serializePropsAssertionChain: AssertionChainForFunc<
  State,
  typeof serializeProps
> = {
  "serialize props": (state, args, result) =>
    withEventNames(args, ["propSerialized"], (events) => {
      if (events.propSerialized) {
        const masterRule = controller.findStyleRule(
          state.master!.docClone,
          state.styleRuleIndex - 1
        );
        expect(result.style).toEqual(masterRule!.style);
        expect(result.specialProps).toEqual(masterRule!.specialProps);
      } else {
        expect(result.style).toEqual({});
        expect(result.specialProps).toEqual({});
      }
      return true;
    }),
};

const serializePropAssertionChain: AssertionChainForFunc<
  State,
  typeof serializeProp
> = {
  "serialize prop": (state, args, result) =>
    withEventNames(
      args,
      ["fluidPropSerialized", "specialPropSerialized"],
      (events) => {
        const [, prop, { propsResults }] = args;
        const masterRule = controller.findStyleRule(
          state.master!.docClone,
          state.styleRuleIndex - 1
        );
        if (events.fluidPropSerialized) {
          expect(result.style[prop]).toEqual(masterRule!.style[prop]);
        } else if (events.specialPropSerialized) {
          expect(result.specialProps[prop]).toEqual(
            masterRule!.specialProps[prop]
          );
        } else {
          expect(result).toBe(propsResults);
        }
        return true;
      }
    ),
};

const serializeFluidPropAssertionChain: AssertionChainForFunc<
  State,
  typeof serializeFluidProp
> = {
  "serialize fluid prop": (state, args, result) =>
    withEventNames(
      args,
      ["fluidPropSerialized", "shorthandPropSerialized"],
      (events) => {
        const [, prop] = args;
        const masterRule = controller.findStyleRule(
          state.master!.docClone,
          state.styleRuleIndex - 1
        );

        if (events.fluidPropSerialized) {
          expect(result.style[prop]).toEqual(masterRule!.style[prop]);
        } else if (events.shorthandPropSerialized) {
          assertShorthandExpanded(prop, result.style, masterRule!.style);
        } else {
          throw Error("Unexpected event");
        }
        return true;
      }
    ),
};

const assertShorthandExpanded = (
  prop: string,
  resultStyle: Record<string, string>,
  masterStyle: Record<string, string>
) => {
  const explicitProps = EXPLICIT_PROPS_FOR_SHORTHAND.get(prop)!;
  for (const explicitProp of explicitProps) {
    expect(resultStyle[explicitProp]).toEqual(masterStyle[explicitProp]);
  }
};

const serializeShorthandPropAssertionChain: AssertionChainForFunc<
  State,
  typeof serializeShorthandProp
> = {
  "serialize shorthand prop": (state, args, result) =>
    withEventNames(args, ["browserSkip", "shorthandExpanded"], (events) => {
      const [, , { propsResults, prop }] = args;
      if (events.browserSkip?.payload.why === "browserHandlesShorthands") {
        expect(result).toBe(propsResults);
      } else if (events.shorthandExpanded) {
        assertShorthandExpanded(
          prop,
          result.style,
          events.shorthandExpanded.payload.style
        );
      } else {
        throw Error("Unexpected event");
      }
      return true;
    }),
};
const serializeMediaRuleAssertionChain: AssertionChainForFunc<
  State,
  typeof serializeMediaRule
> = {
  "serialize media rule": (state, args, result) =>
    withEventNames(
      args,
      ["mediaRuleSerialized", "mediaRuleOmitted"],
      (events) => {
        if (events.mediaRuleSerialized) {
          expect(result).toEqual(
            controller.findMediaRule(
              state.master!.docClone,
              state.mediaRuleIndex
            )
          );
        } else if (events.mediaRuleOmitted?.payload.why === "noMinWidth") {
          expect(result).toBeNull();
        } else {
          throw new Error("Unexpected event");
        }
        return true;
      }
    ),
};

const defaultAssertions = {
  serializeDoc: serializeDocAssertionChain,
  getAccessibleStyleSheets: getAccessibleStyleSheetsAssertionChain,
  serializeStyleSheets: serializeStyleSheetsAssertionChain,
  serializeStyleSheet: serializeStyleSheetAssertionChain,
  serializeRules: serializeRulesAssertionChain,
  serializeRule: serializeRuleAssertionChain,
  serializeStyleRule: serializeStyleRuleAssertionChain,
  serializeProps: serializePropsAssertionChain,
  serializeMediaRule: serializeMediaRuleAssertionChain,
  serializeProp: serializePropAssertionChain,
  serializeFluidProp: serializeFluidPropAssertionChain,
  serializeShorthandProp: serializeShorthandPropAssertionChain,
};

class SerializeDocAssertionMaster extends AssertionMaster<
  State,
  SerializeDocMaster
> {
  constructor() {
    super(defaultAssertions, "serializeDoc");
  }

  newState(): State {
    return {
      sheetIndex: 0,
      ruleIndex: 0,
      rulesIndex: 0,
      styleRuleIndex: 0,
      mediaRuleIndex: 0,
    };
  }

  serializeDoc = this.wrapTopFn(serializeDoc, "serializeDoc");

  getAccessibleStyleSheets = this.wrapFn(
    getAccessibleStyleSheets,
    "getAccessibleStyleSheets"
  );

  serializeStyleSheets = this.wrapFn(
    serializeStyleSheets,
    "serializeStyleSheets"
  );

  serializeStyleSheet = this.wrapFn(
    serializeStyleSheet,
    "serializeStyleSheet",
    {
      post: (state) => {
        state.sheetIndex++;
      },
    }
  );

  serializeRules = this.wrapFn(serializeRules, "serializeRules", {
    post: (state) => {
      state.rulesIndex++;
    },
  });

  serializeRule = this.wrapFn(serializeRule, "serializeRule", {
    post: (state, args, result) =>
      withEventNames(args, ["ruleSerialized"], (events) => {
        if (events.ruleSerialized) state.ruleIndex++;
      }),
  });

  serializeStyleRule = this.wrapFn(serializeStyleRule, "serializeStyleRule", {
    getId: (state, args) => {
      return `${args[0].selectorText}/${args[1].minWidth || "baseline"}`;
    },
    post: (state, args, result) =>
      withEventNames(args, ["styleRuleSerialized"], (events) => {
        if (events.styleRuleSerialized) {
          state.styleRuleIndex++;
        }
      }),
  });

  serializeProps = this.wrapFn(serializeProps, "serializeProps");

  serializeProp = this.wrapFn(serializeProp, "serializeProp");

  serializeFluidProp = this.wrapFn(serializeFluidProp, "serializeFluidProp");

  serializeShorthandProp = this.wrapFn(
    serializeShorthandProp,
    "serializeShorthandProp"
  );

  serializeMediaRule = this.wrapFn(serializeMediaRule, "serializeMediaRule", {
    getId: (state, args) => {
      return args[0].media.mediaText;
    },
    post: (state, args, result) =>
      withEventNames(args, ["mediaRuleSerialized"], (events) => {
        if (events.mediaRuleSerialized) state.mediaRuleIndex++;
      }),
  });
}

const serializeDocAssertionMaster = new SerializeDocAssertionMaster();

function wrapAll() {
  wrap(
    serializeDocAssertionMaster.serializeDoc,
    serializeDocAssertionMaster.getAccessibleStyleSheets,
    serializeDocAssertionMaster.serializeStyleSheets,
    serializeDocAssertionMaster.serializeStyleSheet,
    serializeDocAssertionMaster.serializeRules,
    serializeDocAssertionMaster.serializeRule,
    serializeDocAssertionMaster.serializeStyleRule,
    serializeDocAssertionMaster.serializeProps,
    serializeDocAssertionMaster.serializeProp,
    serializeDocAssertionMaster.serializeFluidProp,
    serializeDocAssertionMaster.serializeShorthandProp,
    serializeDocAssertionMaster.serializeMediaRule
  );
}

export { serializeDocAssertionMaster, wrapAll };
