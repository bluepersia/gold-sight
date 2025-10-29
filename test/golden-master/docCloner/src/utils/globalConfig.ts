import { GlobalConfig } from "../index.types";

function makeDefaultGlobalConfig(): GlobalConfig {
  return {
    isBrowser: false,
    autoForce: true,
  };
}

export { makeDefaultGlobalConfig };
