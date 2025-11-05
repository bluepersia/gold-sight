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
} from "./utils/eventBus";

import { AbsCounter } from "./utils/absCounter";

const assertionQueues: AssertionQueues = {};

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
    };
  };

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

    const master = options?.master ?? this.state?.master;
    console.groupCollapsed(
      `✅ ${options.logMasterName} - ✨${printMaster(options.master)}`
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

      for (const { state, args, result, id } of items) {
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
            if (id) {
              prelog += `, ID: ${id}`;
            }
            if (prelog) {
              prelog += ", ";
              err.message = `${prelog}${err.message}`;
            }
            if (!options.showAllErrors) {
              error = err;
              break outer;
            }
            errors.push({ err, name });
          }
          didRun = didRun;
          // if (didRun) {
          let count = verifiedAssertions.get(key) || 0;
          count++;
          verifiedAssertions.set(key, count);
          //}
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
      post?: (state: TState, args: any[], result: any) => void;
      deepClone?: DeepCloneOptions;
      getId?: (
        state: TState,
        args: Parameters<T>,
        result: ReturnType<T>
      ) => string;
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
        for (let i = 0; i < args.length; i++) {
          const arg = args[i];
          if (typeof arg === "object" && "eventUUID" in arg) {
            args[i] = { ...arg, eventUUID };
            break;
          }
        }
      }

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

      if (fn.constructor.name === "AsyncFunction") {
        (result as Promise<any>).then(
          (r) => (assertionData.result = processResult(r) as ReturnType<T>)
        );
      }

      assertionData.postOp = (state, postOpArgs, postOpResult) => {
        assertionData.id = processors?.getId
          ? processors.getId(state, args, result)
          : "";

        assertionData.snapshot = processors?.getSnapshot
          ? processors.getSnapshot(state, args, result)
          : this._globalOptions?.getSnapshot
          ? this._globalOptions.getSnapshot(state, args, result)
          : undefined;
        if (processors?.post) processors!.post(state, postOpArgs, postOpResult);
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
    const assertionQueue = assertionQueues[this.globalKey];

    const queueIndexes = Array.from(assertionQueue.keys()).sort(
      (a, b) => a - b
    );
    for (const queueIndex of queueIndexes) {
      const value = assertionQueue.get(queueIndex)!;

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

  wrapTopFn<T extends (...args: any[]) => any>(
    fn: T,
    name: string,
    options?: {
      argsConverter?: (args: Parameters<T>) => any;
      resultConverter?: (result: ReturnType<T>, args: Parameters<T>) => any;
      pre?: (state: TState, args: Parameters<T>) => void;
      post?: (state: TState, args: any[], result: any) => void;
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
  withEventBus,
  withEvents,
  withEventNames,
};

export default AssertionMaster;
