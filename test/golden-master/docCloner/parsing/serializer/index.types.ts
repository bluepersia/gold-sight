import { EventBus } from "../../../../../src/utils/eventBus";
import { DocClone } from "../../src/parsing/docClone";
import { Master } from "../../../../index.types";

type SerializeDocMaster = Master & {
  docClone: DocClone;
};

type State = {
  sheetIndex: number;
  ruleIndex: number;
  rulesIndex: number;
  styleRuleIndex: number;
  mediaRuleIndex: number;
  eventBus?: EventBus;
  eventUUID?: string;

  master?: SerializeDocMaster;
};

export { State, SerializeDocMaster };
