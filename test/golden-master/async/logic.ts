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

function wrap(aWrapped: typeof a, bWrapped: typeof b, cWrapped: typeof c) {
  a = aWrapped;
  b = bWrapped;
  c = cWrapped;
}

export { a, b, c, wrap };
