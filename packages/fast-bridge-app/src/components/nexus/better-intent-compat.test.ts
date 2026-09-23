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
  normalizeIntentBalances,
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

test("allows a provider-tagged token when the route catalog omits its token list", () => {
  const catalog = [
    {
      id: 5042,
      providers: ["relay"],
      asDestination: ["relay"],
      tokens: [],
    },
  ] as any;

  assert.equal(
    isTokenSupportedForRole(
      catalog,
      "destination",
      5042,
      "0x3600000000000000000000000000000000000000",
      ["relay"]
    ),
    true
  );
  assert.equal(
    isTokenSupportedForRole(
      catalog,
      "destination",
      5042,
      "0xb67f50fde86e09b5da963c4251cbd4788b151ed5",
      ["nexus-v2"]
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

test("keeps balances separate by chain and contract address", () => {
  const chains = [
    { id: 1, name: "Ethereum", logo: "", tokens: [] },
    { id: 10, name: "Optimism", logo: "", tokens: [] },
  ] as any;
  const balances = [
    {
      chainId: 1,
      tokenAddress: "0x0000000000000000000000000000000000000001",
      symbol: "USDC",
      decimals: 6,
      balanceRaw: 1_000_000n,
      valueUsd: "1",
      usable: true,
    },
    {
      chainId: 1,
      tokenAddress: "0x0000000000000000000000000000000000000002",
      symbol: "USDC",
      decimals: 6,
      balanceRaw: 2_000_000n,
      valueUsd: "2",
      usable: true,
    },
    {
      chainId: 10,
      tokenAddress: "0x0000000000000000000000000000000000000001",
      symbol: "USDC",
      decimals: 6,
      balanceRaw: 3_000_000n,
      valueUsd: "3",
      usable: true,
    },
  ] as any;

  const normalized = normalizeIntentBalances(balances, chains);

  assert.equal(normalized.length, 3);
  assert.deepEqual(
    normalized.map((asset) => [
      asset.chainBalances[0]?.chain.id,
      asset.chainBalances[0]?.contractAddress,
      asset.balance,
    ]),
    [
      [1, balances[0].tokenAddress, "1"],
      [1, balances[1].tokenAddress, "2"],
      [10, balances[2].tokenAddress, "3"],
    ]
  );
});

test("normalizes USDC quote with correct 6 decimals even when chain catalog has no tokens", () => {
  const quote = {
    id: "0x1234",
    provider: "nexus-v2",
    tradeType: "exact_in",
    input: [
      {
        chainId: 8453,
        tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        tokenSymbol: "USDC",
        amountRaw: 2_000_000n,
        amountUsd: "2.00",
        depositFeeRaw: 0n,
        depositFeeUsd: "0",
        totalRequiredRaw: 2_000_000n,
        totalRequiredUsd: "2.00",
      },
    ],
    output: {
      chainId: 42_161,
      tokenAddress: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
      amountRaw: 1_977_822n,
      amountUsd: "1.98",
      minAmountRaw: 1_970_000n,
      minAmountUsd: "1.97",
    },
    fees: {
      depositRaw: 0n,
      depositUsd: "0",
      fulfillmentRaw: 0n,
      fulfillmentUsd: "0",
      protocolRaw: 10_000n,
      protocolUsd: "0.01",
      solverRaw: 12_178n,
      solverUsd: "0.01",
    },
    expiresAt: 2_000_000_000,
    sourceVerdicts: [],
    allowances: [],
    plan: { steps: [] },
  } as any;

  // Chains passed without token catalog (as returned by getSupportedChains)
  const chains = [
    { id: 8453, name: "Base", logo: "", swapSupported: true, tokens: [] },
    { id: 42_161, name: "Arbitrum", logo: "", swapSupported: true, tokens: [] },
  ] as any;

  const normalized = normalizeIntentQuote(quote, chains);

  // Destination amount should format with 6 decimals (1.977822), NOT 18 decimals (0.000000000001977822)
  assert.equal(normalized.destination.amount, "1.977822");
  assert.equal(normalized.destination.minAmount, "1.97");
  assert.equal(normalized.destination.token.decimals, 6);
  assert.equal(normalized.destination.token.symbol, "USDC");

  // Source amount should format with 6 decimals (2)
  assert.equal(normalized.sources[0].amount, "2");
  assert.equal(normalized.sources[0].token.decimals, 6);
  assert.equal(normalized.sources[0].token.symbol, "USDC");

  // Fees should also format with 6 decimals
  assert.equal(normalized.feesAndBuffer.bridge.protocol, "0.01");
  assert.equal(normalized.feesAndBuffer.bridge.solver, "0.012178");
});

test("normalizes Arc USDC quote with 18 decimals", () => {
  const quote = {
    id: "0x5678",
    provider: "nexus-v2",
    tradeType: "exact_in",
    input: [
      {
        chainId: 8453,
        tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        tokenSymbol: "USDC",
        amountRaw: 2_000_000n,
        amountUsd: "2.00",
        depositFeeRaw: 0n,
        depositFeeUsd: "0",
        totalRequiredRaw: 2_000_000n,
        totalRequiredUsd: "2.00",
      },
    ],
    output: {
      chainId: 5042,
      tokenAddress: "0x0000000000000000000000000000000000000000",
      amountRaw: 1_980_000_000_000_000_000n,
      amountUsd: "1.98",
      minAmountRaw: 1_970_000_000_000_000_000n,
      minAmountUsd: "1.97",
    },
    fees: {
      depositRaw: 0n,
      depositUsd: "0",
      fulfillmentRaw: 0n,
      fulfillmentUsd: "0",
      protocolRaw: 0n,
      protocolUsd: "0",
      solverRaw: 0n,
      solverUsd: "0",
    },
    expiresAt: 2_000_000_000,
    sourceVerdicts: [],
    allowances: [],
    plan: { steps: [] },
  } as any;

  const chains = [
    { id: 8453, name: "Base", logo: "", swapSupported: true, tokens: [] },
    { id: 5042, name: "Arc", logo: "", swapSupported: true, tokens: [] },
  ] as any;

  const normalized = normalizeIntentQuote(quote, chains);
  assert.equal(normalized.destination.amount, "1.98");
  assert.equal(normalized.destination.token.decimals, 18);
  assert.equal(normalized.destination.token.symbol, "USDC");
});
