import assert from "node:assert/strict";
import test from "node:test";
import {
  markIntentLegsFulfilled,
  mergeExpectedIntentLegs,
} from "./better-intent-progress.ts";

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
