/** Nornalize all zeros to '0px' for conistency */
function normalizeZero(input: string): string {
  return input.replace(
    /(?<![\d.])0+(?:\.0+)?(?![\d.])(?!(px|em|rem|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc)\b)/g,
    "0px"
  );
}

/** Normalize the selector for consistency:
 * 1) Replace *::before and *::after with ::before and ::after
 * 2) Normalize spacing around commas
 * 3) Replace multiple spaces with a single space
 * 4) Trim the selector
 */

function normalizeSelector(selector: string): string {
  return selector
    .replace(/\*::(before|after)\b/g, "::$1")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
}

export { normalizeZero, normalizeSelector };
