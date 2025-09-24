import * as math from "../math";

let a = () => {
  let results: number[] = [];
  results = b(results);

  return results;
};

let b = (results: number[]) => {
  let newResults = [...results, math.add(1, 2)]; //3
  newResults = c(newResults);
  return newResults;
};

let c = (results: number[]) => {
  let newResults = [...results, math.subtract(results[0], 3)]; //0
  newResults = d(newResults);
  return newResults;
};

let d = (results: number[]) => {
  let newResults = [...results, math.add(results[1], 4)]; //4
  newResults = e(newResults);
  return newResults;
};

let e = (results: number[]) => {
  let newResults = [...results, math.multiply(results[2], 3)]; //12
  return newResults;
};

function wrap(
  aWrapped: () => number[],
  bWrapped: (results: number[]) => number[],
  cWrapped: (results: number[]) => number[],
  dWrapped: (results: number[]) => number[],
  eWrapped: (results: number[]) => number[]
) {
  a = aWrapped;
  b = bWrapped;
  c = cWrapped;
  d = dWrapped;
  e = eWrapped;
}

export { a, b, c, d, e, wrap };
