import {
  FluidPropertyMetaData,
  FluidRange,
  GlobalConfig,
} from "../index.types";

class FluidData {
  public anchors: Record<string, AnchorData> = {};
  #globalConfig: GlobalConfig;

  constructor(globalConfig: GlobalConfig) {
    this.#globalConfig = globalConfig;
  }

  get globalConfig() {
    return this.#globalConfig;
  }

  addAnchor(anchor: string) {
    if (this.anchors[anchor]) {
      return this.anchors[anchor];
    }
    const anchorData = (this.anchors[anchor] = new AnchorData(
      this.#globalConfig
    ));
    return anchorData;
  }

  getAnchor(anchor: string) {
    return this.anchors[anchor];
  }

  addAutoForceProperty(
    anchor: string,
    selector: string,
    property: string,
    value: string
  ) {
    if (!this.#globalConfig.autoForce) {
      return;
    }
    const anchorData = this.addAnchor(anchor);
    const selectorData = anchorData.addSelector(selector);
    const propertyData = selectorData.addProperty(property);
    propertyData.forceValue = value;
    return propertyData;
  }
}

class AnchorData {
  public selectors: Record<string, SelectorData> = {};
  #globalConfig: GlobalConfig;

  constructor(globalConfig: GlobalConfig) {
    this.#globalConfig = globalConfig;
  }

  get globalConfig() {
    return this.#globalConfig;
  }

  addSelector(selector: string) {
    if (this.selectors[selector]) {
      return this.selectors[selector];
    }
    const selectorData = (this.selectors[selector] = new SelectorData(
      this.#globalConfig
    ));
    return selectorData;
  }

  getSelector(selector: string) {
    return this.selectors[selector];
  }
}

class SelectorData {
  public properties: Record<string, PropertyData> = {};
  #globalConfig: GlobalConfig;

  constructor(globalConfig: GlobalConfig) {
    this.#globalConfig = globalConfig;
  }

  get globalConfig() {
    return this.#globalConfig;
  }

  addProperty(property: string) {
    if (this.properties[property]) {
      return this.properties[property];
    }
    const propertyData = (this.properties[property] = new PropertyData(
      this.#globalConfig
    ));
    return propertyData;
  }

  getProperty(property: string) {
    return this.properties[property];
  }
}

class PropertyData {
  public metaData: Omit<FluidPropertyMetaData, "property"> = {
    orderID: -1,
  };
  public forceValue?: string;
  public ranges?: FluidRange[];
  #globalConfig: GlobalConfig;

  constructor(globalConfig: GlobalConfig) {
    this.#globalConfig = globalConfig;
  }

  get globalConfig() {
    return this.#globalConfig;
  }
}

export { FluidData, AnchorData, SelectorData, PropertyData };
