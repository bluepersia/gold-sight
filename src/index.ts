import { prettyFormat } from "./utils/prettyFormat";
let fs;
let path;
if (process.env.NODE_ENV === "test") {
  fs = await import("fs");
  path = await import("path");
}

import {
  AssertionBlueprint,
  AssertionChain,
  AssertionError,
  AssertionQueues,
  AssertOptions,
  Config,
  DeepCloneOptions,
  StateBase,
} from "./index.types";
import { deepClone } from "./utils/deepClone";
import {
  getEventBus,
  EventBus,
  IEvent,
  IEventBus,
  getEventByState,
  getEventByPayload,
  getEvent,
  getEventUUID,
  getEventByUUID,
  filterEventsByUUID,
  withEventBus,
  withEvents,
  withEventNames,
  filterEventsByPayload,
  filterEventsByState,
  filterEvents,
  makeEventContext,
  getFuncData,
} from "./utils/eventBus";

import { AbsCounter } from "./utils/absCounter";

const assertionQueues: AssertionQueues = {};

let globalConfig: Config<any> = {};
if (fs && path) {
  const globalConfigFilePath = path.resolve(
    process.cwd(),
    "gold-sight.config.json"
  );
  if (fs.existsSync(globalConfigFilePath)) {
    globalConfig = JSON.parse(
      fs.readFileSync(globalConfigFilePath, { encoding: "utf-8" })
    );
  }
}

// ============================================================================
// Pure Helper Functions for wrapFn (extracted for SRP and testability)
// ============================================================================

/**
 * Merges deep clone options from multiple sources with proper precedence
 * @pure
 */
function mergeDeepCloneOptions(
  globalConfig: Config<any> | undefined,
  instanceOptions: Config<any> | undefined,
  processorOptions: DeepCloneOptions | undefined
): DeepCloneOptions {
  return {
    result: false,
    args: false,
    ...(globalConfig?.deepClone || {}),
    ...(instanceOptions?.deepClone || {}),
    ...(processorOptions || {}),
  };
}

/**
 * Processes and optionally clones arguments
 * @pure
 */
function processAndCloneArgs<T>(
  args: T,
  argsConverter: ((args: T) => any) | undefined,
  shouldClone: boolean | undefined
): any {
  const convertedArgs = argsConverter ? argsConverter(args) : args;
  return shouldClone ? deepClone(convertedArgs) : convertedArgs;
}

/**
 * Calculates the parent ID from the call stack
 * @pure
 */
function getParentId(callStack: number[]): number {
  return callStack[callStack.length - 1] ?? -1;
}

/**
 * Determines if a function is async
 * @pure
 */
function isAsyncFunction(fn: Function): boolean {
  return fn.constructor.name === "AsyncFunction";
}

/**
 * Enriches an argument object with event metadata
 * @pure
 */
function enrichArgumentWithEventData(
  arg: any,
  eventUUID: string,
  uuidStack: string[],
  funcName: string,
  funcIndex: number
): any {
  return {
    ...arg,
    eventUUID,
    eventUUIDs: [...uuidStack],
    funcData: { funcName, funcIndex },
  };
}

/**
 * Creates a result processor function
 * @pure
 */
function createResultProcessor<T>(
  resultConverter: ((result: any, args: any) => any) | undefined,
  shouldClone: boolean | undefined
): (result: T, args: any) => any {
  return (result: T, args: any) => {
    const converted = resultConverter ? resultConverter(result, args) : result;
    return shouldClone ? deepClone(converted) : converted;
  };
}

/**
 * Pushes function metadata to the call stack and returns indices
 * Side-effect: Mutates state
 */
function pushToCallStack(
  state: StateBase<any>,
  parentId: number
): { funcIndex: number; queueIndex: number } {
  const funcIndex = parentId + 1;
  const queueIndex = state.queueIndex;
  state.queueIndex++;
  state.callStack.push(funcIndex);
  return { funcIndex, queueIndex };
}

/**
 * Increments the branch counter for a parent function
 * Side-effect: Mutates state
 */
