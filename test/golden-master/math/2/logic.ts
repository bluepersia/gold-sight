import { LogicContext } from "../index.types";
import * as math from "../math";

let a = (ctx: LogicContext) => {
  let results: number[] = [];
  results = b(results, ctx);
  ctx.eventBus?.emit("b", ctx, {});
  return results;
};

let b = (results: number[], ctx: LogicContext) => {
  let newResults = [...results, math.add(3, 2)]; //5
  newResults = c(newResults, ctx);
  ctx.eventBus?.emit("c", ctx, {});
  return newResults;
};

let c = (results: number[], ctx: LogicContext) => {
  let newResults = [...results, math.subtract(results[0], 3)]; //2
  newResults = d(newResults, ctx);
  ctx.eventBus?.emit("d", ctx, {});
  newResults = f(newResults, ctx);
  ctx.eventBus?.emit("f", ctx, {});
  return newResults;
};

let d = (results: number[], ctx: LogicContext) => {
  let newResults = [...results, math.add(results[1], 2)]; //4
  newResults = e(newResults, ctx);
  ctx.eventBus?.emit("e", ctx, {});
  return newResults;
};

let e = (results: number[], ctx: LogicContext) => {
  let newResults = [...results, math.multiply(results[2], 3)]; //12
  return newResults;
};

let f = (results: number[], ctx: LogicContext) => {
  let newResults = [...results, math.divide(results[3], 2)]; //6
  return newResults;
};

function wrap(
  aWrapped: (ctx: LogicContext) => number[],
  bWrapped: (results: number[], ctx: LogicContext) => number[],
  cWrapped: (results: number[], ctx: LogicContext) => number[],
  dWrapped: (results: number[], ctx: LogicContext) => number[],
  eWrapped: (results: number[], ctx: LogicContext) => number[],
  fWrapped: (results: number[], ctx: LogicContext) => number[]
) {
  a = aWrapped;
  b = bWrapped;
  c = cWrapped;
  d = dWrapped;
  e = eWrapped;
  f = fWrapped;
}

export { a, b, c, d, e, f, wrap };
