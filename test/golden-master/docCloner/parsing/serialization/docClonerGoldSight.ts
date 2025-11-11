let expect: ExpectStatic;
if (process.env.NODE_ENV === "test") {
  expect = (await import("vitest")).expect;
}
import AssertionMaster, { withEventNames } from "../../../../../src/index";
import type {
  AssertionChainForFunc,
  AssertionChain,
} from "../../../../../src/index.types";
import type { DocClonerMaster, GoldSightState } from "./index.types";
import {
  cloneDoc,
  cloneRules,
  cloneStyleSheet,
  filterAccessibleSheets,
  cloneRule,
  wrap,
  cloneStyleRule,
  cloneMediaRule,
  cloneProp,
  cloneFluidProp,
  cloneSpecialProp,
  preCloneRule,
} from "../../src/parsing/serialization/docCloner";
import * as controller from "./docClonerController";
import type { ExpectStatic } from "vitest";
import { EXPLICIT_PROPS_FOR_SHORTHAND } from "../../src/parsing/serialization/docClonerConsts";
import type { ClonePropsState } from "../../src/parsing/serialization/docCloner.types";
import { MEDIA_RULE_TYPE, STYLE_RULE_TYPE } from "../../src/index.types";

const cloneDocAssertionChain: AssertionChainForFunc<
  GoldSightState,
  typeof cloneDoc
> = {
  "should clone the document": (state, _args, result) => {
    expect(result).toEqual(state.master!.docClone);
  },
};

const filterAccessibleSheetsAssertionChain: AssertionChainForFunc<
  GoldSightState,
  typeof filterAccessibleSheets
> = {
  "should filter accessible sheets": (state, _args, result) => {
    expect(result.length).toBe(state.master!.docClone.sheets.length);
  },
};

const cloneStyleSheetAssertionChain: AssertionChainForFunc<
  GoldSightState,
  typeof cloneStyleSheet
> = {
  "should clone style sheet": (state, _args, result) => {
    expect(result).toEqual(state.master!.docClone.sheets[state.sheetIndex]);
  },
};

const cloneRulesAssertionChain: AssertionChainForFunc<
  GoldSightState,
  typeof cloneRules
> = {
  "should clone rules": (state, _args, result) => {
    expect(result).toEqual(
      controller.findRules(state.master!.docClone, state.rulesIndex)
    );
  },
};

const preCloneRulesAssertionChain: AssertionChainForFunc<
  GoldSightState,
  typeof preCloneRule
> = {
  "should pre clone rules": (state, args, result) =>
    withEventNames(args, ["ruleCloned", "ruleOmitted"], (events) => {
      expect(Object.keys(events).length).toBe(1);
    }),
};

const cloneRuleAssertionChain: AssertionChainForFunc<
  GoldSightState,
  typeof cloneRule
> = {
  "should clone rule": (state, args, result) =>
    withEventNames(args, ["ruleCloned", "ruleOmitted"], (events) => {
      expect(Object.keys(events).length).toBe(1);
      if (events.ruleCloned) {
        expect(result).toEqual(
          controller.findRule(state.master!.docClone, state.ruleIndex)
        );
      } else if (events.ruleOmitted) {
        expect(result).toBeNull();
      } else {
        throw Error("unknown event");
      }
    }),
};

const cloneStyleRuleAssertionChain: AssertionChainForFunc<
  GoldSightState,
  typeof cloneStyleRule
> = {
  "should clone style rule": (state, args, result) =>
    withEventNames(
      args,
      ["styleRuleCloned", "styleRuleOmitted", "ruleOmitted", "ruleCloned"],
      (events) => {
        expect(Object.keys(events).length).toBe(1);

        if (events.styleRuleCloned) {
          expect(result).toEqual(
            controller.findStyleRule(
              state.master!.docClone,
              state.styleRuleIndex
            )
          );
        } else if (events.styleRuleOmitted) {
          expect(result).toBeNull();
        } else {
          throw Error("unknown event");
        }
      }
    ),
};

const cloneMediaRuleAssertionChain: AssertionChainForFunc<
  GoldSightState,
  typeof cloneMediaRule
> = {
  "should clone media rule": (state, args, result) =>
    withEventNames(args, ["mediaRuleCloned", "mediaRuleOmitted"], (events) => {
      expect(Object.keys(events).length).toBe(1);
      if (events.mediaRuleCloned) {
        expect(result).toEqual(
          controller.findMediaRule(state.master!.docClone, state.mediaRuleIndex)
        );
      } else if (events.mediaRuleOmitted) {
        expect(result).toBeNull();
      } else {
        throw Error("unknown event");
      }
    }),
};

