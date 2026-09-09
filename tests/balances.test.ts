import assert from "node:assert/strict";
import { test } from "node:test";
import type { ChainBalance, TokenBalance } from "@avail-project/nexus-core";
import {
  getTotalBalance,
  isAmountAboveUsableBalance,
  normalizeUserAssets,
  sumTokenOptionBalances,
  toTokenOptionBalances,
} from "../packages/fast-bridge-app/src/components/nexus/balance-utils";
import {
  deriveTokenOptions,
  formatSelectedTokenBalanceLabel,
} from "../packages/fast-bridge-app/src/components/nexus-one/components/swap-asset-selector";
import {
  retainTokenSelection,
  reverseTokenSelection,
} from "../packages/fast-bridge-app/src/components/nexus-one/token-selection";

function chain(overrides: Partial<ChainBalance> = {}): ChainBalance {
  return {
    balance: "999", // Deliberately stale: consumers must prefer the explicit fields.
    totalBalance: "0.0251",
    usableBalance: "0.0233",
    value: "58.25",
    symbol: "ETH",
    chain: { id: 1, name: "Ethereum", logo: "" },
    contractAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    decimals: 18,
    universe: 0,
    ...overrides,
  };
}
function asset(sources: ChainBalance[]): TokenBalance {
  return {
    balance: "999",
    totalBalance: "999",
    usableBalance: "999",
    value: "999",
    symbol: "ETH",
    name: "Ether",
    decimals: 18,
    logo: "",
    chainBalances: sources,
  };
}
function normalize(sources: ChainBalance[]) {
  return (normalizeUserAssets([asset(sources)]) ?? [])[0];
}

test("native wallet totals are displayed while usable funds govern input limits", () => {
  const normalized = normalize([chain()]);
  const [token] = deriveTokenOptions([normalized]);
  assert.equal(token.balance, "0.0233");
  assert.equal(token.totalBalance, "0.0251");
  assert.equal(token.balanceInFiat, "$58.25");
  assert.equal(token.totalBalanceInFiat, "$62.75");
  assert.equal(formatSelectedTokenBalanceLabel(token), "0.0251 ETH");
  assert.equal(isAmountAboveUsableBalance(token, "0.0251"), true);
  assert.equal(isAmountAboveUsableBalance(token, "0.023300000000000001"), true);
  assert.equal(isAmountAboveUsableBalance(token, "0.0233"), false);
  assert.equal(isAmountAboveUsableBalance(token, "58.26", "usd"), true);
  assert.equal(isAmountAboveUsableBalance(token, "58.25", "usd"), false);
});

test("zero usable balance is preserved and the wallet holding remains visible", () => {
  const normalizedAssets = normalizeUserAssets(
    [asset([chain({ usableBalance: "0", value: "0" })])],
    () => 2500
  );
  assert.ok(normalizedAssets);
  const [normalized] = normalizedAssets;
  const [token] = deriveTokenOptions([normalized]);
  assert.ok(token);
  assert.equal(token.balance, "0");
  assert.equal(token.balanceInFiat, "$0");
  assert.equal(formatSelectedTokenBalanceLabel(token), "0.0251 ETH");
  assert.equal(token.totalBalanceInFiat, "$62.75");
  assert.equal(isAmountAboveUsableBalance(token, "0.000000000000000001"), true);
});

test("bridge and ERC20 balances with no reserve display and spend the same amount", () => {
  const token = toTokenOptionBalances(
    normalize([
      chain({
        balance: "999",
        totalBalance: "100.123456",
        usableBalance: "100.123456",
        value: "100.12",
        symbol: "USDC",
        decimals: 6,
      }),
    ]).breakdown[0]
  );
  assert.equal(token.balance, token.totalBalance);
  assert.equal(isAmountAboveUsableBalance(token, "100.123456"), false);
  assert.equal(isAmountAboveUsableBalance(token, "100.123457"), true);
});

