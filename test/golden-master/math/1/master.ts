import { Master } from "../index.types";

const master: Master = {
  finalResults: [3, 0, 4, 12],
  addResults: [3, 4],
  subResults: [0],
  multResults: [12],
  divResults: [],
  index: 0,
  finalQueue: new Map(),
  subfunc: () => {},
  topFunc: () => {},
  assertionMaster: null,
};

master.finalQueue.set(0, {
  name: "a",
  funcIndex: 0,
  result: [3, 0, 4, 12],
  args: [],
  state: {
    absIndex: 0,
    addAbsIndex: 0,
    multAbsIndex: 0,
    subAbsIndex: 0,
    divAbsIndex: 0,
    master,
  },
});

master.finalQueue.set(1, {
  name: "b",
  funcIndex: 1,
  result: [3, 0, 4, 12],
  args: [[]],
  state: {
    absIndex: 0,
    addAbsIndex: 0,
    multAbsIndex: 0,
    subAbsIndex: 0,
    divAbsIndex: 0,
    master,
  },
});

master.finalQueue.set(2, {
  name: "c",
  funcIndex: 2,
  result: [3, 0, 4, 12],
  args: [[3]],
  state: {
    absIndex: 1,
    addAbsIndex: 1,
    multAbsIndex: 0,
    subAbsIndex: 0,
    divAbsIndex: 0,
    master,
  },
});

master.finalQueue.set(3, {
  name: "d",
  funcIndex: 3,
  result: [3, 0, 4, 12],
  args: [[3, 0]],
  state: {
    absIndex: 2,
    addAbsIndex: 1,
    multAbsIndex: 0,
    subAbsIndex: 1,
    divAbsIndex: 0,
    master,
  },
});

master.finalQueue.set(4, {
  name: "e",
  funcIndex: 4,
  result: [3, 0, 4, 12],
  args: [[3, 0, 4]],
  state: {
    absIndex: 3,
    addAbsIndex: 2,
    multAbsIndex: 0,
    subAbsIndex: 1,
    divAbsIndex: 0,
    master,
  },
});

export { master };
