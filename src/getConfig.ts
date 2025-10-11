import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { packageDirectorySync } from "pkg-dir"; // ✅ correct import for v6+
import { AssertOptions, DeepCloneOptions } from "./index.types";
export interface Config {
  assertOptions?: AssertOptions;
  deepCloneOptions?: DeepCloneOptions;
}

export function getConfig(filename = "gold-sight.config.json"): Config {
  // 1. Find the consumer project’s root directory (where package.json lives)
  const projectRoot =
    packageDirectorySync({ cwd: process.cwd() }) ?? process.cwd();

  // 2. Build full config path
  const configPath = join(projectRoot, filename);

  // 3. Try to load JSON config
  if (!existsSync(configPath)) {
    console.warn(`[GoldSight] No config file found at: ${configPath}`);
    return {};
  }

  try {
    const raw = readFileSync(configPath, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    console.error(`[mytool] Failed to parse config file: ${configPath}`);
    throw error;
  }
}
