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
  private _globalOptions: Config<TState> | undefined;
  private _hasFirstTopFnRun: boolean = false;
  private _hasAssertionBeenInserted: boolean = false;

  constructor(
    assertionChains: {
      [funcKey: string]: AssertionChain<TState, any, any>;
    },
    globalKey: string,
    globalOptions?: Config<TState>
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

  get hasFirstTopFnRun(): boolean {
    return this._hasFirstTopFnRun;
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

  resetTopFnCounter(): void {
    this._hasFirstTopFnRun = false;
  }

  assertQueue = (options?: AssertOptions) => {
    options = {
      logMasterName: this._globalKey,
      errorAlgorithm: "firstOfDeepest",
      ...(this._globalOptions?.assert || {}),
      ...(options || {}),
    };

    const assertionQueue = assertionQueues[this.globalKey];

    const allAssertions = Array.from(assertionQueue.values());

    const verifiedAssertions = new Map<string, number>();

    if (!this.state?.master && options?.master === undefined)
      console.error(`No master indexes set. Provide it via options.`);

    console.groupCollapsed(
      `✅ ${options.logMasterName} - ✨${
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

    let error: Error | undefined;
    const errors: {
      err: Error;
      name: string;
      id: string;
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

      for (const { state, args, result, id, requirement, context } of items) {
        const assertions = this.assertionChains[name];
        if (!assertions)
          throw Error(
            `Assertion chain for ${name} not found. Are you setting up the default assertion chains?`
          );
        for (const [key, assertion] of Object.entries(assertions)) {
          try {
            const assertionRequirementPass =
              !requirement || requirement(context);
            const globalRequirementPass =
              !this._globalOptions?.assertionRequirement ||
              this._globalOptions.assertionRequirement(context);
            if (assertionRequirementPass && globalRequirementPass)
              (assertion as any)(state, args, result, allAssertions);
          } catch (e) {
            const err = e as Error;
            if (id) err.message = `ID: ${id}, ${err.message}`;
            if (!options.showAllErrors) {
              error = err;
              break outer;
            }
            errors.push({ err, name, id });
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
  ): T {
    return ((...args: Parameters<T>) => {
      const convertedArgs = processors?.argsConverter
        ? processors.argsConverter(args)
        : args;
      if (processors?.pre) processors.pre(this.state!, convertedArgs);

      const deepCloneOpts = {
        result: false,
        args: false,
        ...(this._globalOptions?.deepClone || {}),
        ...(processors?.deepClone || {}),
      };

      const argsClone = deepCloneOpts.args
        ? deepClone(convertedArgs)
        : convertedArgs;

      if (!this.state)
        throw new Error(
          "State is not initialized. The top function wrapper may not be executing"
        );

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

      function processResult(result: ReturnType<T>) {
        const convertedResult = processors?.resultConverter
          ? processors.resultConverter(result, args)
          : result;

        const resultClone = deepCloneOpts.result
          ? deepClone(convertedResult)
          : convertedResult;

        return resultClone;
      }

      const isAsync = fn.constructor.name === "AsyncFunction";
      const finalResult = isAsync ? result : processResult(result);

      const id = processors?.getId ? processors.getId(args, result) : "";

      const context = processors?.getReqContext
        ? processors.getReqContext(this.state, args, result)
        : this._globalOptions?.getReqContext
        ? this._globalOptions.getReqContext(this.state, args, result)
        : undefined;
      const assertionData = {
        state: this.state,
        funcIndex,
        result: finalResult,
        name,
        id,
        branchCount,
        args: argsClone,
        context,
        requirement: processors?.assertionRequirement,
        postOp: () => {},
      } as AssertionBlueprint;

      if (fn.constructor.name === "AsyncFunction") {
        (result as Promise<any>).then(
          (r) => (assertionData.result = processResult(r) as ReturnType<T>)
        );
      }

      if (processors?.post) {
        assertionData.postOp = (state, args, result) => {
          processors!.post!(state, args as Parameters<T>, result);
        };
      }

      const insertionRequirementPass =
        !processors?.insertionRequirement ||
        processors.insertionRequirement(context);

      const globalRequirementPass =
        !this._globalOptions?.insertionRequirement ||
        this._globalOptions.insertionRequirement(context);
      if (insertionRequirementPass && globalRequirementPass) {
        const isValidPass =
          !this._globalOptions?.onlyRunFirstTopFn ||
          (this._globalOptions?.onlyRunFirstTopFn && !this.hasFirstTopFnRun);
        if (isValidPass) {
          assertionQueues[this.globalKey].set(queueIndex, assertionData);
          this._hasAssertionBeenInserted = true;
        }
      }
      return isAsync ? (result as Promise<any>) : result;
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

  getQueue() {
    return getQueue(this.globalKey);
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
      resultConverter?: (result: ReturnType<T>, args: Parameters<T>) => any;
      pre?: (state: TState, args: Parameters<T>) => void;
      post?: (
        state: TState,
        args: Parameters<T>,
        result: ReturnType<T>
      ) => void;
      args?: Parameters<T>;
      insertionRequirement?: (context: any) => boolean;
      assertionRequirement?: (context: any) => boolean;
      getReqContext?: (
        state: TState,
        args: Parameters<T>,
        result?: ReturnType<T>
      ) => any;
    }
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> | ReturnType<T> {
    return (...args) => {
      this.resetState();
      this._hasAssertionBeenInserted = false;
      const wrappedFn = this.wrapFn(fn, name, options);
      const result = wrappedFn(...args);
      this.state!.master = this.master;
      this.runPostOps();
      if (this._hasAssertionBeenInserted) this._hasFirstTopFnRun = true;
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
