import path from "path";
import { fileURLToPath } from "url";
import { wrapAll as wrapAllMath1 } from "./golden-master/math/1/assertions";
import { wrapAll as wrapAllMath2 } from "./golden-master/math/2/assertions";
import { wrapAll as wrapAllMath1WithLocalConfig } from "./golden-master/math/1WithLocalConfig/assertions";
import { wrapAll as wrapAllAsync } from "./golden-master/async/assertions";
import { wrapAll as wrapAllDocCloner } from "./golden-master/docCloner/parsing/serialization/docClonerGoldSight";

import { PlaywrightBlueprint } from "./index.types";
import { generateJSDOMDocument } from "./golden-master/docCloner/src/parsing/jsdom/jsonBuilder";

wrapAllMath1();
wrapAllMath2();
wrapAllMath1WithLocalConfig();
wrapAllDocCloner();
wrapAllAsync();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(window as any).dev = true;

const realProjectsData: PlaywrightBlueprint[] = [
  {
    htmlFilePath: "./golden-master/docCloner/0",
    addCss: ["css/global.css", "css/utils.css", "css/product-card.css"],
    useServer: false,
  },
];

const JSDOMDocs = realProjectsData.map(({ htmlFilePath }, index) => {
  const finalPath = path.resolve(__dirname, htmlFilePath, "index.html");
  return { doc: generateJSDOMDocument([finalPath]), index };
});

export { JSDOMDocs };
