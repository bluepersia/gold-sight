import { Master } from "../index.types";

const master: Master = {
  finalResults: [5, 2, 4, 12, 6],
  addResults: [5, 4],
  subResults: [2],
  multResults: [12],
  divResults: [6],
  index: 1,
  finalQueue: new Map(),
  subfunc: () => {},
  topFunc: () => {},
  assertionMaster: null,
  eventMap: new Map<string, number>([
    ["b", 1],
    ["c", 1],
    ["d", 1],
    ["e", 1],
    ["f", 1],
  ]),
};

master.finalQueue.set(0, {
  name: "a",
  funcIndex: 0,
  branchCount: 0,
  result: [5, 2, 4, 12, 6],
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
  branchCount: 0,
  result: [5, 2, 4, 12, 6],
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
  branchCount: 0,
  result: [5, 2, 4, 12, 6],
  args: [[5]],
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
  branchCount: 0,
  result: [5, 2, 4, 12],
  args: [[5, 2]],
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
  branchCount: 0,
  result: [5, 2, 4, 12],
  args: [[5, 2, 4]],
  state: {
    absIndex: 3,
    addAbsIndex: 2,
    multAbsIndex: 0,
    subAbsIndex: 1,
    divAbsIndex: 0,
    master,
  },
});
master.finalQueue.set(5, {
  name: "f",
  funcIndex: 3,
  branchCount: 1,
  result: [5, 2, 4, 12, 6],
  args: [[5, 2, 4, 12]],
  state: {
    absIndex: 4,
    addAbsIndex: 2,
    multAbsIndex: 1,
    subAbsIndex: 1,
    divAbsIndex: 0,
    master,
  },
});
export { master };
