import type { Global } from "../../index.types";
import { MEDIA_RULE_TYPE, STYLE_RULE_TYPE } from "../../index.types";

class DocClone {
  public sheets: SheetClone[] = [];
  #state: Global;
  constructor(state: Global) {
    this.#state = state;
  }

  public get state() {
    return this.#state;
  }

  addSheet() {
    const newSheet = new SheetClone(this.state);
    this.sheets.push(newSheet);
    return newSheet;
  }
}

class SheetClone {
  public rules: RuleClone[] = [];
  #state: Global;
  constructor(state: Global) {
    this.#state = state;
  }

  public get state() {
    return this.#state;
  }

  addStyleRule() {
    const newStyleRule = new StyleRuleClone(this.state);
    this.rules.push(newStyleRule);
    return newStyleRule;
  }

  addMediaRule() {
    const newMediaRule = new MediaRuleClone(this.state);
    this.rules.push(newMediaRule);
    return newMediaRule;
  }
}

class RuleClone {
  public type: typeof STYLE_RULE_TYPE | typeof MEDIA_RULE_TYPE;
  #state: Global;
  constructor(
    type: typeof STYLE_RULE_TYPE | typeof MEDIA_RULE_TYPE,
    state: Global
  ) {
    this.type = type;
    this.#state = state;
  }

  public get state() {
    return this.#state;
  }
}

class StyleRuleClone extends RuleClone {
  public selector: string = "";
  public style: Record<string, string> = {};
  public specialProps: Record<string, string> = {};
  public orderID: number = -1;
  constructor(state: Global) {
    super(STYLE_RULE_TYPE, state);
  }
}

class MediaRuleClone extends RuleClone {
  public rules: StyleRuleClone[] = [];
  public minWidth: number = 0;
  constructor(state: Global) {
    super(MEDIA_RULE_TYPE, state);
  }

  addStyleRule() {
    const newStyleRule = new StyleRuleClone(this.state);
    this.rules.push(newStyleRule);
    return newStyleRule;
  }
}

export { DocClone, SheetClone, RuleClone, StyleRuleClone, MediaRuleClone };