const FLUID_PROP_EVENTS_ROUTER = {
  fluidPropCloned: (
    resultStyle: Record<string, string>,
    masterStyle: Record<string, string>,
    property: string
  ) => {
    expect(resultStyle[property]).toBe(masterStyle[property]);
  },
  expandedShorthand: (
    resultStyle: Record<string, string>,
    masterStyle: Record<string, string>,
    property: string
  ) => {
    for (const explicitProp of EXPLICIT_PROPS_FOR_SHORTHAND.get(property)!) {
      expect(resultStyle[explicitProp]).toBe(masterStyle[explicitProp]);
    }
  },
  propOmitted: (result: ClonePropsState, propsState: ClonePropsState) => {
    expect(result).toBe(propsState);
  },
};

const clonePropAssertionChain: AssertionChainForFunc<
  GoldSightState,
  typeof cloneProp
> = {
  "should clone prop": (state, args, result) =>
    withEventNames(
      args,
      [
        "fluidPropCloned",
        "expandedShorthand",
        "specialPropCloned",
        "propOmitted",
      ],
      (events) => {
        expect(Object.keys(events).length).toBe(1);

        const [, property, ctx] = args;
        const { propsState } = ctx;
        const masterRule = controller.findStyleRule(
          state.master!.docClone,
          state.styleRuleIndex - 1
        );
        if (events.fluidPropCloned) {
          FLUID_PROP_EVENTS_ROUTER.fluidPropCloned(
            result.style,
            masterRule!.style,
            property
          );
        } else if (events.expandedShorthand) {
          FLUID_PROP_EVENTS_ROUTER.expandedShorthand(
            result.style,
            masterRule!.style,
            property
          );
        } else if (events.specialPropCloned) {
          expect(result.specialProps[property]).toBe(
            masterRule!.specialProps[property]
          );
        } else if (events.propOmitted) {
          expect(result).toBe(propsState);
        } else {
          throw Error("unknown event");
        }
      }
    ),
};

const cloneFluidPropAssertionChain: AssertionChainForFunc<
  GoldSightState,
  typeof cloneFluidProp
> = {
  "should clone fluid prop": (state, args, result) =>
    withEventNames(args, ["fluidPropCloned", "expandedShorthand"], (events) => {
      expect(Object.keys(events).length).toBe(1);
      const [property, , ctx] = args;

      const masterRule = controller.findStyleRule(
        state.master!.docClone,
        state.styleRuleIndex - 1
      );
      if (events.fluidPropCloned) {
        FLUID_PROP_EVENTS_ROUTER.fluidPropCloned(
          result.style,
          masterRule!.style,
          property
        );
      } else if (events.expandedShorthand) {
        if (ctx.isBrowser) throw Error("Browser is processing a shorthand");
        FLUID_PROP_EVENTS_ROUTER.expandedShorthand(
          result.style,
          masterRule!.style,
          property
        );
      } else {
        throw Error("unknown event");
      }
    }),
};

const cloneSpecialPropAssertionChain: AssertionChainForFunc<
  GoldSightState,
  typeof cloneSpecialProp
> = {
  "should clone special prop": (state, args, result) =>
    withEventNames(args, ["specialPropCloned"], (events) => {
      expect(Object.keys(events).length).toBe(1);

      const [property] = args;
      const masterRule = controller.findStyleRule(
        state.master!.docClone,
        state.styleRuleIndex - 1
      );
      if (events.specialPropCloned) {
        expect(result.specialProps[property]).toBe(
          masterRule!.specialProps[property]
        );
      } else {
        throw Error("unknown event");
      }
    }),
};

const defaultAssertions = {
  cloneDoc: cloneDocAssertionChain,
  filterAccessibleSheets: filterAccessibleSheetsAssertionChain,
  cloneStyleSheet: cloneStyleSheetAssertionChain,
  cloneRules: cloneRulesAssertionChain,
  preCloneRule: preCloneRulesAssertionChain,
  cloneRule: cloneRuleAssertionChain,
  cloneStyleRule: cloneStyleRuleAssertionChain,
  cloneMediaRule: cloneMediaRuleAssertionChain,
  cloneProp: clonePropAssertionChain,
  cloneFluidProp: cloneFluidPropAssertionChain,
  cloneSpecialProp: cloneSpecialPropAssertionChain,
};

class DocClonerAssertionMaster extends AssertionMaster<
  GoldSightState,
  DocClonerMaster
