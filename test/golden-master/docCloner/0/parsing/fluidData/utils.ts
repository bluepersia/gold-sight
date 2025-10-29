import { FluidData } from "../../../../docCloner/src/parsing/fluidData";

function writeUtils(fluidData: FluidData) {
  fluidData.addAutoForceProperty(
    ".u-container",
    ".u-container",
    "padding-top",
    "0px"
  );
  fluidData.addAutoForceProperty(
    ".u-container",
    ".u-container",
    "padding-right",
    "1.14rem"
  );
  fluidData.addAutoForceProperty(
    ".u-container",
    ".u-container",
    "padding-bottom",
    "0px"
  );
  fluidData.addAutoForceProperty(
    ".u-container",
    ".u-container",
    "padding-left",
    "1.14rem"
  );
}

export { writeUtils };
