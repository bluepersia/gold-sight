import { MEDIA_RULE_TYPE, STYLE_RULE_TYPE } from "../src/index.types";
import {
  DocClone,
  MediaRuleClone,
  RuleClone,
  StyleRuleClone,
} from "../src/parsing/serialization/docClone";
import { AbsCounter } from "../../../../src/utils/absCounter";

function findRules(doc: DocClone, index: number): RuleClone[] {
  const counter = new AbsCounter(index);
  for (const sheet of doc.sheets) {
    if (counter.match()) return sheet.rules;

    for (const rule of sheet.rules.filter(
      (rule) => rule.type === MEDIA_RULE_TYPE
    )) {
      const mediaRule = rule as MediaRuleClone;
      if (counter.match()) return mediaRule.rules;
    }
  }
  return [];
}

function findRule(doc: DocClone, index: number): RuleClone | null {
  const counter = new AbsCounter(index);
  for (const sheet of doc.sheets) {
    for (const rule of sheet.rules) {
      if (counter.match()) return rule;

      if (rule.type === MEDIA_RULE_TYPE) {
        const mediaRule = rule as MediaRuleClone;
        for (const styleRule of mediaRule.rules) {
          if (counter.match()) return styleRule;
        }
      }
    }
  }
  return null;
}

function findStyleRule(doc: DocClone, index: number): StyleRuleClone | null {
  const counter = new AbsCounter(index);
  for (const sheet of doc.sheets) {
    for (const rule of sheet.rules) {
      if (rule.type === STYLE_RULE_TYPE) {
        if (counter.match()) return rule as StyleRuleClone;
      } else if (rule.type === MEDIA_RULE_TYPE) {
        const mediaRule = rule as MediaRuleClone;
        for (const styleRule of mediaRule.rules) {
          if (counter.match()) return styleRule;
        }
      }
    }
  }
  return null;
}

function findMediaRule(doc: DocClone, index: number): MediaRuleClone | null {
  const counter = new AbsCounter(index);
  for (const sheet of doc.sheets) {
    for (const rule of sheet.rules) {
      if (rule.type === MEDIA_RULE_TYPE) {
        if (counter.match()) return rule as MediaRuleClone;
      }
    }
  }
  return null;
}

export { findRule, findRules, findStyleRule, findMediaRule };
