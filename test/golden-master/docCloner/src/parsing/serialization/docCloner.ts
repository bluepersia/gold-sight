import { MEDIA_RULE_TYPE, STYLE_RULE_TYPE } from "../../index.types.ts";
import { splitBySpaces } from "../../utils/stringHelpers.ts";
import {
  DocClone,
  MediaRuleClone,
  RuleClone,
  SheetClone,
  StyleRuleClone,
} from "./docClone.ts";
import type {
  CloneDocContext,
  CloneFluidPropContext,
  ClonePropContext,
  ClonePropsState,
  CloneRulesContext,
  CloneSheetContext,
  CloneSpecialPropContext,
} from "./docCloner.types.ts";
import {
  FLUID_PROPERTY_NAMES,
  SHORTHAND_PROPERTIES,
  SPECIAL_PROPERTIES,
} from "./docClonerConsts.ts";
import "../../global.d.ts";

let cloneDoc = (doc: Document, ctx: CloneDocContext): DocClone => {
  const docClone = new DocClone(ctx);

  const accessibleSheets = filterAccessibleSheets(doc.styleSheets);

  docClone.sheets = accessibleSheets.map((sheet, sheetIndex) =>
    cloneStyleSheet(sheet, dev ? { ...ctx, sheetIndex } : ctx)
  );

  return docClone;
};

let cloneStyleSheet = (
  sheet: CSSStyleSheet,
  ctx: CloneSheetContext
): SheetClone => {
  const sheetClone = new SheetClone(ctx);

  const subCtx = ctx as CloneRulesContext;
  if (dev) subCtx.rulesParent = `sheetIndex:${ctx.sheetIndex}`;

  sheetClone.rules = cloneRules(sheet.cssRules, subCtx);

  if (ctx.breakStyleRules || ctx.breakMedia) sheetClone.rules = [];

  return sheetClone;
};

let cloneRules = (rules: CSSRuleList, ctx: CloneRulesContext): RuleClone[] => {
  return Array.from(rules)
    .map((rule) => preCloneRule(rule, ctx))
    .filter((rule) => rule !== null);
};

let preCloneRule = (
  rule: CSSRule,
  ctx: CloneRulesContext
): RuleClone | null => {
  return cloneRule(rule, ctx);
};

let cloneRule = (rule: CSSRule, ctx: CloneRulesContext): RuleClone | null => {
  const { event } = ctx;
  let result: RuleClone | null = null;
  let type: typeof STYLE_RULE_TYPE | typeof MEDIA_RULE_TYPE | null = null;
  if (rule.type === STYLE_RULE_TYPE) {
    result = cloneStyleRule(rule as CSSStyleRule, ctx);
    type = STYLE_RULE_TYPE;
  } else if (rule.type === MEDIA_RULE_TYPE) {
    result = cloneMediaRule(rule as CSSMediaRule, ctx);
    type = MEDIA_RULE_TYPE;
  }

  if (dev) {
    if (result) event?.emit("ruleCloned", ctx, { rule: result });
    else
      event?.emit("ruleOmitted", ctx, {
        why: type ? "nullResult" : "typeNotSupported",
      });
  }

  return result;
};

let cloneStyleRule = (
  styleRule: CSSStyleRule,
  ctx: CloneRulesContext
): StyleRuleClone | null => {
  const { event } = ctx;
  const styleRuleClone = new StyleRuleClone(ctx);
  styleRuleClone.selector = normalizeSelector(styleRule.selectorText);
  let propsState: ClonePropsState = {
    style: {},
    specialProps: {},
  };

  for (let i = 0; i < styleRule.style.length; i++) {
    const property = styleRule.style[i];
    propsState = cloneProp(styleRule, property, { ...ctx, propsState });
  }

  if (
    Object.keys(propsState.style).length <= 0 &&
    Object.keys(propsState.specialProps).length <= 0
  ) {
    if (dev)
      event?.emit("styleRuleOmitted", ctx, {
        why: "noProps",
      });
    return null;
  }

  styleRuleClone.style = propsState.style;
  styleRuleClone.specialProps = propsState.specialProps;

  ctx.counter.orderID++;
  styleRuleClone.orderID = ctx.counter.orderID;
  if (dev) event?.emit("styleRuleCloned", ctx, { rule: styleRuleClone });

  if (ctx.breakStyleRules) {
    for (const breakStr of ctx.breakStyleRules) {
      if (styleRuleClone.selector === breakStr) {
        console.log("breaking on", breakStr);
        return null;
      }
    }
  }
  return styleRuleClone;
};

let cloneProp = (
  styleRule: CSSStyleRule,
  property: string,
  ctx: ClonePropContext
) => {
  const { event } = ctx;
  let { propsState } = ctx;
  const value = styleRule.style.getPropertyValue(property);

  if (FLUID_PROPERTY_NAMES.has(property)) {
    propsState = cloneFluidProp(property, value, { ...ctx, styleRule });
  } else if (SPECIAL_PROPERTIES.has(property)) {
    propsState = cloneSpecialProp(property, value, { ...ctx, styleRule });
  } else {
    if (dev) event?.emit("propOmitted", ctx, { why: "notFluidOrSpecial" });
  }
  return propsState;
};

