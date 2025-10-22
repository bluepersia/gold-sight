import { EventBus } from "../../../../src/utils/eventBus";
import * as math from "../math";

let a = (eventBus?: EventBus) => {
  eventBus?.emitOnce("a", {});
  let results: number[] = [];
  results = b(results, eventBus);

  return results;
};

let b = (results: number[], eventBus?: EventBus) => {
  eventBus?.emit("b", {});
  eventBus?.emit("b", {});
  let newResults = [...results, math.add(1, 2)]; //3
  newResults = c(newResults, eventBus);
  return newResults;
};

let c = (results: number[], eventBus?: EventBus) => {
  eventBus?.emitOnce("c", {});
  eventBus?.emitOnce("c", {});
  let newResults = [...results, math.subtract(results[0], 3)]; //0
  newResults = d(newResults, eventBus);
  return newResults;
};

let c2 = (results: number[], eventBus?: EventBus) => {
  eventBus?.emit("c2", {});
  let newResults = d(results, eventBus);
  return newResults;
};

let d = (results: number[], eventBus?: EventBus) => {
  eventBus?.emit("d", {});
  let newResults = [...results, math.add(results[1], 4)]; //4
  newResults = e(newResults, eventBus);
  return newResults;
};

let e = (results: number[], eventBus?: EventBus) => {
  eventBus?.emit("e", {});
  let newResults = [...results, math.multiply(results[2], 3)]; //12
  return newResults;
};

function wrap(
  aWrapped: (eventBus?: EventBus) => number[],
  bWrapped: (results: number[], eventBus?: EventBus) => number[],
  cWrapped: (results: number[], eventBus?: EventBus) => number[],
  c2Wrapped: (results: number[], eventBus?: EventBus) => number[],
  dWrapped: (results: number[], eventBus?: EventBus) => number[],
  eWrapped: (results: number[], eventBus?: EventBus) => number[]
) {
  a = aWrapped;
  b = bWrapped;
  c = cWrapped;
  c2 = c2Wrapped;
  d = dWrapped;
  e = eWrapped;
}

export { a, b, c, d, e, wrap, c2 };