function incrementBranchCounter(
  state: StateBase<any>,
  parentId: number
): number {
  const branchCount = state.branchCounter.get(parentId) || 0;
  state.branchCounter.set(parentId, branchCount + 1);
  return branchCount;
}

/**
 * Creates and registers event context if event bus is present
 * Side-effect: Mutates state, args, and argsClone
 */
function createEventContext(
  state: StateBase<any>,
  eventBus: IEventBus | undefined | null,
  args: any[],
  argsClone: any[],
  name: string,
  funcIndex: number
): string | undefined {
  if (!eventBus) return undefined;

  const eventUUID = crypto.randomUUID().toString();
  state.uuidStack.push(eventUUID);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (typeof arg === "object" && "eventUUID" in arg) {
      const enrichedArg = enrichArgumentWithEventData(
        arg,
        eventUUID,
        state.uuidStack,
        name,
        funcIndex
      );
      args[i] = argsClone[i] = enrichedArg;
      break;
    }
  }

  return eventUUID;
}

/**
 * Cleans up call stack and UUID stack after function execution
 * Side-effect: Mutates state
 */
function cleanupCallStack(
  state: StateBase<any>,
  eventUUID: string | undefined
): void {
  state.callStack.pop();
  if (eventUUID) state.uuidStack.pop();
}

/**
 * Builds the assertion data object
 * @pure (except for the postOp function placeholder)
 */
function buildAssertionData<TState>(
  state: TState & StateBase<any>,
  funcIndex: number,
  result: any,
  name: string,
  branchCount: number,
  args: any[],
  eventBus: IEventBus | undefined | null,
  eventUUID: string | undefined
): AssertionBlueprint<TState, any, any> {
  return {
    state,
    funcIndex,
    result,
    name,
    branchCount,
    args,
    eventBus: eventBus ?? undefined,
    eventUUID,
    postOp: () => {},
  } as AssertionBlueprint<TState, any, any>;
}

/**
 * Handles async result processing
 * Side-effect: Mutates assertionData when promise resolves
 */
function handleAsyncResult(
  resultPromise: Promise<any>,
  processResult: (r: any) => any,
  assertionData: AssertionBlueprint<any, any, any>
): { originalResult: any } {
  const resultRef = { originalResult: undefined as any };
  resultPromise.then((r) => {
    resultRef.originalResult = r;
    assertionData.result = processResult(r);
  });
  return resultRef;
}

// ============================================================================
// End of Helper Functions
// ============================================================================

abstract class AssertionMaster<
  TState,
  TMaster extends { index: number; step?: number }
