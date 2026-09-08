import assert from "node:assert/strict";
import test from "node:test";
import type { IntentEvent } from "@avail-project/nexus-core";
import { adaptIntentEvent } from "./better-intent-compat.ts";

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
