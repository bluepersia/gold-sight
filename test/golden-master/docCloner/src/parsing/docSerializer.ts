import { isEqual } from "lodash";
import { splitBySpaces } from "../utils/stringHelpers";
import {
  DocClone,
  MediaRuleClone,
  StyleRuleClone,
  StyleSheetClone,
} from "./docClone";
import {
  PropsResults,
  SerializeDocContext,
  SerializePropContext,
  SerializeShorthandPropContext,
} from "./docSerializer.types";
import {
  FLUID_PROPERTY_NAMES,
  MEDIA_RULE_TYPE,
  SHORTHAND_PROPERTIES,
  SPECIAL_PROPERTIES,
  STYLE_RULE_TYPE,
} from "./docSerializerConsts";
import { normalizeSelector, normalizeZero } from "./normalizer";

let serializeDoc = (doc: Document, ctx: SerializeDocContext) => {
  const docClone = new DocClone(ctx.globalConfig);

  const accessibleStyleSheets = getAccessibleStyleSheets(doc.styleSheets);

  docClone.styleSheets = serializeStyleSheets(accessibleStyleSheets, ctx);
  return docClone;
};

let getAccessibleStyleSheets = (styleSheets: StyleSheetList) => {
  return Array.from(styleSheets).filter((styleSheet) => {
    try {
      const rules = styleSheet.cssRules;
      return rules ? true : false;
    } catch (error) {
      return false;
    }
  });
};

let serializeStyleSheets = (
  styleSheets: CSSStyleSheet[],
  ctx: SerializeDocContext
) => {
  return styleSheets.map((styleSheet) => serializeStyleSheet(styleSheet, ctx));
};

let serializeStyleSheet = (
  styleSheet: CSSStyleSheet,
  ctx: SerializeDocContext
) => {
  const styleSheetClone = new StyleSheetClone(ctx.globalConfig);
  styleSheetClone.rules = serializeRules(Array.from(styleSheet.cssRules), ctx);
  return styleSheetClone;
};

let serializeRules = (rules: CSSRule[], ctx: SerializeDocContext) => {
  return Array.from(rules)
    .map((rule) => serializeRule(rule, ctx))
    .filter((rule) => rule !== null);
};

let serializeRule = (rule: CSSRule, ctx: SerializeDocContext) => {
  let type;
  let result = null;
  switch (rule.type) {
    case STYLE_RULE_TYPE:
      type = STYLE_RULE_TYPE;
      result = serializeStyleRule(rule as CSSStyleRule, ctx);
      break;
    case MEDIA_RULE_TYPE:
      type = MEDIA_RULE_TYPE;
      result = serializeMediaRule(rule as CSSMediaRule, ctx);
      break;
    default:
      result = null;
  }
  const { event } = ctx;
  if (event) {
    if (result) event.emit("ruleSerialized", ctx, { type, result });
    else {
      const why = type ? "nullResult" : "unsupportedType";
      event.emit("ruleOmitted", ctx, { type, why });
    }
  }
  return result;
};

let serializeStyleRule = (
  styleRule: CSSStyleRule,
  ctx: SerializeDocContext
) => {
  const { globalConfig, event } = ctx;
  const { isBrowser } = ctx.globalConfig;
  const styleRuleClone = new StyleRuleClone(globalConfig);
  styleRuleClone.selector = isBrowser
    ? styleRule.selectorText
    : normalizeSelector(styleRule.selectorText);
  const { style, specialProps } = serializeProps(styleRule, ctx);

  if (Object.keys(style).length <= 0 && Object.keys(specialProps).length <= 0) {
    event?.emit("styleRuleOmitted", ctx, { why: "noProps" });
    return null;
  }
  styleRuleClone.style = style;
  styleRuleClone.specialProps = specialProps;
  event?.emit("styleRuleSerialized", ctx, { styleRuleClone });

  return styleRuleClone;
};

let serializeProps = (styleRule: CSSStyleRule, ctx: SerializeDocContext) => {
  const { event } = ctx;
  let propsResults: PropsResults = { style: {}, specialProps: {} };
  for (let i = 0; i < styleRule.style.length; i++) {
    const prop = styleRule.style[i];
    const newPropsResults = serializeProp(styleRule, prop, {
      ...ctx,
      propsResults,
    });
    if (event) {
      if (!isEqual(propsResults, newPropsResults)) {
        event?.emitOnce("propSerialized", ctx, { prop });
      }
    }
    propsResults = newPropsResults;
  }
  return propsResults;
};

let serializeProp = (
  styleRule: CSSStyleRule,
  prop: string,
  ctx: SerializePropContext
): PropsResults => {
  const { event } = ctx;
  let { propsResults } = ctx;
  const value = styleRule.style.getPropertyValue(prop);
  if (FLUID_PROPERTY_NAMES.has(prop)) {
    const newPropsResults = serializeFluidProp(value, prop, ctx);
    if (event) {
      if (!isEqual(propsResults.style, newPropsResults.style)) {
        event?.emit("fluidPropSerialized", ctx, { prop, value });
      }
    }
    propsResults = newPropsResults;
  } else if (SPECIAL_PROPERTIES.has(prop)) {
    const newPropsResults = {
      ...propsResults,
      specialProps: { ...propsResults.specialProps },
    };
    newPropsResults.specialProps[prop] = value;
    event?.emit("specialPropSerialized", ctx, { prop, value });
    propsResults = newPropsResults;
  }
  return propsResults;
};

