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

// Pure helper functions for assertQueue
function mergeAssertOptions<TState>(
  globalKey: string,
  globalConfig: Config<any>,
  globalOptions: Config<TState> | undefined,
  options?: AssertOptions
): AssertOptions {
  return {
    logMasterName: globalKey,
    errorAlgorithm: "firstOfDeepest",
    verbose: true,
    ...(globalConfig?.assert || {}),
    ...(globalOptions?.assert || {}),
    ...(options || {}),
  };
}

function formatErrorMessage(
  error: Error,
  master: { index: number; step?: number } | undefined,
  address: any
): Error {
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
        ? prettyFormat(address, { printBasicPrototype: false })
        : address;
    prelog += `, ${formattedAddress}`;
  }
  if (prelog) {
    prelog += ", ";
    error.message = `${prelog}${error.message}`;
  }
  return error;
}

function executeAssertion(
  assertion: any,
  state: any,
  args: any,
  result: any,
  allAssertions: any[]
): { didRun: boolean; error?: Error } {
  try {
    const didRun = assertion(state, args, result, allAssertions);
    return { didRun };
  } catch (e) {
    return { didRun: false, error: e as Error };
  }
}

function groupErrorsByName(errors: AssertionError[]): {
  [name: string]: AssertionError[];
} {
  const grouped: { [name: string]: AssertionError[] } = {};
  for (const error of errors) {
    if (!grouped[error.name]) {
      grouped[error.name] = [];
    }
    grouped[error.name].push(error);
  }
  return grouped;
}

function filterByTargetName(
  grouped: { [name: string]: AssertionError[] },
  targetName?: string
): { [name: string]: AssertionError[] } {
  if (!targetName || !grouped.hasOwnProperty(targetName)) {
    return grouped;
  }
  return { [targetName]: grouped[targetName] };
}

function calculateHighestIndices(grouped: {
  [name: string]: AssertionError[];
}): Array<{ name: string; highestIndex: number }> {
  return Object.entries(grouped).map(([name, items]) => ({
    name,
    highestIndex: Math.max(...items.map((i) => i.funcIndex)),
  }));
}

function sortByHighestIndex(
  nameWithHighestIndex: Array<{ name: string; highestIndex: number }>
): Array<{ name: string; highestIndex: number }> {
  return [...nameWithHighestIndex].sort(
    (a, b) => b.highestIndex - a.highestIndex
  );
}

function sortErrorsInGroup(
  items: AssertionError[],
  errorAlgorithm: "firstOfDeepest" | "deepest"
): AssertionError[] {
  return [...items].sort((a, b) => {
    if (a.funcIndex === b.funcIndex) {
      return a.branchCount - b.branchCount;
    }
    if (errorAlgorithm === "firstOfDeepest") {
      return a.funcIndex - b.funcIndex;
    } else {
      return b.funcIndex - a.funcIndex;
    }
  });
}

function formatAggregatedErrorMessage(errors: AssertionError[]): string {
  return errors
    .map((e) => `${e.name}:${e.funcIndex}:${e.branchCount}${e.err.message}`)
    .join("\n");
}

function logVerifiedAssertions(
  verifiedAssertions: Map<string, number>,
  verbose: boolean
): void {
  if (verbose) {
    for (const [key, count] of verifiedAssertions.entries()) {
      console.log(`✅ ${key} - ✨${count} times`);
    }
  }
}

function runAllAssertions(
  assertionQueue: Map<number, any>,
  assertionChains: { [funcKey: string]: AssertionChain<any, any, any> },
  allAssertions: any[],
  master: { index: number; step?: number } | undefined
): { errors: AssertionError[]; verifiedAssertions: Map<string, number> } {
  const errors: AssertionError[] = [];
  const verifiedAssertions = new Map<string, number>();

  for (const [, item] of assertionQueue.entries()) {
    const { state, args, result, address, name } = item;

    const assertions = assertionChains[name];
    if (!assertions)
      throw Error(
        `Assertion chain for ${name} not found. Are you setting up the default assertion chains?`
      );

    for (const [key, assertion] of Object.entries(assertions)) {
      const { error } = executeAssertion(
        assertion,
        state,
        args,
        result,
        allAssertions
      );

      if (error) {
        const formattedError = formatErrorMessage(error, master, address);
        errors.push({ err: formattedError, ...item });
      }

      let count = verifiedAssertions.get(key) || 0;
      count++;
      verifiedAssertions.set(key, count);
    }
  }

  return { errors, verifiedAssertions };
}

