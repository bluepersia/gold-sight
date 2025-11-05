import { EventBus } from "../../../../src/utils/eventBus";
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
const eventBusA = new EventBus(5, {
  a: [{ name: "a", payload: {}, state: { absIndex: 0 }, uuid: "" }],
});
master.finalQueue.set(0, {
  name: "a",
  funcIndex: 0,
  branchCount: 0,
  result: [3, 0, 4, 12],
  args: [eventBusA],
  eventBus: new EventBus(1, {
    a: [{ name: "a", payload: {}, state: { absIndex: 0 }, uuid: "a" }],
  }),
  state: {
    absIndex: 0,
    addAbsIndex: 0,
    multAbsIndex: 0,
    subAbsIndex: 0,
    divAbsIndex: 0,
    master,
  },
});
const eventBusB = new EventBus(5, {
  b: [{ name: "b", payload: {}, state: { absIndex: 0 }, uuid: "b" }],
});
master.finalQueue.set(1, {
  name: "b",
  funcIndex: 1,
  branchCount: 0,
  result: [3, 0, 4, 12],
  args: [[], eventBusB],
  state: {
    absIndex: 0,
    addAbsIndex: 0,
    multAbsIndex: 0,
    subAbsIndex: 0,
    divAbsIndex: 0,
    master,
  },
});
const eventBusC = new EventBus(5, {
  c: [{ name: "c", payload: {}, state: { absIndex: 1 }, uuid: "c" }],
});
master.finalQueue.set(2, {
  name: "c",
  funcIndex: 2,
  branchCount: 0,
  result: [3, 0, 4, 12],
  args: [[3], eventBusC],
  state: {
    absIndex: 1,
    addAbsIndex: 1,
    multAbsIndex: 0,
    subAbsIndex: 0,
    divAbsIndex: 0,
    master,
  },
});
const eventBusD = new EventBus(5, {
  d: [{ name: "d", payload: {}, state: { absIndex: 2 }, uuid: "d" }],
});
master.finalQueue.set(3, {
  name: "d",
  funcIndex: 3,
  branchCount: 0,
  result: [3, 0, 4, 12],
  args: [[3, 0], eventBusD],
  state: {
    absIndex: 2,
    addAbsIndex: 1,
    multAbsIndex: 0,
    subAbsIndex: 1,
    divAbsIndex: 0,
    master,
  },
});

const eventBusE = new EventBus(5, {
  e: [{ name: "e", payload: {}, state: { absIndex: 3 }, uuid: "e" }],
});

master.finalQueue.set(4, {
  name: "e",
  funcIndex: 4,
  branchCount: 0,
  result: [3, 0, 4, 12],
  args: [[3, 0, 4], eventBusE],
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
