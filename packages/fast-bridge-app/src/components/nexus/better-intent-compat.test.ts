import assert from "node:assert/strict";
import test from "node:test";
import type { IntentEvent } from "@avail-project/nexus-core";
import {
  adaptIntentEvent,
  extractIntentIdFromUrl,
  formatIntentProviderName,
  isBetterIntentProvider,
  isExternalIntentProvider,
  normalizeIntentQuote,
} from "./better-intent-compat.ts";

test("extracts Better Intent hashes and legacy numeric explorer IDs", () => {
  const hash = `0x${"ab".repeat(32)}`;
  assert.equal(
    extractIntentIdFromUrl(`https://example.test/explore/${hash}`),
    hash
  );
  assert.equal(
    extractIntentIdFromUrl("https://example.test/explore/123"),
    "123"
  );
  assert.equal(
    extractIntentIdFromUrl("https://example.test/explore/not-an-id"),
    undefined
  );
});

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

test("does not invent one source-token total for mixed-token intents", () => {
  const quote = {
    id: `0x${"11".repeat(32)}`,
    provider: "relay",
    tradeType: "exactInput",
    input: [
      {
        chainId: 1,
        tokenAddress: "0x0000000000000000000000000000000000000000",
        tokenSymbol: "ETH",
        amountRaw: 1n,
        depositFeeRaw: 0n,
        totalRequiredRaw: 1n,
      },
      {
        chainId: 10,
        tokenAddress: "0x0000000000000000000000000000000000000001",
        tokenSymbol: "USDC",
        amountRaw: 1n,
        depositFeeRaw: 0n,
        totalRequiredRaw: 1n,
      },
    ],
    output: {
      chainId: 137,
      tokenAddress: "0x0000000000000000000000000000000000000002",
      amountRaw: 1n,
      minAmountRaw: 1n,
    },
    fees: {
      depositRaw: 0n,
      fulfillmentRaw: 0n,
      protocolRaw: 0n,
      solverRaw: 0n,
      caGasRaw: 0n,
    },
    expiresAt: 2_000_000_000,
    sourceVerdicts: [],
    allowances: [],
    plan: { steps: [] },
  } as any;

  assert.equal(normalizeIntentQuote(quote, []).sourcesTotal, undefined);
});
