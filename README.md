![Tool Logo](https://github.com/bluepersia/gold-sight/blob/master/assets/logo.png)

# GoldSight

**Test complex function chains on realistic data with surgical precision.**

GoldSight is a testing framework that enables you to test deeply nested function chains with comprehensive assertions at every level—using realistic, real-world data. Run one test and verify every sub-function, capturing regressions that simple unit tests miss.

## Why GoldSight?

Traditional testing forces you to choose:

- **Unit tests** with simple data that miss real-world complexity
- **Integration tests** that only verify final outputs, hiding where failures occur

**GoldSight gives you both:** Test with realistic complexity while getting unit-level assertions throughout your entire call chain.

### Key Benefits

✅ **Test realistic complexity** - Use real-world data, not toy examples  
✅ **Pinpoint failures instantly** - Know exactly which sub-function failed  
✅ **Reduce test duplication** - One test provides unit + integration coverage  
✅ **Catch subtle regressions** - Golden masters detect issues simple data misses  
✅ **Track state changes** - Built-in event system monitors flow through your code  
✅ **Debug faster** - Precise error reporting with full context

## Installation

```bash
npm install gold-sight
```

## Quick Start

[See realistic GoldSight assertion setup example here](https://github.com/bluepersia/gold-sight/blob/new-assertion-order-2/test/golden-master/docCloner/parsing/serialization/docClonerGoldSight.ts)<br>
[See realistic source code event emissions here](https://github.com/bluepersia/gold-sight/blob/new-assertion-order-2/test/golden-master/docCloner/src/parsing/serialization/docCloner.ts)<br>
[See realistic test code here](https://github.com/bluepersia/fluid-scale-/blob/master/test/parsing/serialization/docCloner.test.ts)<br>

```typescript
import AssertionMaster, { AssertionChain } from "gold-sight";

// 1. Define your state
type State = {
  master?: PricingMaster;
  itemIndex: number;
};

// 2. Create assertion chains for each function
const calculateTotalAssertions: AssertionChain<
  State,
  Parameters<typeof calculateTotal>,
  number
> = {
  "should calculate correct total": (state, args, result) => {
    expect(result).toBe(state.master.expectedTotal);
  },
};

const calculateTaxAssertions: AssertionChain<
  State,
  Parameters<typeof calculateTax>,
  number
> = {
  "should calculate tax correctly": (state, args, result) => {
    expect(result).toBe(state.master.expectedTax[state.itemIndex]);
  },
};
//Alternatively, use AssertionChainForFunc<State, typeof function> for easily hooking into the function.

// 3. Create your assertion master
class PricingAssertions extends AssertionMaster<State, PricingMaster> {
  newState(): State {
    return { itemIndex: 0 };
  }

  constructor() {
    super(
      {
        calculateTotal: calculateTotalAssertions,
        calculateTax: calculateTaxAssertions,
      },
      "pricing"
    );
  }

  calculateTotal = this.wrapTopFn(calculateTotal, "calculateTotal");
  calculateTax = this.wrapFn(calculateTax, "calculateTax", {
    post: (state) => state.itemIndex++,
  });
}

const assertionMaster = new PricingAssertions();

// 4. Set up code that wraps your production code
import { wrap } from "../../src/pricing";

function wrapAll() {
  wrap(assertionMaster.calculateTotal, assertionMaster.calculateTax);
}

//4b. Production:
function wrap(
  calculateTotalWrapped: typeof calculateTotal,
  calculateTaxWrapped: typeof calculateTax
) {
  calculateTotal = calculateTotalWrapped;
  calculateTax = calculateTax;
}
///IMPORTANT: Functions must be `let` declarations.

export { wrap };

// 5. Write your test

wrapAll(); // Wrap functions in your global setup

test("calculate pricing with realistic cart", () => {
  assertionMaster.master = {
    index: 0,
    expectedTotal: 1299.99,
    expectedTax: [8.25, 12.5, 5.0],
  };

  const result = calculateTotal(realWorldCart);

  // Asserts on calculateTotal AND all sub-functions
  assertionMaster.assertQueue();
});
```

## Core Concepts

### Golden Masters

A golden master is a pre-verified, realistic dataset representing expected behavior:

```typescript
const master = {
  index: 0,
  input: complexRealWorldData,
  expectedOutput: manuallyVerifiedOutput,
  intermediateResults: {
    step1: expectedStep1Result,
    step2: expectedStep2Result,
    // ... etc
  },
};
```

### Assertion Chains

Assertion chains define what to verify for each function:

```typescript
const myFunctionAssertions: AssertionChain<State, Args, Result> = {
  "descriptive assertion name": (state, args, result, allAssertions) => {
    // Your assertions here
    expect(result).toBe(expected);
  },
  "another assertion": (state, args, result, allAssertions) => {
    // Multiple assertions per function
  },
};
```

### Function Wrapping

Wrap functions to track their execution and enable assertions:

```typescript
// Top-level function (entry point)
topFunction = this.wrapTopFn(topFunction, "topFunction");

// Sub-functions (called by other wrapped functions)
subFunction = this.wrapFn(subFunction, "subFunction", {
  pre: (state, args) => {
    /* before execution */
  },
  post: (state, args, result) => {
    /* after execution */
  },
});
```

## API Reference

### AssertionMaster

The core class you extend for your tests.

```typescript
abstract class AssertionMaster<TState, TMaster extends { index: number; step?: number }>
```

#### Constructor

```typescript
constructor(
  assertionChains: { [funcKey: string]: AssertionChain<TState, any, any> },
  globalKey: string,
  globalOptions?: Config<TState>
)
```

- `assertionChains` - Object mapping function names to assertion chains
- `globalKey` - Unique identifier for this assertion master
- `globalOptions` - Optional global configuration

#### Methods

##### `wrapTopFn<T>(fn, name, options?)`

Wraps a top-level function (entry point).

```typescript
calculateTotal = this.wrapTopFn(calculateTotal, "calculateTotal", {
  pre: (state, args) => {
    /* setup */
  },
  post: (state, args, result) => {
    /* cleanup */
  },
  argsConverter: (args) => transformedArgs,
  resultConverter: (result, args) => transformedResult,
  getAddress: (state, args, result) => "path.to.data",
  getAddress: (state, args, result) => {} // object pretty-formatted
  getSnapshot: (state, args, result) => snapshotData,
});
```

**Options:**

- `pre` - Execute before function runs
- `post` - Execute after function runs
- `argsConverter` - Transform arguments for assertions
- `resultConverter` - Transform result for assertions
- `getSnapshot` - Capture additional state data
- `getAddress` - Provide context path for error messages

##### `wrapFn<T>(fn, name, options?)`

Wraps a sub-function.

```typescript
calculateTax = this.wrapFn(calculateTax, "calculateTax", {
  pre: (state, args) => {
    /* before */
  },
  post: (state, args, result) => {
    state.itemIndex++;
  },
  deepClone: { args: true, result: true },
  argsConverter: (args) => args.map((a) => a * 2),
  resultConverter: (result, args) => result * 2,
  getAddress: (state, args, result) => ({ itemIndex: state.itemIndex }),
  getSnapshot: (state, args, result) => ({ ...state, result }),
});
```

**Options:**

- `pre` - Execute before function runs
- `post` - Execute after function runs (state updates)
- `deepClone` - Clone args/result before storing (`{ args: boolean, result: boolean }`)
- `argsConverter` - Transform arguments for assertions
- `resultConverter` - Transform result for assertions
- `getAddress` - Provide context for errors (string or object)
- `getSnapshot` - Capture state snapshot

##### `assertQueue(options?)`

Runs all queued assertions.

```typescript
assertionMaster.assertQueue({
  errorAlgorithm: "firstOfDeepest", // or 'deepest'
  master: { index: 0, step: 1 },
  showAllErrors: false,
  targetName: "specificFunction",
  logMasterName: "Test Suite Name",
  verbose: true,
});
```

**Options:**

- `errorAlgorithm` - Error reporting strategy:
  - `'firstOfDeepest'` - Show first failure in deepest call (default)
  - `'deepest'` - Show the deepest failure
- `master` - Master data for this test run
- `showAllErrors` - Show all errors vs. first error
- `targetName` - Only run assertions for specific function
- `logMasterName` - Name for console output
- `verbose` - Log assertion counts

**Returns:** `Map<string, number>` - Assertion run counts

##### `resetState()`

Resets internal state. Called automatically by `wrapTopFn`.

##### `reset()`

Clears the assertion queue.

##### `setQueue(queue)` / `setQueueFromArray(queue)`

Set assertion queue manually (useful for cross-context testing like Playwright).

```typescript
// Get queue from browser context
const queue = await page.evaluate(() => {
  return Array.from(assertionMaster.getQueue().entries());
});

// Set in Node context
assertionMaster.setQueueFromArray(queue);
assertionMaster.assertQueue({ master });
```

##### `abstract newState(): TState`

Must implement - returns fresh state for each test.

```typescript
newState(): State {
  return {
    itemIndex: 0,
    totalIndex: 0
  };
}
```

### Global Configuration

Configure GoldSight via `gold-sight.config.json` in your project root:

```json
{
  "assert": {
    "errorAlgorithm": "firstOfDeepest",
    "verbose": true,
    "showAllErrors": false
  },
  "deepClone": {
    "args": false,
    "result": false
  },
  "getSnapshot": null
}
```

Or pass to constructor:

```typescript
new MyAssertions(assertionChains, "myKey", {
  assert: { verbose: true },
  deepClone: { args: true, result: true },
  getSnapshot: (state, args, result) => ({ state, result }),
});
```

### EventBus

Track side effects and state changes through your function chain.

#### Creating Event Context

```typescript
import { makeEventContext, type EventContext } from "gold-sight";

// Pass to your functions
myFunction({
  ...makeEventContext(),
} as EventContext);
```

#### Emitting Events

```typescript
function calculateTax(amount: number, ctx: EventContext) {
  // Emit event (can emit multiple times)
  ctx.event?.emit("tax_calculated", ctx, { amount, rate: 0.0825 });

  // Emit once (subsequent calls with same UUID ignored)
  ctx.event?.emitOnce("tax_lookup", ctx, { region: "CA" });

  // Emit one (replace previous with same key)
  ctx.event?.emitOne("current_total", ctx, { total: amount });

  return amount * 0.0825;
}
```

#### Querying Events

```typescript
// Get all events for a name
const events = eventBus.events["tax_calculated"];

// Filter by state
const matchingEvents = filterEventsByState(eventBus, "tax_calculated", {
  itemIndex: 5,
});

// Filter by payload
const taxEvents = filterEventsByPayload(eventBus, "tax_calculated", {
  rate: 0.0825,
});

// Get single event by state
const event = getEventByState(eventBus, "tax_calculated", { itemIndex: 5 });

// Get event by payload
const event = getEventByPayload(eventBus, "tax_calculated", { rate: 0.0825 });

// Filter by UUID (for specific execution path)
const scopedEvents = filterEventsByUUID(eventBus, "tax_calculated", uuid);

// Get event for specific UUID
const event = getEventByUUID(eventBus, "tax_calculated", uuid);
```

#### Helper Functions

```typescript
// Use with helpers for cleaner code
withEventBus(args, (eventBus) => {
  // Work with eventBus
});

withEvents(args, (eventBus, eventUUID) => {
  // Work with eventBus and UUID
});

withEventNames(args, ["event1", "event2"], (events, eventBus, eventUUID) => {
  // events is Record<string, IEvent> with requested events
});
```

#### Example Event-based Assertion

```typescript
const assertions: AssertionChain<State, Args, Result> = {
  "should clone rule": (state, args, result) =>
    withEventNames(args, ["ruleCloned", "ruleOmitted"], (events) => {
      expect(Object.keys(events).length).toBe(1);
      if (events.ruleCloned) {
        expect(result).toEqual(
          controller.findRule(state.master!.docClone, state.ruleIndex)
        );
      } else if (events.ruleOmitted) {
        expect(result).toBeNull();
      } else {
        throw Error("unknown event");
      }
    }),
};
```

#### Event Structure

```typescript
type IEvent = {
  name: string; // Event name
  payload?: any; // Custom data
  state?: any; // State when emitted
  eventUUID: string; // UUID for this execution
  uuidStack: string[]; // Full execution path
  funcData: {
    funcName: string; // Function that emitted
    funcIndex: number; // Depth in call chain
  };
};
```

### Utilities

#### AbsCounter

Track absolute position across nested structures:

```typescript
import { AbsCounter } from "gold-sight";

const counter = new AbsCounter(5); // Target index 5

// Keep calling until match
while (true) {
  if (counter.match()) {
    console.log("Found index 5!");
    break;
  }
  // Process item
}
```

#### deepClone

Deep clone objects (uses lodash.clonedeep):

```typescript
import { deepClone } from "gold-sight";

const cloned = deepClone(original);
```

## Advanced Usage

### State Management Patterns

#### Absolute Indexing

Track position across nested structures:

```typescript
type State = {
  absItemIndex: number; // Absolute item position
  absRuleIndex: number; // Absolute rule position
};

// In your wrapper
itemProcessor = this.wrapFn(processItem, "processItem", {
  post: (state) => state.absItemIndex++,
});

// In assertions, reference by absolute index
expect(result).toBe(master.items[state.absItemIndex]);
```

#### Nested Counters

Track multiple dimensions:

```typescript
type State = {
  sheetIndex: number;
  ruleIndex: number;
  absRuleIndex: number; // Absolute across all sheets
};

cloneSheet = this.wrapFn(cloneSheet, "cloneSheet", {
  post: (state) => {
    state.sheetIndex++;
    state.ruleIndex = 0; // Reset nested counter
  },
});

cloneRule = this.wrapFn(cloneRule, "cloneRule", {
  post: (state) => {
    state.ruleIndex++;
    state.absRuleIndex++; // Keep incrementing absolute
  },
});
```

### Async Functions

GoldSight automatically handles async functions:

```typescript
asyncFunction = this.wrapTopFn(async function () {
  const result = await fetchData();
  return process(result);
}, "asyncFunction");

test("async test", async () => {
  await asyncFunction();
  assertionMaster.assertQueue();
});
```

### Cross-Context Testing (Playwright/Puppeteer)

Test functions running in browser context:

```typescript
test("browser function", async ({ page }) => {
  // Execute in browser
  const queue = await page.evaluate(async (master) => {
    (window as any).assertionMaster.master = master;
    const result = (window as any).topFunc(/*args*/);
    return Array.from(assertionMaster.getQueue().entries());
  }, master);

  // Assert in Node.js
  assertionMaster.setQueueFromArray(queue);
  assertionMaster.assertQueue({ master });
});
```

### Custom Error Contexts

Provide rich context for debugging:

```typescript
myFunction = this.wrapFn(myFunction, "myFunction", {
  getAddress: (state, args, result) => ({
    itemIndex: state.itemIndex,
    userId: args[0].userId,
    step: "validation",
  }),
});

// Error output includes context:
// "Master:0, itemIndex:5, userId:123, step:validation, Expected X but got Y"
```

### Snapshots for Additional Validation

Capture state for later inspection:

```typescript
myFunction = this.wrapFn(myFunction, "myFunction", {
  getSnapshot: (state, args, result) => ({
    timing: performance.now(),
    memory: process.memoryUsage(),
    cacheState: getCacheSnapshot(),
  }),
});

// Access in assertions
const assertions: AssertionChain = {
  "verify performance": (state, args, result, allAssertions) => {
    const blueprint = allAssertions.find((a) => a.name === "myFunction");
    expect(blueprint.snapshot.timing).toBeLessThan(100);
  },
};
```

### Testing Multiple Masters

Test multiple scenarios in one suite:

```typescript
const masterCollection = [
  { index: 0, data: simpleCase, expected: simpleResult },
  { index: 1, data: complexCase, expected: complexResult },
  { index: 2, data: edgeCase, expected: edgeResult },
];

test.each(masterCollection)("test case $index", (master) => {
  assertionMaster.master = master;
  myFunction(master.data);
  assertionMaster.assertQueue();
});
```

## Best Practices

### 1. Use Absolute Indexing

```typescript
// ❌ Avoid nested indexing
state.sheets[state.sheetIndex].rules[state.ruleIndex];

// ✅ Use absolute indexing
state.absRuleIndex++; // Easier to reason about
master.rules[state.absRuleIndex];
```

### 2. Validate Master Data

Use helpers to ensure data exists:

```typescript
function toBeEqualDefined<T>(
  actual: T,
  expected: T | undefined,
  message?: string
) {
  expect(expected, message).toBeDefined();
  expect(actual).toEqual(expected);
}

// In assertions
toBeEqualDefined(result, master.items[state.index], `Item at ${state.index}`);
```

### 3. Provide Rich Error Context

```typescript
getAddress: (state, args, result) => ({
  sheetIndex: state.sheetIndex,
  selector: args[0].selector,
  mediaQuery: args[0].media,
});

// Clear error messages:
// "Master:0, sheetIndex:3, selector:.button, mediaQuery:(min-width: 768px), ..."
```

### 4. Test with Realistic Data

```typescript
// ❌ Simple test data
const cart = { items: [{ price: 10 }] };

// ✅ Realistic complexity
const cart = {
  items: [
    /* 50 realistic items */
  ],
  coupons: [
    /* multiple coupons */
  ],
  member: {
    tier: "gold",
    discounts: [
      /* ... */
    ],
  },
  // ... real-world complexity
};
```

### 5. Structure Your Test Files

```
test/
  my-feature/
    assertions.ts     # Assertion chains & master class
    logic.ts          # Production code (or import from src)
    master.ts         # Golden master data
    feature.test.ts   # Test file
```

### 6. Use Events for Side Effect Testing

```typescript
// Track important state changes
ctx.eventBus?.emit("discount_applied", ctx, {
  type: "COUPON",
  amount: 20,
});

// Verify in assertions
const discountEvents = filterEventsByPayload(eventBus, "discount_applied", {
  type: "COUPON",
});
expect(discountEvents.length).toBe(1);
```

### 7. Keep State Simple

```typescript
// ✅ Simple counters
type State = {
  itemIndex: number;
  ruleIndex: number;
};

// ❌ Avoid complex state
type State = {
  items: Map<string, Item[]>;
  cache: WeakMap<object, Result>;
  // ... too complex
};
```

## Use Cases

### ✅ Ideal For

- **Financial calculations** - Loan amortization, pricing engines, tax calculations
- **Data transformation pipelines** - ETL, data processing, serialization
- **Parsing and compilation** - AST processing, document parsing, code generation
- **Complex algorithms** - Sorting, graph algorithms, optimization problems
- **Business rule engines** - Complex conditional logic, rule evaluation
- **Report generation** - Multi-step data aggregation and formatting
- **Mathematical computations** - Scientific calculations, statistics

### ⚠️ Limited Use For

- Direct UI interaction testing (use with Playwright/Cypress)
- External API integration (use for response processing)
- Database operations (use for query building/result processing)
- File system operations (use for data processing)

### 🎯 Perfect Hybrid Use

Combine with E2E tools for comprehensive testing:

```typescript
test("order checkout flow", async ({ page }) => {
  // 1. E2E: User interaction
  await page.goto("/cart");
  await page.fill("#coupon", "SAVE20");
  await page.click("#checkout");

  // 2. GoldSight: Test pricing logic
  const cartData = await getCartData();
  const pricing = calculatePricing(cartData);
  pricingAssertions.assertQueue(); // ✅ All pricing verified

  // 3. E2E: Verify UI
  await expect(page.locator(".total")).toContainText(`$${pricing.total}`);
});
```

## Examples

### Example 1: Shopping Cart Pricing

```typescript
// State
type State = {
  itemIndex: number;
  discountIndex: number;
  master?: PricingMaster;
};

// Master
const master: PricingMaster = {
  index: 0,
  cart: realWorldCart,
  expectedSubtotal: 1250.0,
  expectedTax: [8.25, 12.5, 5.0],
  expectedDiscounts: [50, 20, 15],
  expectedTotal: 1299.99,
};

// Assertions
const calculateTotalAssertions: AssertionChain<State, any, number> = {
  "calculates correct total": (state, args, result) => {
    expect(result).toBe(state.master.expectedTotal);
  },
};

const calculateTaxAssertions: AssertionChain<State, any, number> = {
  "calculates tax for item": (state, args, result) => {
    expect(result).toBe(state.master.expectedTax[state.itemIndex]);
  },
};

// Master class
class PricingAssertions extends AssertionMaster<State, typeof master> {
  newState() {
    return { itemIndex: 0, discountIndex: 0 };
  }

  constructor() {
    super(
      {
        calculateTotal: calculateTotalAssertions,
        calculateTax: calculateTaxAssertions,
      },
      "pricing"
    );
  }

  calculateTotal = this.wrapTopFn(calculateTotal, "calculateTotal");
  calculateTax = this.wrapFn(calculateTax, "calculateTax", {
    post: (state) => state.itemIndex++,
  });
}

// Test
test("pricing calculation", () => {
  const assertions = new PricingAssertions();
  assertions.master = master;

  calculateTotal(master.cart);
  assertions.assertQueue();
});
```

### Example 2: Document Parser with Events

```typescript
import { makeEventContext, filterEventsByState } from "gold-sight";

// Track parsing events
function parseDocument(doc: string, ctx: EventContext) {
  ctx.eventBus?.emit("parse_start", ctx, { docLength: doc.length });

  const sections = parseSections(doc, ctx);

  ctx.eventBus?.emit("parse_complete", ctx, {
    sectionCount: sections.length,
  });

  return sections;
}

// Assertions can verify events
const parseAssertions: AssertionChain<State, any, Section[]> = {
  "tracks parsing events": (state, args, result, allAssertions) => {
    const eventBus = allAssertions[0].eventBus;

    const startEvents = filterEventsByState(eventBus, "parse_start", {});
    expect(startEvents.length).toBe(1);

    const completeEvents = filterEventsByState(eventBus, "parse_complete", {});
    expect(completeEvents.length).toBe(1);
    expect(completeEvents[0].payload.sectionCount).toBe(result.length);
  },
};

// Test
test("parse document", () => {
  parseDocument(documentText, makeEventContext());

  assertionMaster.assertQueue();
});
```

### Example 3: Conditional Processing

```typescript
function processItem(item: Item, ctx: EventContext): Result | null {
  if (!item.isValid) return null;

  const processed = transform(item, ctx);
  return processed;
}

const processItemAssertions: AssertionChain<State, any, Result | null> = {
  "processes valid items": (state, args, result) => {
    // Skip null results
    if (result === null) return;

    expect(result).toBeDefined();
    expect(result.value).toBe(master.expectedResults[state.itemIndex]);
  },
};

const processItem = this.wrapFn(processItem, "processItem", {
  post: (state, args, result) => {
    // Only increment for processed items
    if (result !== null) {
      state.itemIndex++;
    }
  },
});
```

## TypeScript Support

GoldSight is written in TypeScript with full type definitions:

```typescript
import AssertionMaster, {
  AssertionChain,
  AssertionChainForFunc,
  AssertionBlueprint,
  EventBus,
  IEvent,
  makeEventContext,
  deepClone,
} from "gold-sight";

// Strongly typed assertion chains
const myAssertions: AssertionChainForFunc<State, typeof myFunction> = {
  assertion: (state, args, result) => {
    // args and result are properly typed
  },
};
```

## Testing GoldSight Itself

Run the test suite:

```bash
npm test
```

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

ISC

## Author

Marco Enrique Zimmermann

## Links

- [GitHub Repository](https://github.com/bluepersia/gold-sight)
- [Issue Tracker](https://github.com/bluepersia/gold-sight/issues)
- [NPM Package](https://www.npmjs.com/package/gold-sight)

---

**Test complex code with confidence. Test realistic data with precision.** 🎯