let cloneFluidProp = (
  property: string,
  value: string,
  ctx: CloneFluidPropContext
): ClonePropsState => {
  const { event, styleRule } = ctx;
  let { propsState } = ctx;
  const eventKey = { property, styleRule, eventType: "fluidProp" };
  const shorthandMap = SHORTHAND_PROPERTIES[property];

  if (shorthandMap) {
    const values = splitBySpaces(value);
    const valuesCount = values.length;
    const innerMap = shorthandMap.get(valuesCount)!;
    propsState = { ...propsState, style: { ...propsState.style } };
    for (let i = 0; i < valuesCount; i++) {
      const value = values[i];
      const explicitProps = innerMap.get(i)!;
      for (let j = 0; j < explicitProps.length; j++) {
        const explicitProp = explicitProps[j];
        propsState.style[explicitProp] = normalizeZero(value);
      }
      event?.emit("expandedShorthand", ctx, eventKey);
    }
    return propsState;
  }
  propsState = { ...propsState, style: { ...propsState.style } };
  propsState.style[property] = normalizeZero(value);
  if (dev) event?.emit("fluidPropCloned", ctx, eventKey);
  return propsState;
};

let cloneSpecialProp = (
  property: string,
  value: string,
  ctx: CloneSpecialPropContext
): ClonePropsState => {
  const { event, styleRule } = ctx;
  let { propsState } = ctx;
  propsState = {
    ...propsState,
    specialProps: { ...propsState.specialProps },
  };
  propsState.specialProps[property] = value;
  if (dev)
    event?.emit("specialPropCloned", ctx, {
      property,
      styleRule,
      eventType: "specialProp",
    });
  return propsState;
};
function normalizeZero(input: string): string {
  return input.replace(
    /(?<![\d.])0+(?:\.0+)?(?![\d.])(?!(px|em|rem|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc)\b)/g,
    "0px"
  );
}

function normalizeSelector(selector: string): string {
  return selector
    .replace(/\*::(before|after)\b/g, "::$1")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

let cloneMediaRule = (
  mediaRule: CSSMediaRule,
  ctx: CloneRulesContext
): MediaRuleClone | null => {
  const { event } = ctx;
  const match = mediaRule.media.mediaText.match(/\(min-width:\s*(\d+)px\)/);

  if (match) {
    const mediaRuleClone = new MediaRuleClone(ctx);
    const width: number = Number(match[1]);
    mediaRuleClone.minWidth = width;
    if (ctx.breakMedia === width) mediaRuleClone.minWidth = 0;

    const subCtx: CloneRulesContext = {
      ...ctx,
      rulesParent: mediaRule.media.mediaText,
    };
    if (dev) {
      event?.emit("mediaRuleCloned", ctx, { rule: mediaRuleClone });
      subCtx.mediaWidth = width;
    }
    mediaRuleClone.rules = cloneRules(
      mediaRule.cssRules,
      subCtx
    ) as StyleRuleClone[];

    return mediaRuleClone;
  }
  if (dev) event?.emit("mediaRuleOmitted", ctx, { why: "noMinWidth" });
  return null;
};

let filterAccessibleSheets: (sheets: StyleSheetList) => CSSStyleSheet[] = (
  sheets: StyleSheetList
): CSSStyleSheet[] => {
  return Array.from(sheets).filter((sheet) => {
    try {
      const rules = sheet.cssRules;
      return rules ? true : false;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      return false;
    }
  });
};

function wrap(
  cloneDocWrapped: typeof cloneDoc,
  filterAccessibleSheetsWrapped: typeof filterAccessibleSheets,
  cloneStyleSheetWrapped: typeof cloneStyleSheet,
  cloneRulesWrapped: typeof cloneRules,
  preCloneRuleWrapped: typeof preCloneRule,
  cloneRuleWrapped: typeof cloneRule,
  cloneStyleRuleWrapped: typeof cloneStyleRule,
  cloneMediaRuleWrapped: typeof cloneMediaRule,
  clonePropWrapped: typeof cloneProp,
  cloneFluidPropWrapped: typeof cloneFluidProp,
  cloneSpecialPropWrapped: typeof cloneSpecialProp
) {
  cloneDoc = cloneDocWrapped;
  filterAccessibleSheets = filterAccessibleSheetsWrapped;
  cloneStyleSheet = cloneStyleSheetWrapped;
  cloneRules = cloneRulesWrapped;
  preCloneRule = preCloneRuleWrapped;
  cloneRule = cloneRuleWrapped;
  cloneStyleRule = cloneStyleRuleWrapped;
  cloneMediaRule = cloneMediaRuleWrapped;
  cloneProp = clonePropWrapped;
  cloneFluidProp = cloneFluidPropWrapped;
  cloneSpecialProp = cloneSpecialPropWrapped;
}

export {
  cloneDoc,
  cloneRules,
  wrap,
  filterAccessibleSheets,
  cloneStyleSheet,
  cloneRule,
  cloneStyleRule,
  cloneMediaRule,
  cloneProp,
  cloneFluidProp,
  cloneSpecialProp,
  preCloneRule,
};
