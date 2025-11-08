import { EventBus } from "../../../../src/utils/eventBus";
import { EventUUID, LogicContext } from "../index.types";
import * as math from "../math";

let a = (ctx: LogicContext) => {
  ctx.eventBus?.emitOnce("a", ctx, {});
  let results: number[] = [];
  results = b(results, ctx);

  return results;
};

let b = (results: number[], ctx: LogicContext) => {
  ctx.eventBus?.emit("b", ctx, {});
  ctx.eventBus?.emit("b", ctx, {});
  let newResults = [...results, math.add(1, 2)]; //3
  newResults = c(newResults, ctx);
  return newResults;
};

let c = (results: number[], ctx: LogicContext) => {
  ctx.eventBus?.emitOnce("c", ctx, {});
  ctx.eventBus?.emitOnce("c", ctx, {});
  let newResults = [...results, math.subtract(results[0], 3)]; //0
  newResults = d(newResults, ctx);
  return newResults;
};

let c2 = (results: number[], ctx: LogicContext) => {
  ctx.eventBus?.emit("c2", ctx, {});
  let newResults = d(results, ctx);
  return newResults;
};

let d = (results: number[], ctx: LogicContext) => {
  ctx.eventBus?.emitOne("d", ctx, { scopeKey: "test" });
  let newResults = [...results, math.add(results[1], 4)]; //4
  newResults = e(newResults, ctx);
  return newResults;
};

let e = (results: number[], ctx: LogicContext) => {
  ctx.eventBus?.emitOne("e", ctx, { scopeKey: "test" });
  let newResults = [...results, math.multiply(results[2], 3)]; //12
  return newResults;
};

function wrap(
  aWrapped: (ctx: LogicContext) => number[],
  bWrapped: (results: number[], ctx: LogicContext) => number[],
  cWrapped: (results: number[], ctx: LogicContext) => number[],
  c2Wrapped: (results: number[], ctx: LogicContext) => number[],
  dWrapped: (results: number[], ctx: LogicContext) => number[],
  eWrapped: (results: number[], ctx: LogicContext) => number[]
) {
  a = aWrapped;
  b = bWrapped;
  c = cWrapped;
  c2 = c2Wrapped;
  d = dWrapped;
  e = eWrapped;
}

export { a, b, c, d, e, wrap, c2 };
