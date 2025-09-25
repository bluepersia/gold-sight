import {
  AssertionBlueprint,
  AssertionChain,
  AssertionQueues,
  StateBase,
} from "./index.types";

const assertionQueues: AssertionQueues = {};

abstract class AssertionMaster<TState, TMaster> {
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
  ) {
    this.assertionChains = assertionChains;
    this._globalKey = globalKey;

    assertionQueues[globalKey] = {
      assertionQueue: new Map(),
      verifiedAssertions: new Map(),
    };
  }

  get globalKey() {
    return this._globalKey;
  }

  public set master(master: TMaster) {
    this._master = master;
  }

  public get master(): TMaster | undefined {
    return this._master;
  }

  get state() {
    return this._state;
  }

  abstract newState(): TState;

  resetState = () => {
    this._state = { ...this.newState(), funcIndex: 0, master: this.master };
  };

  assertQueue = (masterIndex: number | undefined) => {
    const { assertionQueue, verifiedAssertions } =
      assertionQueues[this.globalKey];

    verifiedAssertions.clear();
    console.groupCollapsed(
      `✅ ${this.globalKey} - ✨${masterIndex ?? this.state!.master!.index}`
    );
    const queueIndexes = Array.from(assertionQueue.keys()).sort(
      (a, b) => a - b
    );
    for (const queueIndex of queueIndexes) {
      const { name, result, args, state } = assertionQueue.get(queueIndex)!;
      const assertions = this.assertionChains[name];
      for (const [key, assertion] of Object.entries(assertions)) {
        (assertion as any)(state, args, result);

        let count = verifiedAssertions.get(key) || 0;
        count++;
        verifiedAssertions.set(key, count);
      }
    }
    for (const [key, count] of verifiedAssertions.entries()) {
      console.log(`✅ ${key} - ✨${count} times`);
    }
    console.groupEnd();

    this.reset();
  };

  wrapFn<T extends (...args: any[]) => any>(
    fn: T,
    name: string,
    processors?: {
      argsConverter?: (args: Parameters<T>) => any;
      pre?: (state: TState, args: Parameters<T>) => void;
      post?: (
        state: TState,
        args: Parameters<T>,
        result: ReturnType<T>
      ) => void;
    }
  ): T {
    return ((...args: Parameters<T>): ReturnType<T> => {
      const convertedArgs = processors?.argsConverter
        ? processors.argsConverter(args)
        : args;
      if (processors?.pre) processors.pre(this.state!, convertedArgs);
      const funcIndex = this.state!.funcIndex;
      this.state!.funcIndex++;

      const result = fn(...args);

      const assertionData = {
        state: this.state,
        result,
        name,
        args: convertedArgs,
        postOp: () => {},
      } as AssertionBlueprint;

      if (processors?.post) {
        assertionData.postOp = (state, args, result) => {
          const newState = { ...state };
          assertionData.state = newState;
          processors!.post!(state, args as Parameters<T>, result);
        };
      }

      assertionQueues[this.globalKey].assertionQueue.set(
        funcIndex,
        assertionData
      );

      return result;
    }) as T;
  }

  wrapAll() {}

  reset() {
    const { assertionQueue, verifiedAssertions } =
      assertionQueues[this.globalKey];

    assertionQueue.clear();
    verifiedAssertions.clear();
  }

  setQueue(queue: Map<number, AssertionBlueprint>) {
    assertionQueues[this.globalKey].assertionQueue = queue;
  }

  setQueueFromArray(queue: [number, AssertionBlueprint][]) {
    assertionQueues[this.globalKey].assertionQueue = new Map(queue);
  }

  runPostOps() {
    const { assertionQueue } = assertionQueues[this.globalKey];
    const queueIndexes = Array.from(assertionQueue.keys()).sort(
      (a, b) => a - b
    );
    for (const queueIndex of queueIndexes) {
      const value = assertionQueue.get(queueIndex)!;
      if (value.postOp) value.postOp(this.state, value.args, value.result);
    }
  }

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
  ): (...args: Parameters<T>) => ReturnType<T> {
    return (...args: Parameters<T>): ReturnType<T> => {
      this.resetState();
      this.setQueue(new Map());

      const wrappedFn = this.wrapFn(fn, name, options);
      const result = wrappedFn(...args);

      this.state!.master = this.master;

      this.runPostOps();

      return result;
    };
  }
}

function getQueue(globalKey: string) {
  if (!assertionQueues[globalKey])
    throw Error(`Assertion queue for ${globalKey} not found`);

  return assertionQueues[globalKey].assertionQueue;
}

export { getQueue };

export default AssertionMaster;
