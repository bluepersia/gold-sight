let a = async () => {
  const bResult = await b();
  const cResult = c();
  await d();
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

let d = async () => {
  await new Promise((r) => setTimeout(r, 1000));
  throw new Error("test");
};

function wrap(
  aWrapped: typeof a,
  bWrapped: typeof b,
  cWrapped: typeof c,
  dWrapped: typeof d
) {
  a = aWrapped;
  b = bWrapped;
  c = cWrapped;
  d = dWrapped;
}

export { a, b, c, d, wrap };
