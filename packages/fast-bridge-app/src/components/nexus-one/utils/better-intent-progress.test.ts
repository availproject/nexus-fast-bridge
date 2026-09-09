import assert from "node:assert/strict";
import test from "node:test";
import {
  findIntentSourceForLeg,
  markIntentLegsFulfilled,
  mergeExpectedIntentLegs,
} from "./better-intent-progress.ts";

test("matches status legs by stable source index after display sorting", () => {
  const sources = [
    { sourceIndex: 1, symbol: "USDC on Optimism" },
    { sourceIndex: 0, symbol: "USDC on Monad" },
  ];

  assert.equal(findIntentSourceForLeg(sources, 0)?.symbol, "USDC on Monad");
  assert.equal(findIntentSourceForLeg(sources, 1)?.symbol, "USDC on Optimism");
});

test("seeds every quoted source as waiting for deposit", () => {
  assert.deepEqual(mergeExpectedIntentLegs(2, []), [
    { sourceIndex: 0, status: "created" },
    { sourceIndex: 1, status: "created" },
  ]);
});

test("merges partial backend leg progress with quoted sources", () => {
  assert.deepEqual(
    mergeExpectedIntentLegs(2, [{ sourceIndex: 0, status: "deposited" }]),
    [
      { sourceIndex: 0, status: "deposited" },
      { sourceIndex: 1, status: "created" },
    ]
  );
});

test("marks every source fulfilled before showing the receipt", () => {
  assert.deepEqual(
    markIntentLegsFulfilled(2, [
      { sourceIndex: 0, status: "deposited" },
      { error: "stale", sourceIndex: 1, status: "created" },
    ]),
    [
      { error: undefined, sourceIndex: 0, status: "fulfilled" },
      { error: undefined, sourceIndex: 1, status: "fulfilled" },
    ]
  );
});
