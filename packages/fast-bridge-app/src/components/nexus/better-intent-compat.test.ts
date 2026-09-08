import assert from "node:assert/strict";
import test from "node:test";
import type { IntentEvent } from "@avail-project/nexus-core";
import {
  adaptIntentEvent,
  formatIntentProviderName,
  isBetterIntentProvider,
  isExternalIntentProvider,
} from "./better-intent-compat.ts";

test("recognizes every provider supported by middleware 1.10", () => {
  assert.equal(isBetterIntentProvider("nexus-v2"), true);
  assert.equal(isBetterIntentProvider("mayan"), true);
  assert.equal(isBetterIntentProvider("relay"), true);
  assert.equal(isBetterIntentProvider("future-provider"), false);
  assert.equal(formatIntentProviderName("relay"), "Relay");
  assert.equal(isExternalIntentProvider("nexus-v2"), false);
  assert.equal(isExternalIntentProvider("mayan"), true);
  assert.equal(isExternalIntentProvider("relay"), true);
});

test("preserves commitment and structured errors in adapted step events", () => {
  const event = {
    type: "step",
    step: { id: "intent-signature", type: "intent_signature" },
    state: "failed",
    committed: false,
    error: "User rejected the intent signature",
    errorDetails: {
      name: "UserActionError",
      message: "User rejected the intent signature",
      category: "user_action",
      code: "user_action/intent_signature_denied",
      service: "wallet",
      stepId: "intent-signature",
      stepType: "intent_signature",
    },
  } satisfies IntentEvent;

  assert.deepEqual(adaptIntentEvent(event), {
    type: "plan_progress",
    stepType: "intent_signature",
    state: "failed",
    step: event.step,
    committed: false,
    error: event.errorDetails,
    errorDetails: event.errorDetails,
  });
});
