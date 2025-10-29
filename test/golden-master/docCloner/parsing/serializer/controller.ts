import {
  DocClone,
  MediaRuleClone,
  StyleRuleClone,
} from "../../src/parsing/docClone";
import { AbsCounter } from "../../../../../src/utils/absCounter";
import {
  MEDIA_RULE_TYPE,
  STYLE_RULE_TYPE,
} from "../../src/parsing/docSerializerConsts";
function findRule(docClone: DocClone, index: number) {
  const counter = new AbsCounter(index);
  for (const sheet of docClone.styleSheets) {
    for (const rule of sheet.rules) {
      if (counter.match()) return rule;
      if (rule.type === MEDIA_RULE_TYPE) {
        for (const subRule of (rule as MediaRuleClone).rules) {
          if (counter.match()) return subRule;
        }
      }
    }
  }
  return null;
}

function findRules(docClone: DocClone, index: number) {
  const counter = new AbsCounter(index);
  for (const sheet of docClone.styleSheets) {
    if (counter.match()) return sheet.rules;
    for (const rule of sheet.rules) {
      if (rule.type === MEDIA_RULE_TYPE) {
        if (counter.match()) return (rule as MediaRuleClone).rules;
      }
    }
  }
  return [];
}

function findStyleRule(docClone: DocClone, index: number) {
  const counter = new AbsCounter(index);
  for (const sheet of docClone.styleSheets) {
    for (const rule of sheet.rules) {
      if (rule.type === STYLE_RULE_TYPE) {
        if (counter.match()) return rule as StyleRuleClone;
      } else if (rule.type === MEDIA_RULE_TYPE) {
        for (const subRule of (rule as MediaRuleClone).rules) {
          if (subRule.type === STYLE_RULE_TYPE) {
            if (counter.match()) return subRule as StyleRuleClone;
          }
        }
      }
    }
  }
  return null;
}

function findMediaRule(docClone: DocClone, index: number) {
  const counter = new AbsCounter(index);
  for (const sheet of docClone.styleSheets) {
    for (const rule of sheet.rules) {
      if (rule.type === MEDIA_RULE_TYPE) {
        if (counter.match()) return rule as MediaRuleClone;
      }
    }
  }
  return null;
}

export { findRule, findRules, findStyleRule, findMediaRule };
