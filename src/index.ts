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
  withEventNamesList,
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
      funcCounter: new Map(),
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
      if (!assertions) {
        throw Error(
          `Assertion chain for ${name} not found. Are you setting up the default assertion chains?`
        );
      }
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
            prelog += `, ${name} #${item.funcID}`;
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

    if (options.verbose) {
      for (const [key, count] of verifiedAssertions.entries()) {
        console.log(`✅ ${key} - ✨${count} times`);
      }
    }

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
        for (const err of items) {
          throw err.err;
        }
      }
    }

    console.groupEnd();

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

      let funcCounter = this.state!.funcCounter.get(name) || 1;
      this.state!.funcCounter.set(name, funcCounter + 1);
      const funcID = funcCounter;

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
        funcID,
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
      this.reset();
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
  withEventNamesList,
  makeEventContext,
  getGlobalConfig,
  setGlobalConfig,
  getFuncData,
};

export default AssertionMaster;
