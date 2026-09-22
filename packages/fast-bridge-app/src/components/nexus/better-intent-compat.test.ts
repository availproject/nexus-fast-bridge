import assert from "node:assert/strict";
import test from "node:test";
import type { IntentEvent } from "@avail-project/nexus-core";
import {
  adaptIntentEvent,
  addIntentUsdValues,
  extractIntentIdFromUrl,
  formatIntentProviderName,
  isBetterIntentProvider,
  isExternalIntentProvider,
  isTokenSupportedForRole,
  normalizeIntentQuote,
  normalizeSupportedChains,
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

test("requires chain and token provider support to intersect for the requested role", () => {
  const tokenAddress = "0x0000000000000000000000000000000000000001";
  const catalog = [
    {
      id: 10,
      providers: ["mayan", "relay"],
      asSource: ["relay"],
      asDestination: ["mayan"],
      tokens: [
        {
          address: tokenAddress,
          contractAddress: tokenAddress,
          providers: [{ id: "mayan" }, { id: "relay" }],
          asSource: [{ id: "relay" }],
          asDestination: [{ id: "relay" }],
        },
      ],
    },
  ] as any;

  assert.equal(
    isTokenSupportedForRole(catalog, "source", 10, tokenAddress),
    true
  );
  assert.equal(
    isTokenSupportedForRole(catalog, "destination", 10, tokenAddress),
    false
  );

  catalog[0].tokens[0].asDestination = [{ id: "mayan" }];
  assert.equal(
    isTokenSupportedForRole(catalog, "destination", 10, tokenAddress),
    true
  );
});

test("respects explicit empty directional support and rejects missing tokens", () => {
  const tokenAddress = "0x0000000000000000000000000000000000000001";
  const catalog = [
    {
      id: 10,
      providers: ["mayan"],
      asSource: [],
      asDestination: ["mayan"],
      tokens: [
        {
          address: tokenAddress,
          contractAddress: tokenAddress,
          providers: [{ id: "mayan" }],
          asSource: [{ id: "mayan" }],
          asDestination: [{ id: "mayan" }],
        },
      ],
    },
  ] as any;

  assert.equal(
    isTokenSupportedForRole(catalog, "source", 10, tokenAddress),
    false
  );
  assert.equal(
    isTokenSupportedForRole(
      catalog,
      "destination",
      10,
      "0x0000000000000000000000000000000000000002"
    ),
    false
  );
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
        amountUsd: "0.01",
        depositFeeRaw: 0n,
        depositFeeUsd: "0",
        totalRequiredRaw: 1n,
        totalRequiredUsd: "0.01",
      },
      {
        chainId: 10,
        tokenAddress: "0x0000000000000000000000000000000000000001",
        tokenSymbol: "USDC",
        amountRaw: 1n,
        amountUsd: "0.000001",
        depositFeeRaw: 0n,
        depositFeeUsd: "0",
        totalRequiredRaw: 1n,
        totalRequiredUsd: "0.000001",
      },
    ],
    output: {
      chainId: 137,
      tokenAddress: "0x0000000000000000000000000000000000000002",
      amountRaw: 1n,
      amountUsd: "0.000001",
      minAmountRaw: 1n,
      minAmountUsd: "0.000001",
    },
    fees: {
      depositRaw: 0n,
      depositUsd: "0.001",
      fulfillmentRaw: 0n,
      fulfillmentUsd: "0.005",
      protocolRaw: 0n,
      protocolUsd: "0.002",
      solverRaw: 0n,
      solverUsd: "0.003",
    },
    expiresAt: 2_000_000_000,
    sourceVerdicts: [],
    allowances: [],
    plan: { steps: [] },
  } as any;

  const normalized = normalizeIntentQuote(quote, []);
  assert.equal(normalized.sourcesTotal, undefined);
  assert.equal(normalized.destination.value, "0.000001");
  assert.equal(normalized.destination.minAmount, "0.000000000000000001");
  assert.equal(normalized.destination.minAmountUsd, "0.000001");
  assert.deepEqual(
    normalized.sources.map((source) => source.value),
    ["0.01", "0.000001"]
  );
  assert.deepEqual(normalized.feesAndBuffer.bridge, {
    caGas: "0",
    caGasUsd: "0.001",
    fulfillmentUsd: "0.005",
    protocol: "0",
    protocolUsd: "0.002",
    solver: "0",
    solverUsd: "0.003",
    total: "0",
    totalUsd: "0.006",
  });
  const withFallbackRates = addIntentUsdValues(normalized, () => 99);
  assert.equal(withFallbackRates.destination.value, "0.000001");
  assert.deepEqual(
    withFallbackRates.sources.map((source) => source.value),
    ["0.01", "0.000001"]
  );
});

test("normalizes supported chains without tokens (Better Intent on-demand tokens)", () => {
  const chainsWithoutTokens = [
    {
      id: 1,
      name: "Ethereum",
      logo: "https://example.com/eth.png",
      swapSupported: true,
      providers: ["nexus-v2", "mayan", "relay"],
      asSource: ["nexus-v2", "mayan", "relay"],
      asDestination: ["nexus-v2", "mayan", "relay"],
      capabilities: { intent: true, execute: true },
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    },
  ] as any;

  const normalized = normalizeSupportedChains(chainsWithoutTokens);
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].id, 1);
  assert.equal(normalized[0].swapSupported, true);
  assert.deepEqual(normalized[0].tokens, []);

  // When tokens array is empty, role support defaults to chain provider capability
  assert.equal(
    isTokenSupportedForRole(
      normalized,
      "source",
      1,
      "0x0000000000000000000000000000000000000000"
    ),
    true
  );
  assert.equal(
    isTokenSupportedForRole(
      normalized,
      "destination",
      1,
      "0x0000000000000000000000000000000000000000"
    ),
    true
  );
});
