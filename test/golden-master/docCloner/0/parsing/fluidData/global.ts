import { FluidData } from "../../../../docCloner/src/parsing/fluidData";

function writeGlobal(fluidData: FluidData) {
  fluidData.addAutoForceProperty("html", "html", "font-size", "14px");

  fluidData.addAutoForceProperty("body", "body", "margin-top", "0px");
  fluidData.addAutoForceProperty("body", "body", "margin-right", "0px");
  fluidData.addAutoForceProperty("body", "body", "margin-bottom", "0px");
  fluidData.addAutoForceProperty("body", "body", "margin-left", "0px");
  fluidData.addAutoForceProperty("body", "body", "padding-top", "0px");
  fluidData.addAutoForceProperty("body", "body", "padding-right", "0px");
  fluidData.addAutoForceProperty("body", "body", "padding-bottom", "0px");
  fluidData.addAutoForceProperty("body", "body", "padding-left", "0px");
  fluidData.addAutoForceProperty("body", "body", "min-height", "100vh");

  fluidData.addAutoForceProperty("*", "*", "margin-top", "0px");
  fluidData.addAutoForceProperty("*", "*", "margin-right", "0px");
  fluidData.addAutoForceProperty("*", "*", "margin-bottom", "0px");
  fluidData.addAutoForceProperty("*", "*", "margin-left", "0px");

  fluidData.addAutoForceProperty("::before", "::before", "margin-top", "0px");
  fluidData.addAutoForceProperty("::before", "::before", "margin-right", "0px");
  fluidData.addAutoForceProperty(
    "::before",
    "::before",
    "margin-bottom",
    "0px"
  );
  fluidData.addAutoForceProperty("::before", "::before", "margin-left", "0px");

  fluidData.addAutoForceProperty("::after", "::after", "margin-top", "0px");
  fluidData.addAutoForceProperty("::after", "::after", "margin-right", "0px");
  fluidData.addAutoForceProperty("::after", "::after", "margin-bottom", "0px");
  fluidData.addAutoForceProperty("::after", "::after", "margin-left", "0px");

  fluidData.addAutoForceProperty("img", "img", "max-width", "100%");
  fluidData.addAutoForceProperty("img", "img", "height", "auto");
}

export { writeGlobal };