test("unsupported source removal recomputes both totals without leaking stale SDK aggregates", () => {
  const supported = chain();
  const unsupported = chain({
    chain: { id: 99_999, name: "Unsupported", logo: "" },
    totalBalance: "100",
    usableBalance: "90",
    value: "225000",
  });
  const normalizedAssets = normalizeUserAssets(
    [asset([supported, unsupported])],
    undefined,
    (source) => source.chain.id === 1
  );
  assert.ok(normalizedAssets);
  const [normalized] = normalizedAssets;
  assert.equal(normalized.totalBalance, "0.0251");
  assert.equal(normalized.usableBalance, "0.0233");
  assert.equal(normalized.totalBalanceInFiat, 62.75);
  assert.equal(normalized.balanceInFiat, 58.25);
  assert.deepEqual(normalized.chainBalances, normalized.breakdown);
});

test("unified tokens sum wallet holdings and spending balances independently at full precision", () => {
  const normalized = normalize([
    chain({
      usableBalance: "0.000000000000000001",
      totalBalance: "0.000000000000000003",
      value: "0",
    }),
    chain({
      chain: { id: 8453, name: "Base", logo: "" },
      usableBalance: "0.023300000000000001",
      totalBalance: "0.025100000000000001",
    }),
  ]);
  const tokens = deriveTokenOptions([normalized]);
  const unified = sumTokenOptionBalances(tokens);
  assert.equal(unified.balance, "0.023300000000000002");
  assert.equal(unified.totalBalance, "0.025100000000000004");
  assert.equal(isAmountAboveUsableBalance(unified, unified.totalBalance), true);
  assert.equal(isAmountAboveUsableBalance(unified, unified.balance), false);
});

test("refresh normalization is idempotent and never mutates an SDK response", () => {
  const original = asset([chain()]);
  const snapshot = structuredClone(original);
  const normalized = normalizeUserAssets([original]);
  assert.deepEqual(normalizeUserAssets(normalized), normalized);
  assert.deepEqual(original, snapshot);
});

test("old cached balance-only data remains readable", () => {
  const legacy = chain();
  Reflect.deleteProperty(legacy, "totalBalance");
  Reflect.deleteProperty(legacy, "usableBalance");
  legacy.balance = "0.0233";
  const [token] = deriveTokenOptions([normalize([legacy])]);
  assert.equal(token.balance, "0.0233");
  assert.equal(token.totalBalance, "0.0233");
});

test("formatted compatibility balances do not lose ETH amounts during aggregation", () => {
  assert.equal(
    sumTokenOptionBalances([
      { balance: "1.25 ETH", balanceInFiat: "$3,125.00" },
    ]).balance,
    "1.25"
  );
});

test("reserved-only assets without a price keep their token total and do not become spendable", () => {
  const normalized = normalize([chain({ usableBalance: "0", value: "0" })]);
  assert.equal(normalized.totalBalance, "0.0251");
  assert.equal(normalized.usableBalance, "0");
  assert.equal(Number.isFinite(normalized.totalBalanceInFiat), true);
  assert.equal(isAmountAboveUsableBalance(normalized, "0.0001"), true);
});

test("Done clears amounts and reverse retains the source amount while preserving both balances", () => {
  const tokens = deriveTokenOptions([
    normalize([
      chain(),
      chain({
        chain: { id: 8453, name: "Base", logo: "" },
        totalBalance: "0.1",
        usableBalance: "0.09",
        value: "225",
      }),
    ]),
  ]);
  const selection = {
    fromTokens: [{ ...tokens[0], userAmount: "0.01" }],
    toToken: tokens[1],
  };
  const retained = retainTokenSelection(selection, false);
  assert.equal(getTotalBalance(retained.fromTokens[0]), "0.0251");
  assert.equal(retained.fromTokens[0].balance, "0.0233");
  assert.equal(retained.fromTokens[0].userAmount, "");
  assert.deepEqual(retainTokenSelection(selection, true).fromTokens, []);
  const reversed = reverseTokenSelection(selection);
  assert.ok(reversed);
  assert.equal(reversed.fromTokens[0].totalBalance, "0.1");
  assert.equal(reversed.fromTokens[0].balance, "0.09");
  assert.equal(reversed.fromTokens[0].userAmount, "0.01");
});
