import type { Global } from "../index.types";

function makeDefaultGlobal(): Global {
  return {
    isBrowser: true,
    autoForce: true,
  };
}

export { makeDefaultGlobal };
