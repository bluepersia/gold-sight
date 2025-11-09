import {
  AssertionBlueprint,
  AssertionChain,
  EventBus,
} from "../../../src/index.types";

type EventUUID = {
  eventUUID: string;
};

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
  eventMap: Map<string, number>;
};

type MathState = {
  absIndex: number;
  addAbsIndex: number;
  multAbsIndex: number;
  subAbsIndex: number;
  divAbsIndex: number;
  master?: Master;
};

type LogicContext = {
  eventBus?: EventBus;
  eventUUID?: string;
  eventUUIDs?: string[];
};

export { Master, MathState, EventUUID, LogicContext };