> {
  protected _state: (TState & StateBase<TMaster>) | undefined;
  private assertionChains: {
    [funcKey: string]: AssertionChain<TState, any, any>;
  };

  private _globalKey: string;
  private _master?: TMaster;
  private _globalOptions: Config<TState> | undefined;

  public get globalOptions() {
    return { ...(this._globalOptions || {}) };
  }

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

  abstract newState(): TState;

  resetState = () => {
    this._state = {
      ...this.newState(),
      master: this.master,
      callStack: [],
      branchCounter: new Map(),
      queueIndex: 0,
      uuidStack: [],
    };
  };

  assertQueue = (options?: AssertOptions) => {
    options = {
      logMasterName: this._globalKey,
      errorAlgorithm: "firstOfDeepest",
      verbose: true,
      ...(globalConfig?.assert || {}),
      ...(this._globalOptions?.assert || {}),
      ...(options || {}),
    };

    const assertionQueue = assertionQueues[this.globalKey];

    const allAssertions = Array.from(assertionQueue.values());

    const verifiedAssertions = new Map<string, number>();

    if (!this.state?.master && options?.master === undefined)
      console.error(`No master indexes set. Provide it via options.`);

    const master = options?.master ?? this.state?.master;
    console.groupCollapsed(
      `✅ ${options.logMasterName} - ✨${printMaster(options.master)}`
    );

    const errors: AssertionError[] = [];

    // Step 1: Group items by function name
    let groupedByName: { [name: string]: AssertionError[] } = {};
    for (const [, item] of assertionQueue.entries()) {
      const { state, args, result, address, name } = item;

      const assertions = this.assertionChains[name];
      if (!assertions)
        throw Error(
          `Assertion chain for ${name} not found. Are you setting up the default assertion chains?`
        );
      for (const [key, assertion] of Object.entries(assertions)) {
        let didRun = false;
        try {
          didRun = (assertion as any)(state, args, result, allAssertions);
        } catch (e) {
          const err = e as Error;
          let prelog = "";
          if (master) {
            prelog = `Master:${master.index}`;
            if (master.step) {
              prelog += `, Step:${master.step}`;
            }
          }
          if (address) {
            const formattedAddress =
              typeof address === "object"
                ? prettyFormat(address, {
                    printBasicPrototype: false,
                  })
                : address;
            prelog += `, ${formattedAddress}`;
          }
          if (prelog) {
            prelog += ", ";
            err.message = `${prelog}${err.message}`;
          }
          errors.push({ err, ...item });
        }
        didRun = didRun;
        // if (didRun) {
        let count = verifiedAssertions.get(key) || 0;
        count++;
        verifiedAssertions.set(key, count);
        //}
      }

      if (!groupedByName[item.name]) groupedByName[item.name] = [];
      groupedByName[item.name].push(
        ...errors.filter((err) => err.name === item.name)
      );
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

    outer: for (const { name } of nameWithHighestIndex) {
      const items = groupedByName[name].sort((a, b) => {
        if (a.funcIndex === b.funcIndex) {
          return a.branchCount - b.branchCount;
        }
        if (options?.errorAlgorithm === "firstOfDeepest")
          return a.funcIndex - b.funcIndex;
        else return b.funcIndex - a.funcIndex;
      });
      if (!options.showAllErrors) {
        for (const err of items) throw err.err;
      }
    }
    if (options.verbose) {
      for (const [key, count] of verifiedAssertions.entries()) {
        console.log(`✅ ${key} - ✨${count} times`);
      }
    }
    console.groupEnd();

    this.reset();
    if (errors.length) {
      if (options.showAllErrors) {
        throw new Error(
          errors
            .map(
              (e) => `${e.name}:${e.funcIndex}:${e.branchCount}${e.err.message}`
            )
            .join("\n")
        );
      }
    }
    return verifiedAssertions;
  };

  wrapFn<T extends (...args: any[]) => any>(
    fn: T,
    name: string,
    processors?: {
      argsConverter?: (args: Parameters<T>) => any;
      resultConverter?: (result: ReturnType<T>, args: Parameters<T>) => any;
      pre?: (state: TState, args: Parameters<T>) => void;
      post?: (state: TState, args: Parameters<T>, result: any) => void;
      deepClone?: DeepCloneOptions;
      getAddress?: (
        state: TState,
        args: Parameters<T>,
        result: ReturnType<T>
      ) => string | object;
      getSnapshot?: (
        state: TState,
        args: Parameters<T>,
        result: ReturnType<T>
      ) => any;
    }
  ): T {
    return ((...args: Parameters<T>) => {
      // Step 1: Get event bus and process arguments
      const eventBus = getEventBus(args);
      const convertedArgs = processors?.argsConverter
        ? processors.argsConverter(args)
        : args;

      // Step 2: Run pre-processor hook
      if (processors?.pre) processors.pre(this.state!, convertedArgs);

      // Step 3: Merge deep clone options and clone arguments
      const deepCloneOpts = mergeDeepCloneOptions(
        globalConfig,
        this._globalOptions,
        processors?.deepClone
      );
      const argsClone = processAndCloneArgs(
        convertedArgs,
        undefined,
        deepCloneOpts.args
      );

      // Step 4: Validate state
      if (!this.state)
        throw new Error(
          "State is not initialized. The top function wrapper may not be executing"
        );

      // Step 5: Manage call stack and counters
      const parentId = getParentId(this.state!.callStack);
      const { funcIndex, queueIndex } = pushToCallStack(this.state!, parentId);
      const branchCount = incrementBranchCounter(this.state!, parentId);

      // Step 6: Create event context if needed
      const eventUUID = createEventContext(
        this.state!,
        eventBus,
        args,
        argsClone,
        name,
        funcIndex
      );

      // Step 7: Execute the wrapped function
      const result = fn(...args);

      // Step 8: Cleanup call stack
      cleanupCallStack(this.state!, eventUUID);

      // Step 9: Process result
      const processResult = createResultProcessor<ReturnType<T>>(
        processors?.resultConverter,
        deepCloneOpts.result
      );
      const isAsync = isAsyncFunction(fn);
      const finalResult = isAsync ? result : processResult(result, args);

      // Step 10: Build assertion data
      const assertionData = buildAssertionData<TState>(
        this.state!,
        funcIndex,
        finalResult,
        name,
        branchCount,
        argsClone,
        eventBus,
        eventUUID
      );

      // Step 11: Handle async results
      let originalResult = result;
      if (isAsync) {
        handleAsyncResult(
          result as Promise<any>,
          (r) => processResult(r, args),
          assertionData
        );
        // Update originalResult reference when promise resolves
        (result as Promise<any>).then((r) => {
          originalResult = r;
        });
      }

      // Step 12: Set up post-operation callback
      assertionData.postOp = (state) => {
        this.runPostOp(state, args, originalResult, processors, assertionData);
      };

      // Step 13: Store assertion data in queue
      assertionQueues[this.globalKey].set(queueIndex, assertionData);

      // Step 14: Return result
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
    let assertionQueue = assertionQueues[this.globalKey];

    const sortedEntries = Array.from(assertionQueue.entries()).sort(
      ([a], [b]) => a - b
    );

    assertionQueue = new Map(sortedEntries);
    assertionQueues[this.globalKey] = assertionQueue;

    for (const value of assertionQueue.values()) {
      value.state = { ...value.state };

      if (value.eventBus && value.eventUUID) {
        const events = value.eventBus.getEventsForUUID(value.eventUUID);
        for (const event of events) {
          event.state = value.state;
        }
      }

      if (value.postOp) value.postOp(this.state, value.args, value.result);
    }
  }

  runPostOp(
    state: TState,
    args: any,
    result: any,
    processors: any,
    assertionData: AssertionBlueprint<TState, any, any>
  ) {
    assertionData.address = processors?.getAddress
      ? processors.getAddress(state, args, result)
      : "";

    assertionData.snapshot = processors?.getSnapshot
      ? processors.getSnapshot(state, args, result)
      : this._globalOptions?.getSnapshot
      ? this._globalOptions.getSnapshot(state, args, result)
      : globalConfig?.getSnapshot
      ? globalConfig.getSnapshot(state, args, result)
      : undefined;
    if (processors?.post) processors!.post(state, args, result);
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
      deepClone?: DeepCloneOptions;
      args?: Parameters<T>;
      getSnapshot?: (
        state?: TState,
        args?: Parameters<T>,
        result?: ReturnType<T>
      ) => any;
    }
  ): (...args: Parameters<T>) => ReturnType<T> {
    return (...args) => {
      this.resetState();
      const wrappedFn = this.wrapFn(fn, name, options);
      const result = wrappedFn(...args);
      this.state!.master = this.master;
      if (result instanceof Promise) {
        return result.then((resolved) => {
          this.runPostOps();
          return resolved;
        });
      } else {
        this.runPostOps();
        return result;
      }
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

function getGlobalConfig() {
  return globalConfig;
}
function setGlobalConfig(config: Config<any>) {
  globalConfig = config;
}

export {
  getQueue,
  deepClone,
  EventBus,
  IEvent,
  IEventBus,
  getEventByState,
  getEventByPayload,
  getEvent,
  AbsCounter,
  getEventUUID,
  getEventByUUID,
  filterEventsByUUID,
  filterEventsByPayload,
  filterEventsByState,
  filterEvents,
  withEventBus,
  withEvents,
  withEventNames,
  makeEventContext,
  getGlobalConfig,
  setGlobalConfig,
  getFuncData,
};

export default AssertionMaster;
