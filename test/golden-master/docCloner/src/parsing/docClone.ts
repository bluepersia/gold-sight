import { GlobalConfig } from "../index.types";
import { MEDIA_RULE_TYPE, STYLE_RULE_TYPE } from "./docSerializerConsts";

class DocClone {
  public styleSheets: StyleSheetClone[] = [];
  #globalConfig: GlobalConfig;

  constructor(globalConfig: GlobalConfig) {
    this.#globalConfig = globalConfig;
  }

  get globalConfig() {
    return this.#globalConfig;
  }

  addStyleSheet() {
    const styleSheet = new StyleSheetClone(this.#globalConfig);
    this.styleSheets.push(styleSheet);
    return styleSheet;
  }
}

class StyleSheetClone {
  public rules: RuleClone[] = [];
  #globalConfig: GlobalConfig;

  constructor(globalConfig: GlobalConfig) {
    this.#globalConfig = globalConfig;
  }

  get globalConfig() {
    return this.#globalConfig;
  }

  addStyleRule() {
    const styleRule = new StyleRuleClone(this.#globalConfig);
    this.rules.push(styleRule);
    return styleRule;
  }

  addMediaRule() {
    const mediaRule = new MediaRuleClone(this.#globalConfig);
    this.rules.push(mediaRule);
    return mediaRule;
  }
}

class RuleClone {
  public type: typeof STYLE_RULE_TYPE | typeof MEDIA_RULE_TYPE;
  #globalConfig: GlobalConfig;

  constructor(
    globalConfig: GlobalConfig,
    type: typeof STYLE_RULE_TYPE | typeof MEDIA_RULE_TYPE
  ) {
    this.#globalConfig = globalConfig;
    this.type = type;
  }

  get globalConfig() {
    return this.#globalConfig;
  }
}

class StyleRuleClone extends RuleClone {
  public selector: string = "";
  public style: Record<string, string> = {};
  public specialProps: Record<string, string> = {};

  constructor(globalConfig: GlobalConfig) {
    super(globalConfig, STYLE_RULE_TYPE);
  }
}
class MediaRuleClone extends RuleClone {
  public minWidth: number = 0;
  public rules: RuleClone[] = [];

  constructor(globalConfig: GlobalConfig) {
    super(globalConfig, MEDIA_RULE_TYPE);
  }

  addStyleRule() {
    const styleRule = new StyleRuleClone(this.globalConfig);
    this.rules.push(styleRule);
    return styleRule;
  }
}

export { DocClone, StyleSheetClone, RuleClone, StyleRuleClone, MediaRuleClone };
