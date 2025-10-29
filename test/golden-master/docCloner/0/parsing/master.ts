import { SerializeDocMaster } from "../parsing/serializer/index.types";
import { docClone } from "./docClone";
const master: SerializeDocMaster = {
  index: 0,
  docClone,
};

export { master };
