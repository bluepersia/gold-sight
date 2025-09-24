import {
  AssertionBlueprint,
  AssertionChain,
  AssertionQueues,
} from "./index.types";

const assertionQueues: AssertionQueues = {};

class AssertionMaster<
  TState extends { funcIndex: number; master?: { index: number } },
  TMaster extends { index: number }
> {
  protected state: TState;
  private assertionChains: {
    [funcKey: string]: AssertionChain<TState, any, any>;
  };

  protected globalKey: string;

  constructor(
    state: TState,
    assertionChains: {
      [funcKey: string]: AssertionChain<TState, any, any>;
    },
    globalKey: string
  ) {
    this.state = state;
    this.assertionChains = assertionChains;
    this.globalKey = globalKey;

    assertionQueues[globalKey] = {
      assertionQueue: new Map(),
      verifiedAssertions: new Map(),
    };
  }

  assertQueue() {
    const { assertionQueue, verifiedAssertions } =
      assertionQueues[this.globalKey];

    verifiedAssertions.clear();
    console.groupCollapsed(
      `✅ ${this.globalKey} - ✨${this.state.master!.index}`
    );
    const queueIndexes = Array.from(assertionQueue.keys()).sort(
      (a, b) => a - b
    );
    for (const queueIndex of queueIndexes) {
      const { name, result, args, state } = assertionQueue.get(queueIndex)!;
      const assertions = this.assertionChains[name];
      for (const [key, assertion] of Object.entries(assertions)) {
        (assertion as any)(state, result, args);

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
  }

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
      if (processors?.pre) processors.pre(this.state, convertedArgs);
      const funcIndex = this.state.funcIndex++;

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

  callTopFn<T extends (...args: any[]) => any>(
    fn: T,
    master: TMaster,
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
  ): ReturnType<T> {
    this.state.funcIndex = 0;
    this.state.master = master;

    // Optionally call pre processor
    const convertedArgs = options?.argsConverter
      ? options.argsConverter(options.args!)
      : options?.args!;
    if (options?.pre) options.pre(this.state, convertedArgs);

    // Call the original function
    const result = fn(...(options?.args || []));

    // Run all queued postOps after the function executes

    // Optionally call post processor for top-level function
    if (options?.post) options.post(this.state, convertedArgs, result);

    this.runPostOps();

    return result;
  }
}

function getQueue(globalKey: string) {
  if (!assertionQueues[globalKey])
    throw Error(`Assertion queue for ${globalKey} not found`);

  return assertionQueues[globalKey].assertionQueue;
}

export { getQueue };

export default AssertionMaster;