function throwFirstError(
  groupedByName: { [name: string]: AssertionError[] },
  sortedNames: Array<{ name: string; highestIndex: number }>,
  errorAlgorithm: "firstOfDeepest" | "deepest"
): void {
  for (const { name } of sortedNames) {
    const sortedItems = sortErrorsInGroup(groupedByName[name], errorAlgorithm);
    if (sortedItems.length > 0) {
      throw sortedItems[0].err;
    }
  }
}

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
    // Merge options
    options = mergeAssertOptions(
      this._globalKey,
      globalConfig,
      this._globalOptions,
      options
    );

    const assertionQueue = assertionQueues[this.globalKey];
    const allAssertions = Array.from(assertionQueue.values());

    if (!this.state?.master && options?.master === undefined)
      console.error(`No master indexes set. Provide it via options.`);

    const master = options?.master ?? this.state?.master;
    console.groupCollapsed(
      `✅ ${options.logMasterName} - ✨${printMaster(options.master)}`
    );

    // Run all assertions and collect errors
    const { errors, verifiedAssertions } = runAllAssertions(
      assertionQueue,
      this.assertionChains,
      allAssertions,
      master
    );

    // Group errors by name and filter by target if specified
    let groupedByName = groupErrorsByName(errors);
    groupedByName = filterByTargetName(groupedByName, options.targetName);

    // Calculate and sort by highest indices
    const nameWithHighestIndex = calculateHighestIndices(groupedByName);
    const sortedNames = sortByHighestIndex(nameWithHighestIndex);

    // Throw first error if not showing all
    if (!options.showAllErrors) {
      throwFirstError(
        groupedByName,
        sortedNames,
        options.errorAlgorithm as "firstOfDeepest" | "deepest"
      );
    }

    // Log verified assertions
    logVerifiedAssertions(verifiedAssertions, options.verbose ?? true);
    console.groupEnd();

    this.reset();

    // Throw aggregated error if showing all errors
    if (errors.length && options.showAllErrors) {
      throw new Error(formatAggregatedErrorMessage(errors));
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
      const eventBus = getEventBus(args);

      const convertedArgs = processors?.argsConverter
        ? processors.argsConverter(args)
        : args;
      if (processors?.pre) processors.pre(this.state!, convertedArgs);

      const deepCloneOpts = {
        result: false,
        args: false,
        ...(globalConfig?.deepClone || {}),
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

      let eventUUID: string | undefined;
      if (eventBus) {
        eventUUID = crypto.randomUUID().toString();
        this.state!.uuidStack.push(eventUUID);
        for (let i = 0; i < args.length; i++) {
          const arg = args[i];
          if (typeof arg === "object" && "eventUUID" in arg) {
            args[i] = argsClone[i] = {
              ...arg,
              eventUUID,
              eventUUIDs: [...this.state!.uuidStack],
              funcData: { funcName: name, funcIndex: funcIndex },
            };
            break;
          }
        }
      }

      const result = fn(...args);

      this.state!.callStack.pop();

      if (eventUUID) this.state!.uuidStack.pop();

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

      const assertionData = {
        state: this.state,
        funcIndex,
        result: finalResult,
        name,
        branchCount,
        args: argsClone,
        eventBus,
        eventUUID,
        postOp: () => {},
      } as AssertionBlueprint;

      let originalResult = result;
      if (fn.constructor.name === "AsyncFunction") {
        (result as Promise<any>).then((r) => {
          originalResult = r;
          assertionData.result = processResult(r) as ReturnType<T>;
        });
      }

      assertionData.postOp = (state) => {
        this.runPostOp(state, args, originalResult, processors, assertionData);
      };

      assertionQueues[this.globalKey].set(queueIndex, assertionData);

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
