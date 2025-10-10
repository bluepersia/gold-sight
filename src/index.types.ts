type StateBase = {
  queueIndex: number;
  master?: any;
  callStack: number[];
};

type AssertionChain<TState, TArgs, TResult> = {
  [key: string]: AssertionStrong<TState, TArgs, TResult>;
};

type AssertionStrong<TState, TArgs, TResult> = (
  state: TState,
  args: TArgs,
  result: TResult
) => void;

type AssertionWeak = AssertionStrong<any, any, any>;

type AssertionBlueprint = {
  name: string;
  funcIndex: number;
  result: any;
  args: any;
  state: any;
  postOp?: (state: any, args: any[], result: any) => void;
};

type AssertionQueues = {
  [key: string]: Map<number, AssertionBlueprint>;
};

export declare function getQueue(globalKey: string): any;

declare abstract class AssertionMaster<TState, TMaster> {
  protected _state: (TState & StateBase) | undefined;
  private assertionChains: {
    [funcKey: string]: AssertionChain<TState, any, any>;
  };

  private _globalKey: string;
  private _master?: TMaster;

  constructor(
    assertionChains: {
      [funcKey: string]: AssertionChain<TState, any, any>;
    },
    globalKey: string
  );

  get globalKey(): string;

  set master(master: TMaster);
  get master(): TMaster | undefined;

  get state(): (TState & StateBase) | undefined;

  abstract newState(): TState;
  resetState(): void;
  assertQueue(options?: {
    sorting?: "asc" | "desc";
    showAllErrors?: boolean;
    masterIndex?: number;
    targetName?: string;
  }): void;

  wrapFn<T extends (...args: any[]) => any>(
    fn: T,
    name: string,
    processors?: {
      argsConverter?: (args: Parameters<T>) => any;
      resultConverter?: (result: ReturnType<T>) => any;
      pre?: (state: TState, args: Parameters<T>) => void;
      post?: (
        state: TState,
        args: Parameters<T>,
        result: ReturnType<T>
      ) => void;
    }
  ): T;

  wrapAll(): void;
  reset(): void;
  setQueue(queue: Map<number, AssertionBlueprint>): void;
  setQueueFromArray(queue: [number, AssertionBlueprint][]): void;
  runPostOps(): void;

  wrapTopFn<T extends (...args: any[]) => any>(
    fn: T,
    name: string,
    options?: {
      argsConverter?: (args: Parameters<T>) => any;
      pre?: (state: TState, args: Parameters<T>) => void;
      post?: (
        state: TState,
        args: Parameters<T>,
        result: ReturnType<T>
      ) => void;
      args?: Parameters<T>;
    }
  ): (...args: Parameters<T>) => ReturnType<T>;
}

type RunAssertionsParams<TState> = {
  nameWithLowestIndex: { name: string; lowestIndex: number }[];
  groupedByName: { [name: string]: AssertionBlueprint[] };
  assertionChains: {
    [funcKey: string]: AssertionChain<TState, any, any>;
  };
  globalKey: string;
  masterIndex: number;
};

type RunAssertionsOfNameParams<TState> = Pick<
  RunAssertionsParams<TState>,
  "assertionChains" | "groupedByName"
>;

export default AssertionMaster;

export type {
  AssertionChain,
  AssertionWeak,
  AssertionStrong,
  AssertionBlueprint,
  AssertionQueues,
  StateBase,
  RunAssertionsParams,
  RunAssertionsOfNameParams,
};
