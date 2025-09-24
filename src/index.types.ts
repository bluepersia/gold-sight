type AssertionChain<TState, TResult, TArgs> = {
  [key: string]: AssertionStrong<TState, TResult, TArgs>;
};

type AssertionStrong<TState, TResult, TArgs> = (
  state: TState,
  result: TResult,
  args: TArgs
) => void;

type AssertionWeak = AssertionStrong<any, any, any>;

type AssertionBlueprint = {
  name: string;
  result: any;
  args: any;
  state: any;
  postOp?: (state: any, args: any[], result: any) => void;
};

type AssertionQueues = {
  [key: string]: {
    assertionQueue: Map<number, AssertionBlueprint>;
    verifiedAssertions: Map<string, number>;
  };
};

export declare function getQueue(globalKey: string): any;

declare const AssertionMaster: any;
export default AssertionMaster;

export type {
  AssertionChain,
  AssertionWeak,
  AssertionStrong,
  AssertionBlueprint,
  AssertionQueues,
};