let serializeFluidProp = (
  value: string,
  prop: string,
  ctx: SerializePropContext
): PropsResults => {
  const {
    event,
    globalConfig: { isBrowser },
  } = ctx;
  let { propsResults } = ctx;
  const shorthandMap = SHORTHAND_PROPERTIES[prop];
  if (shorthandMap) {
    const newPropsResults = serializeShorthandProp(value, shorthandMap, {
      ...ctx,
      prop,
    });
    if (event) {
      if (!isEqual(propsResults.style, newPropsResults.style)) {
        event?.emit("shorthandPropSerialized", ctx, { prop, value });
      }
    }
    return newPropsResults;
  } else {
    if (!isBrowser) value = normalizeZero(value);

    event?.emit("fluidPropSerialized", ctx, { prop, value });
    const style = { ...propsResults.style };
    style[prop] = value;
    return { ...propsResults, style };
  }
};

let serializeShorthandProp = (
  value: string,
  shorthandMap: Map<number, Map<number, string[]>>,
  ctx: SerializeShorthandPropContext
) => {
  const { event, propsResults } = ctx;
  const { isBrowser } = ctx.globalConfig;
  if (isBrowser) {
    event?.emit("browserSkip", ctx, {
      why: "browserHandlesShorthands",
    });
    return propsResults;
  }
  const shorthandSplit = splitBySpaces(value);
  const shothandLength = shorthandSplit.length;
  const shorthandInnerMap = shorthandMap.get(shothandLength);
  const style = { ...propsResults.style };
  if (shorthandInnerMap) {
    for (let j = 0; j < shorthandSplit.length; j++) {
      const shorthandValue = shorthandSplit[j];
      const properties = shorthandInnerMap.get(j);
      if (properties) {
        for (const explicitProp of properties) {
          style[explicitProp] = normalizeZero(shorthandValue);
        }
      }
    }
    event?.emit("shorthandExpanded", ctx, { style });
  }
  return { ...propsResults, style };
};
let serializeMediaRule = (rule: CSSMediaRule, ctx: SerializeDocContext) => {
  const { event } = ctx;
  const mediaRule = rule as CSSMediaRule;
  const match = mediaRule.media.mediaText.match(/\(min-width:\s*(\d+)px\)/);
  if (match) {
    const mediaRuleClone = new MediaRuleClone(ctx.globalConfig);
    mediaRuleClone.minWidth = Number(match[1]);
    mediaRuleClone.rules = serializeRules(Array.from(mediaRule.cssRules), ctx);
    event?.emit("mediaRuleSerialized", ctx, { mediaRuleClone });
    return mediaRuleClone;
  }
  event?.emit("mediaRuleOmitted", ctx, { why: "noMinWidth" });
  return null;
};

function wrap(
  serializeDocWrapped: typeof serializeDoc,
  getAccessibleStyleSheetsWrapped: typeof getAccessibleStyleSheets,
  serializeStyleSheetsWrapped: typeof serializeStyleSheets,
  serializeStyleSheetWrapped: typeof serializeStyleSheet,
  serializeRulesWrapped: typeof serializeRules,
  serializeRuleWrapped: typeof serializeRule,
  serializeStyleRuleWrapped: typeof serializeStyleRule,
  serializePropsWrapped: typeof serializeProps,
  serializePropWrapped: typeof serializeProp,
  serializeFluidPropWrapped: typeof serializeFluidProp,
  serializeShorthandPropWrapped: typeof serializeShorthandProp,
  serializeMediaRuleWrapped: typeof serializeMediaRule
) {
  serializeDoc = serializeDocWrapped;
  getAccessibleStyleSheets = getAccessibleStyleSheetsWrapped;
  serializeStyleSheets = serializeStyleSheetsWrapped;
  serializeStyleSheet = serializeStyleSheetWrapped;
  serializeRules = serializeRulesWrapped;
  serializeRule = serializeRuleWrapped;
  serializeStyleRule = serializeStyleRuleWrapped;
  serializeProps = serializePropsWrapped;
  serializeProp = serializePropWrapped;
  serializeFluidProp = serializeFluidPropWrapped;
  serializeShorthandProp = serializeShorthandPropWrapped;
  serializeMediaRule = serializeMediaRuleWrapped;
}

export {
  serializeDoc,
  serializeStyleSheet,
  serializeRules,
  serializeRule,
  serializeStyleRule,
  serializeProps,
  serializeMediaRule,
  getAccessibleStyleSheets,
  serializeStyleSheets,
  wrap,
  serializeProp,
  serializeFluidProp,
  serializeShorthandProp,
};
