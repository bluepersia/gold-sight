import {
  AssertionBlueprint,
  AssertionChain,
  AssertionQueues,
  AssertOptions,
  Config,
  DeepCloneOptions,
  StateBase,
} from "./index.types";
import { deepClone } from "./utils/deepClone";

const assertionQueues: AssertionQueues = {};

abstract class AssertionMaster<TState, TMaster> {
  protected _state: (TState & StateBase<TMaster>) | undefined;
  private assertionChains: {
    [funcKey: string]: AssertionChain<TState, any, any>;
  };

  private _globalKey: string;
  private _master?: TMaster;
  private _globalOptions: Config | undefined;

  constructor(
    assertionChains: {
      [funcKey: string]: AssertionChain<TState, any, any>;
    },
    globalKey: string,
    globalOptions?: Config
  ) {
    this.assertionChains = assertionChains;
    this._globalKey = globalKey;
    this._globalOptions = globalOptions;

    assertionQueues[globalKey] = new Map();
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
    this._state = {
      ...this.newState(),
      master: this.master,
      callStack: [],
      branchCounter: new Map(),
      queueIndex: 0,
    };
  };

  assertQueue = (options?: AssertOptions) => {
    options = {
      errorAlgorithm: "firstOfDeepest",
      ...(this._globalOptions?.assert || {}),
      ...(options || {}),
    };

    const assertionQueue = assertionQueues[this.globalKey];

    const verifiedAssertions = new Map<string, number>();

    if (!this.state?.master && options?.master === undefined)
      console.error(`No master indexes set. Provide it via options.`);

    console.groupCollapsed(
      `✅ ${this.globalKey} - ✨${
        options?.master
          ? printMaster(options.master)
          : printMaster(this.state?.master)
      }`
    );
    // Step 1: Group items by function name
    let groupedByName: { [name: string]: AssertionBlueprint[] } = {};
    for (const [, item] of assertionQueue.entries()) {
      if (!groupedByName[item.name]) groupedByName[item.name] = [];
      groupedByName[item.name].push(item);
    }

    if (options.targetName) {
      if (groupedByName.hasOwnProperty(options.targetName))
        groupedByName = {
          [options.targetName]: groupedByName[options.targetName],
        };
    }

    // Step 2: Determine the highest funcIndex for each name
    const nameWithHighestIndex = Object.entries(groupedByName).map(
      ([name, items]) => ({
        name,
        highestIndex: Math.max(...items.map((i) => i.funcIndex)),
      })
    );

    // Step 3: Sort names based on their highest funcIndex
    nameWithHighestIndex.sort((a, b) => {
      return b.highestIndex - a.highestIndex;
    });

    let error;
    const errors: {
      err: Error;
      name: string;
    }[] = [];
    outer: for (const { name } of nameWithHighestIndex) {
      const items = groupedByName[name].sort((a, b) => {
        if (a.funcIndex === b.funcIndex) {
          return a.branchCount - b.branchCount;
        }
        if (options?.errorAlgorithm === "firstOfDeepest")
          return a.funcIndex - b.funcIndex;
        else return b.funcIndex - a.funcIndex;
      });

      for (const { state, args, result } of items) {
        const assertions = this.assertionChains[name];

        for (const [key, assertion] of Object.entries(assertions)) {
          try {
            (assertion as any)(state, args, result);
          } catch (e) {
            if (!options.showAllErrors) {
              error = e;
              break outer;
            }
            errors.push({ err: e as Error, name });
          }
          let count = verifiedAssertions.get(key) || 0;
          count++;
          verifiedAssertions.set(key, count);
        }
      }
    }
    for (const [key, count] of verifiedAssertions.entries()) {
      console.log(`✅ ${key} - ✨${count} times`);
    }
    console.groupEnd();

    this.reset();
    if (error) throw error;
    if (errors.length) {
      throw new Error(
        errors.map((e) => `${e.name}:${e.err.message}`).join("\n")
      );
    }
  };

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
      deepClone?: DeepCloneOptions;
    }
  ): T {
    return ((...args: Parameters<T>): ReturnType<T> => {
      const convertedArgs = processors?.argsConverter
        ? processors.argsConverter(args)
        : args;
      if (processors?.pre) processors.pre(this.state!, convertedArgs);

      const deepCloneOpts = {
        result: true,
        args: false,
        ...(this._globalOptions?.deepClone || {}),
        ...(processors?.deepClone || {}),
      };

      const argsClone = deepCloneOpts.args
        ? deepClone(convertedArgs)
        : convertedArgs;

      const parentId =
        this.state!.callStack[this.state!.callStack.length - 1] ?? -1;

      let funcIndex = parentId + 1;
      const queueIndex = this.state!.queueIndex;
      this.state!.queueIndex++;

      this.state!.callStack.push(funcIndex);

      const branchCount = this.state!.branchCounter.get(parentId) || 0;
      this.state!.branchCounter.set(parentId, branchCount + 1);

      const result = fn(...args);

      this.state!.callStack.pop();

      const convertedResult = processors?.resultConverter
        ? processors.resultConverter(result)
        : result;

      const assertionData = {
        state: this.state,
        funcIndex,
        result: deepCloneOpts.result
          ? deepClone(convertedResult)
          : convertedResult,
        name,
        branchCount,
        args: argsClone,
        postOp: () => {},
      } as AssertionBlueprint;

      if (processors?.post) {
        assertionData.postOp = (state, args, result) => {
          processors!.post!(state, args as Parameters<T>, result);
        };
      }

      assertionQueues[this.globalKey].set(queueIndex, assertionData);

      return result;
    }) as T;
  }

  wrapAll() {}

  reset() {
    const assertionQueue = assertionQueues[this.globalKey];

    assertionQueue.clear();
  }

  setQueue(queue: Map<number, AssertionBlueprint>) {
    assertionQueues[this.globalKey] = queue;
  }

  setQueueFromArray(queue: [number, AssertionBlueprint][]) {
    assertionQueues[this.globalKey] = new Map(queue);
  }

  runPostOps() {
    const assertionQueue = assertionQueues[this.globalKey];

    const queueIndexes = Array.from(assertionQueue.keys()).sort(
      (a, b) => a - b
    );
    for (const queueIndex of queueIndexes) {
      const value = assertionQueue.get(queueIndex)!;

      value.state = { ...value.state };

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

  return assertionQueues[globalKey];
}

function printMaster(master: any) {
  if (!master) return "";

  if (master.index !== undefined && master.step !== undefined)
    return `Master ${master.index}, step ${master.step}`;
  else if (master.index !== undefined) return `Master ${master.index}`;
  else return "";
}

export { getQueue };

export default AssertionMaster;
