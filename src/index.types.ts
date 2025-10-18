type StateBase<TMaster> = {
  queueIndex: number;
  master?: TMaster;
  callStack: number[];
  branchCounter: Map<number, number>;
};

type AssertionChain<TState, TArgs, TResult> = {
  [key: string]: AssertionStrong<TState, TArgs, TResult>;
};

type AssertionChainForFunc<
  TState,
  TFunc extends (...args: any[]) => any
> = AssertionChain<TState, Parameters<TFunc>, ReturnType<TFunc>>;

type AssertionStrong<TState, TArgs, TResult> = (
  state: TState,
  args: TArgs,
  result: TResult,
  allAssertions: AssertionBlueprint[]
) => void;

type AssertionWeak = AssertionStrong<any, any, any>;

type AssertionForFunc<
  TState,
  TFunc extends (...args: any[]) => any
> = AssertionStrong<TState, Parameters<TFunc>, ReturnType<TFunc>>;

type AssertionBlueprint<TState = any, TArgs = any, TResult = any> = {
  name: string;
  id: string;
  funcIndex: number;
  result: TResult;
  args: TArgs;
  state: TState;
  branchCount: number;
  context?: any;
  requirement?: (context: any) => boolean;
  postOp?: (state: any, args: any[], result: any) => void;
};

type AssertionBlueprintForFunc<
  TState,
  TFunc extends (...args: any[]) => any
> = AssertionBlueprint<TState, Parameters<TFunc>, ReturnType<TFunc>>;

type AssertionQueues = {
  [key: string]: Map<number, AssertionBlueprint>;
};

type AssertOptions = {
  errorAlgorithm?: "firstOfDeepest" | "deepest";
  master?: { index: number; step?: number };
  showAllErrors?: boolean;
  targetName?: string;
  logMasterName?: string;
};

type DeepCloneOptions = {
  result?: boolean;
  args?: boolean;
};

export interface Config<TState> {
  assert?: AssertOptions;
  deepClone?: DeepCloneOptions;
  onlyRunFirstTopFn?: boolean;
  insertionRequirement?: (context: any) => boolean;
  assertionRequirement?: (context: any) => boolean;
  getReqContext?: (state: TState, args: any, result?: any) => any;
}

export declare function getQueue(globalKey: string): any;

declare abstract class AssertionMaster<TState, TMaster> {
  protected _state: (TState & StateBase<TMaster>) | undefined;
  private assertionChains: {
    [funcKey: string]: AssertionChain<TState, any, any>;
  };

  private _globalKey: string;
  private _master?: TMaster;
  private _hasFirstTopFnRun: boolean;

  constructor(
    assertionChains: {
      [funcKey: string]: AssertionChain<TState, any, any>;
    },
    globalKey: string,
    globalOptions?: Config<TState>
  );

  get globalKey(): string;

  set master(master: TMaster);
  get master(): TMaster | undefined;

  get state(): (TState & StateBase<TMaster>) | undefined;

  get hasFirstTopFnRun(): boolean;
  resetTopFnCounter(): void;

  abstract newState(): TState;
  resetState(): void;
  assertQueue(options?: AssertOptions): void;

  wrapFn<T extends (...args: any[]) => any>(
    fn: T,
    name: string,
    processors?: {
      argsConverter?: (args: Parameters<T>) => any;
      resultConverter?: (result: ReturnType<T>, args: Parameters<T>) => any;
      pre?: (state: TState, args: Parameters<T>) => void;
      post?: (
        state: TState,
        args: Parameters<T>,
        result: ReturnType<T>
      ) => void;
      deepClone?: DeepCloneOptions;
      getId?: (args: Parameters<T>, result?: ReturnType<T>) => string;
      insertionRequirement?: (context: any) => boolean;
      assertionRequirement?: (context: any) => boolean;
      getReqContext?: (
        state: TState,
        args: Parameters<T>,
        result?: ReturnType<T>
      ) => any;
    }
  ): T;

  wrapAll(): void;
  reset(): void;
  setQueue(queue: Map<number, AssertionBlueprint>): void;
  getQueue(): Map<number, AssertionBlueprint>;
  setQueueFromArray(queue: [number, AssertionBlueprint][]): void;
  runPostOps(): void;

  wrapTopFn<T extends (...args: any[]) => any>(
    fn: T,
    name: string,
    options?: {
      argsConverter?: (args: Parameters<T>) => any;
      resultConverter?: (result: ReturnType<T>, args: Parameters<T>) => any;
      pre?: (state: TState, args: Parameters<T>) => void;
      post?: (
        state: TState,
        args: Parameters<T>,
        result: ReturnType<T>
      ) => void;
      args?: Parameters<T>;
      getId?: (args: Parameters<T>, result?: ReturnType<T>) => string;
      insertionRequirement?: (context: any) => boolean;
      assertionRequirement?: (context: any) => boolean;
      getReqContext?: (
        state: TState,
        args: Parameters<T>,
        result?: ReturnType<T>
      ) => any;
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
  AssertOptions,
  DeepCloneOptions,
  AssertionBlueprintForFunc,
  AssertionForFunc,
  AssertionChainForFunc,
};
