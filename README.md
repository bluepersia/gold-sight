![Tool Logo](https://github.com/bluepersia/gold-sight/blob/master/assets/logo.png)

Welcome to GoldSight, a minimalistic framework that makes it easy to test your code on realistic content.

Top-level E2E functions can get thorough assertions on almost every sub-function.
This merges realistic E2E + Integration + Unit tests in one chain.

There are 3 steps to using this tool.

1. a. Identify the realistic "end results" to be measured.
   b. Type these out manually at first, to ensure human-proved accuracy.

2. a. Identify the top-level functions that map directly to this content.
   b. Build a test chain for these top-level functions.

Let's go through this part.

Create an `assertions.ts` file for a particular master project.

Import these parts of the framework:

```ts
import AssertionMaster, {
  AssertionChain,
  State as GoldSightState,
} from "gold-sight";
```

Initialize the master state:

```ts
type State = GoldSightState & {
  master?: Master;
  sheetIndex: number;
  absRulesIndex: number;
  absRuleIndex: number;
  absStyleRuleIndex: number;
  absMediaRuleIndex: number;
};

function newState(): State {
  return {
    sheetIndex: 0,
    absRulesIndex: 0,
    absRuleIndex: 0,
    absStyleRuleIndex: 0,
    absMediaRuleIndex: 0,
  };
}
let state: State = newState();
```

As you can see, you need a master object for each project.
I also recommend absolute indexes and creating helper functions that return content based on absolute indexes. This is far easier to reason about than mixing sheetIndex + ruleIndex etc., and it works recursively/nested.
Ideally this master object should contain an index. For each test run, you can refer to things by this index.

Next, define the assertions.
Here is an example following the previous:

```ts
const cloneDocumentAssertions: AssertionChain<State, DocumentClone, Document> =
  {
    "should clone the document": (state, result) => {
      toBeEqualDefined(result, state.master!.docClone, makeVitestMsg(state));
    },
  };

const cloneStyleSheetsAssertions: AssertionChain<
  State,
  StyleSheetClone[],
  StyleSheetList
> = {
  "should clone the stylesheets": (state, result) => {
    toBeEqualDefined(
      result,
      state.master!.docClone.styleSheets,
      makeVitestMsg(state)
    );
  },
};

const cloneStyleSheetAssertions: AssertionChain<
  State,
  StyleSheetClone,
  CSSStyleSheet
> = {
  "should clone the stylesheet": (state, result) => {
    toBeEqualDefined(
      result,
      state.master!.docClone.styleSheets[state.sheetIndex],
      makeVitestMsg(state, {
        sheetIndex: state.sheetIndex,
      })
    );
  },
};

const cloneRulesAssertions: AssertionChain<State, RuleClone[], CSSRuleList> = {
  "should clone the rules": (state, result) => {
    toBeEqualDefined(
      result,
      getRulesByAbsIndex(state.master!.docClone, state.absRulesIndex),
      makeVitestMsg(state, {
        absRulesIndex: state.absRulesIndex,
      })
    );
  },
};

const cloneRuleAssertions: AssertionChain<State, RuleClone | null, CSSRule> = {
  "should clone the rule": (state, result, args) => {
    if (result === null) return;

    toBeEqualDefined(
      result,
      getRuleByAbsIndex(state.master!.docClone, state.absRuleIndex),
      makeVitestMsg(state, {
        absStyleRuleIndex: state.absRuleIndex,
      })
    );
  },
};

const cloneStyleRuleAssertions: AssertionChain<
  State,
  StyleRuleClone | null,
  CSSStyleRule
> = {
  "should clone the style rule": (state, result) => {
    if (result === null) return;

    toBeEqualDefined(
      result,
      getStyleRuleByAbsIndex(state.master!.docClone, state.absStyleRuleIndex),
      makeVitestMsg(state, {
        sheetIndex: state.sheetIndex,
        absStyleRuleIndex: state.absStyleRuleIndex,
      })
    );
  },
};

const cloneMediaRuleAssertions: AssertionChain<
  State,
  MediaRuleClone | null,
  CSSMediaRule
> = {
  "should clone the media rule": (state, result) => {
    if (result === null) return;
    console.log(state.absMediaRuleIndex);
    console.log(result);
    toBeEqualDefined(
      result,
      getMediaRuleByAbsIndex(state.master!.docClone, state.absMediaRuleIndex)
    );
  },
};

const defaultAssertions = {
  cloneDocument: cloneDocumentAssertions,
  cloneStyleSheets: cloneStyleSheetsAssertions,
  cloneStyleSheet: cloneStyleSheetAssertions,
  cloneRules: cloneRulesAssertions,
  cloneRule: cloneRuleAssertions,
  cloneStyleRule: cloneStyleRuleAssertions,
  cloneMediaRule: cloneMediaRuleAssertions,
};
```

As you can see, many subfunctions will get asserted.
Important essential details to consider:

1. Use a helper that ensures content is defined. Master data often gets referred to by arrays and indexes, which silently return undefined. Use such a helper for these kinds of tests.
2. Pass a helpful path message to your testing library. You don't want to just know `value is expected to be defined`. You want to know where exactly. That's a main point of this framework.

Finally for this phase - extend the assertion class and define your own:

```ts
class WebsiteCloneAssertions extends AssertionMaster<State> {
  constructor(state: State) {
    super(state, defaultAssertions, "cloneDocument");
  }

  cloneDocument = this.wrapFn(cloneDocument, "cloneDocument", {
    pre: () => {
      state = newState();
    },
  });
  cloneStyleSheets = this.wrapFn(cloneStyleSheets, "cloneStyleSheets");
  cloneStyleSheet = this.wrapFn(cloneStyleSheet, "cloneStyleSheet", {
    post: (state) => state.sheetIndex++,
  });
  cloneRules = this.wrapFn(cloneRules, "cloneRules", {
    post: (state) => state.absRulesIndex++,
  });
  cloneRule = this.wrapFn(cloneRule, "cloneRule", {
    post: (state, args, result) => {
      if (result === null) return;
      state.absRuleIndex++;
    },
  });
  cloneStyleRule = this.wrapFn(cloneStyleRule, "cloneStyleRule", {
    post: (state, args, result) => result !== null && state.absStyleRuleIndex++,
  });
  cloneMediaRule = this.wrapFn(cloneMediaRule, "cloneMediaRule", {
    post: (state, args, result) => result !== null && state.absMediaRuleIndex++,
  });

  wrapAll() {
    wrap(
      this.cloneDocument,
      this.cloneStyleSheets,
      this.cloneStyleSheet,
      this.cloneRules,
      this.cloneRule,
      this.cloneStyleRule,
      this.cloneMediaRule
    );
  }
}

const masterAssertions = new WebsiteCloneAssertions(state);

export default masterAssertions;
```

`wrapFn` wraps a function in a helper function that registers assertion data.

Lastly, you need to set up `wrapAll`, which actually wraps all the functions to run assertions on each.
You can define `wrapAll` on the extension class.

`wrap` must be defined in your production code. It wraps all of the original functions:

```ts
/* -- TEST WRAPPING -- */

function wrap(
  cloneDocumentWrapped: (document: Document) => DocumentClone,
  cloneStyleSheetsWrapped: (styleSheets: StyleSheetList) => StyleSheetClone[],
  cloneStyleSheetWrapped: (sheet: CSSStyleSheet) => StyleSheetClone,
  cloneRulesWrapped: (rules: CSSRuleList) => RuleClone[],
  cloneRuleWrapped: (rule: CSSRule) => RuleClone | null,
  cloneStyleRuleWrapped: (rule: CSSStyleRule) => StyleRuleClone | null,
  cloneMediaRuleWrapped: (rule: CSSMediaRule) => MediaRuleClone | null
) {
  cloneDocument = cloneDocumentWrapped;
  cloneStyleSheets = cloneStyleSheetsWrapped;
  cloneStyleSheet = cloneStyleSheetWrapped;
  cloneRules = cloneRulesWrapped;
  cloneRule = cloneRuleWrapped;
  cloneStyleRule = cloneStyleRuleWrapped;
  cloneMediaRule = cloneMediaRuleWrapped;
}
```

You can still export the originals if you need them.

We have set up the assertions.

Finally, to step 3 - running the assertions.
For general cases, all you need to do is:

1. Set up a start script that runs before the test suite. This script should call the `wrapAll` for this function chain.
2. Call `assertQueue` on the extended class object. This runs the assertions, of course.

For more advanced environments like `Playwright`, you can do something like this:

```ts
describe("cloneDocument", () => {
  test.each(masterCollection)(
    "should clone the document",
    async ({ master, index }) => {
      const queue: [number, AssertionBlueprint][] = await playwrightPages[
        index
      ].page.evaluate(
        async ({ master, index }) => {
          const masterAssertions = window.FluidScale.masterAssertions[index];
          masterAssertions.callTopFn(masterAssertions.cloneDocument, master, {
            args: [document],
          });

          const queue = (window as any).getQueue("cloneDocument");

          return Array.from(queue.entries());
        },
        { master, index }
      );

      assertionCollection[index].setQueueFromArray(queue);
      assertionCollection[index].assertQueue();
    }
  );
});
```

And that's it. You're testing your code in modular detail on realistic content.
