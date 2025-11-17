let a = async () => {
  const bResult = await b();
  const cResult = c();
  return [bResult, cResult];
};

let b = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(5);
    }, 1000);
  });
};

let c = () => {
  return 10;
};

let a2 = async () => {
  await b2();
};

let b2 = async () => {
  await new Promise((r) => setTimeout(r, 1000));
  throw new Error("test");
};

function wrap(
  aWrapped: typeof a,
  bWrapped: typeof b,
  cWrapped: typeof c,
  a2Wrapped: typeof a2,
  b2Wrapped: typeof b2
) {
  a = aWrapped;
  b = bWrapped;
  c = cWrapped;
  a2 = a2Wrapped;
  b2 = b2Wrapped;
}

export { a, b, c, a2, b2, wrap };
