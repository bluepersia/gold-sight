import { AssertionBlueprint, AssertionChain } from "../../../src/index.types";

type Master = {
  finalResults: number[];
  addResults: number[];
  subResults: number[];
  multResults: number[];
  divResults: number[];
  finalQueue: Map<number, AssertionBlueprint>;
  assertionChains?: {
    [funcKey: string]: AssertionChain<any, any, any>;
  };
  index: number;
  topFunc: Function;
  subfunc: Function;
  assertionMaster?: any;
};

export { Master };