> {
  constructor() {
    super(defaultAssertions, "cloneDoc");
  }

  newState(): GoldSightState {
    return {
      sheetIndex: 0,
      rulesIndex: 0,
      ruleIndex: 0,
      styleRuleIndex: 0,
      mediaRuleIndex: 0,
    };
  }

  cloneDoc = this.wrapTopFn(cloneDoc, "cloneDoc");
  filterAccessibleSheets = this.wrapFn(
    filterAccessibleSheets,
    "filterAccessibleSheets"
  );
  cloneStyleSheet = this.wrapFn(cloneStyleSheet, "cloneStyleSheet", {
    getAddress: (state, args) => {
      return {
        sheetIndex: state.sheetIndex,
        href: args[0].href || "",
      };
    },
    post: (state) => {
      state.sheetIndex++;
    },
  });
  cloneRules = this.wrapFn(cloneRules, "cloneRules", {
    getAddress: (state, args) => {
      const [, ctx] = args;
      const { rulesParent } = ctx;
      return {
        rulesIndex: state.rulesIndex,
        rulesParent: rulesParent,
      };
    },
    post: (state) => {
      state.rulesIndex++;
    },
  });
  preCloneRule = this.wrapFn(preCloneRule, "preCloneRule", {
    getAddress: (state, args) => {
      return {
        ruleIndex: state.ruleIndex,
      };
    },
  });
  cloneRule = this.wrapFn(cloneRule, "cloneRule", {
    getAddress: (state, args) => {
      const [rule, ctx] = args;
      const base = { ruleIndex: state.ruleIndex };
      if (rule.type === STYLE_RULE_TYPE) {
        const styleRule = rule as CSSStyleRule;
        return {
          ...base,
          selector: styleRule.selectorText,
          mediaWidth: ctx.mediaWidth || "baseline",
        };
      } else if (rule.type === MEDIA_RULE_TYPE) {
        const mediaRule = rule as CSSMediaRule;
        return {
          ...base,
          mediaText: mediaRule.media.mediaText,
        };
      } else {
        return base;
      }
    },
    post: (state, args) =>
      withEventNames(args, ["ruleCloned"], (events) => {
        if (events.ruleCloned) state.ruleIndex++;
      }),
  });
  cloneStyleRule = this.wrapFn(cloneStyleRule, "cloneStyleRule", {
    getAddress: (state, args) => {
      return {
        styleRuleIndex: state.styleRuleIndex,
        selector: args[0].selectorText || "",
        mediaWidth: args[1].mediaWidth || "baseline",
      };
    },
    post: (state, args) =>
      withEventNames(args, ["styleRuleCloned"], (events) => {
        if (events.styleRuleCloned) state.styleRuleIndex++;
      }),
  });
  cloneMediaRule = this.wrapFn(cloneMediaRule, "cloneMediaRule", {
    getAddress: (state, args) => {
      return {
        mediaRuleIndex: state.mediaRuleIndex,
        mediaText: args[0].media.mediaText,
      };
    },
    post: (state, args) =>
      withEventNames(args, ["mediaRuleCloned"], (events) => {
        if (events.mediaRuleCloned) state.mediaRuleIndex++;
      }),
  });
  cloneProp = this.wrapFn(cloneProp, "cloneProp", {
    getAddress: (_state, args) => {
      return {
        selector: args[0].selectorText,
        mediaWidth: args[2].mediaWidth || "baseline",
        property: args[1],
      };
    },
  });
  cloneFluidProp = this.wrapFn(cloneFluidProp, "cloneFluidProp", {
    getAddress: (_state, args) => {
      return {
        property: args[0],
        styleRule: args[2].styleRule.selectorText,
        mediaWidth: args[2].mediaWidth || "baseline",
      };
    },
  });
  cloneSpecialProp = this.wrapFn(cloneSpecialProp, "cloneSpecialProp", {
    getAddress: (_state, args) => {
      return {
        property: args[0],
        styleRule: args[2].styleRule.selectorText,
        mediaWidth: args[2].mediaWidth || "baseline",
      };
    },
  });
}

const docClonerAssertionMaster = new DocClonerAssertionMaster();

function wrapAll() {
  wrap(
    docClonerAssertionMaster.cloneDoc,
    docClonerAssertionMaster.filterAccessibleSheets,
    docClonerAssertionMaster.cloneStyleSheet,
    docClonerAssertionMaster.cloneRules,
    docClonerAssertionMaster.preCloneRule,
    docClonerAssertionMaster.cloneRule,
    docClonerAssertionMaster.cloneStyleRule,
    docClonerAssertionMaster.cloneMediaRule,
    docClonerAssertionMaster.cloneProp,
    docClonerAssertionMaster.cloneFluidProp,
    docClonerAssertionMaster.cloneSpecialProp
  );
}

export { wrapAll, docClonerAssertionMaster };
