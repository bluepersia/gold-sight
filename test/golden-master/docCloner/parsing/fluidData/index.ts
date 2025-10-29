import { FluidData } from "../../src/parsing/fluidData";
import { makeDefaultGlobalConfig } from "../../src/utils/globalConfig";
import { writeGlobal } from "./global";
import { writeProductCard } from "./product-card";
import { writeUtils } from "./utils";
const fluidData = new FluidData(makeDefaultGlobalConfig());
writeFluidData(fluidData);
function writeFluidData(fluidData: FluidData) {
  writeGlobal(fluidData);
  writeUtils(fluidData);
  writeProductCard(fluidData);
}

export { fluidData, writeFluidData };
