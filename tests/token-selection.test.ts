import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { isAmountAboveUsableBalance } from "../packages/fast-bridge-app/src/components/nexus/balance-utils";
import type { SwapTokenOption } from "../packages/fast-bridge-app/src/components/nexus-one/components/swap-asset-selector";
import { SwapIdleForm } from "../packages/fast-bridge-app/src/components/nexus-one/components/swap-idle-form";
import {
  isSameTokenOption,
  removeTokenFromSources,
  retainTokenSelection,
  reverseTokenSelection,
} from "../packages/fast-bridge-app/src/components/nexus-one/token-selection";

const source: SwapTokenOption = {
  chainId: 1,
  symbol: "ETH",
  name: "Ether",
  contractAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  decimals: 18,
  balance: "0.0233",
  totalBalance: "0.0251",
  balanceInFiat: "$58.25",
  totalBalanceInFiat: "$62.75",
  userAmount: "0.01",
  userAmountMode: "usd",
  userAmountUsd: "25",
  selectedPct: 50,
};
const destination: SwapTokenOption = {
  ...source,
  chainId: 8453,
  userAmount: "0.009",
};

test("Done preserves single-mode token identities while clearing every amount and percentage", () => {
  const selection = { fromTokens: [source], toToken: destination };
  const original = structuredClone(selection);
  const next = retainTokenSelection(selection, false);
  for (const [token, previous] of [
    [next.fromTokens[0], source],
    [next.toToken, destination],
  ]) {
    assert.ok(token);
    assert.equal(token.chainId, previous?.chainId);
    assert.equal(token.contractAddress, previous?.contractAddress);
    assert.equal(token.balance, previous?.balance);
    assert.equal(token.totalBalance, previous?.totalBalance);
    assert.equal(token.userAmount, "");
    assert.equal(token.userAmountUsd, undefined);
    assert.equal(token.userAmountMode, "token");
    assert.equal(token.selectedPct, null);
  }
  assert.deepEqual(selection, original);
});

test("Done in multi mode clears all sources and keeps only the destination selection", () => {
  const next = retainTokenSelection(
    { fromTokens: [source, destination], toToken: destination },
    true
  );
  assert.deepEqual(next.fromTokens, []);
  assert.equal(next.toToken?.chainId, destination.chainId);
  assert.equal(next.toToken?.userAmount, "");
});

test("retained unified selections also clear their underlying source amounts", () => {
  const next = retainTokenSelection(
    {
      fromTokens: [{ ...source, isUnified: true, sourceTokens: [source] }],
      toToken: destination,
    },
    false
  );
  assert.equal(next.fromTokens[0].sourceTokens?.[0].userAmount, "");
  assert.equal(next.fromTokens[0].sourceTokens?.[0].selectedPct, null);
});

test("direction reversal retains the source input and unit while clearing stale quote values", () => {
  const reversed = reverseTokenSelection({
    fromTokens: [source],
    toToken: destination,
  });
  assert.ok(reversed);
  assert.equal(reversed.fromTokens[0].chainId, destination.chainId);
  assert.equal(reversed.toToken?.chainId, source.chainId);
  assert.equal(reversed.fromTokens[0].userAmount, source.userAmount);
  assert.equal(reversed.fromTokens[0].userAmountMode, "usd");
  assert.equal(reversed.fromTokens[0].userAmountUsd, undefined);
  assert.equal(reversed.fromTokens[0].selectedPct, null);
  assert.equal(reversed.toToken?.userAmount, "");
  assert.equal(reversed.toToken?.selectedPct, null);
  assert.equal(source.userAmount, "0.01");
});

test("reversing twice retains the literal source amount without restoring a percentage or quote", () => {
  const enteredSource = {
    ...source,
    userAmount: "0.0100",
    userAmountMode: "token" as const,
  };
  const first = reverseTokenSelection({
    fromTokens: [enteredSource],
    toToken: destination,
  });
  assert.ok(first);
  const second = reverseTokenSelection(first);
  assert.ok(second);
  assert.equal(second.fromTokens[0].chainId, source.chainId);
  assert.equal(second.fromTokens[0].userAmount, "0.0100");
  assert.equal(second.fromTokens[0].userAmountMode, "token");
  assert.equal(second.fromTokens[0].selectedPct, null);
  assert.equal(second.fromTokens[0].userAmountUsd, undefined);
});

test("reversal preserves an amount above the new usable balance for normal validation", () => {
  const reversed = reverseTokenSelection({
    fromTokens: [{ ...source, userAmount: "0.02", userAmountMode: "token" }],
    toToken: { ...destination, balance: "0.01", totalBalance: "0.03" },
  });
  assert.ok(reversed);
  const nextSource = reversed.fromTokens[0];
  assert.equal(nextSource.userAmount, "0.02");
  assert.equal(
    isAmountAboveUsableBalance(nextSource, nextSource.userAmount ?? ""),
    true
  );
});

test("reversal with an empty source input does not reuse a destination amount", () => {
  const reversed = reverseTokenSelection({
    fromTokens: [{ ...source, userAmount: "" }],
    toToken: destination,
  });
  assert.ok(reversed);
  assert.equal(reversed.fromTokens[0].userAmount, "");
  assert.equal(reversed.toToken?.userAmount, "");
});

test("direction reversal works with only 1 asset selected on either side", () => {
  // Only source selected -> moves to destination
  const reversedFromSource = reverseTokenSelection({
    fromTokens: [source],
    toToken: undefined,
  });
  assert.ok(reversedFromSource);
  assert.equal(reversedFromSource.fromTokens.length, 0);
  assert.equal(reversedFromSource.toToken?.chainId, source.chainId);
  assert.equal(reversedFromSource.toToken?.userAmount, "");

  // Only destination selected -> moves to source
  const reversedFromDest = reverseTokenSelection({
    fromTokens: [],
    toToken: destination,
  });
  assert.ok(reversedFromDest);
  assert.equal(reversedFromDest.fromTokens.length, 1);
  assert.equal(reversedFromDest.fromTokens[0].chainId, destination.chainId);
  assert.equal(reversedFromDest.fromTokens[0].userAmount, "");
  assert.equal(reversedFromDest.toToken, undefined);
});

test("empty, multi-source and unified routes cannot be reversed", () => {
  for (const selection of [
    { fromTokens: [] },
    { fromTokens: [source, destination], toToken: destination },
    { fromTokens: [{ ...source, isUnified: true }], toToken: destination },
    { fromTokens: [{ ...source, isUnified: true }] },
    { fromTokens: [], toToken: { ...destination, isUnified: true } },
    { fromTokens: [{ ...source, chainId: undefined as any }] },
    { fromTokens: [], toToken: { ...destination, chainId: undefined as any } },
  ]) {
    assert.equal(reverseTokenSelection(selection), undefined);
  }
});

test("the form exposes an accessible direction button only in single mode", () => {
  const props = {
    amount: "",
    fromTokens: [],
    swapType: "exactIn" as const,
    totalBalance: "0",
    usdValue: "0",
    onAmountChange: () => undefined,
    onOpenDestPicker: () => undefined,
    onOpenSourcePicker: () => undefined,
    onReverseTokens: () => undefined,
  };
  const single = renderToStaticMarkup(createElement(SwapIdleForm, props));
  const multi = renderToStaticMarkup(
    createElement(SwapIdleForm, { ...props, isMultiAssetMode: true })
  );
  assert.ok(single.includes('aria-label="Swap source and destination tokens"'));
  assert.ok(single.includes('disabled=""'));
  assert.ok(!multi.includes('aria-label="Swap source and destination tokens"'));
});

test("selecting source token on destination deselects it from source in single mode", () => {
  const result = removeTokenFromSources([source], source, true);
  assert.equal(result.removed, true);
  assert.deepEqual(result.sources, []);
});

test("selecting source token on destination deselects it from source in multi mode", () => {
  const tokenB: SwapTokenOption = {
    ...source,
    chainId: 10,
    symbol: "OP",
  };
  const result = removeTokenFromSources([source, tokenB], source, false);
  assert.equal(result.removed, true);
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].chainId, 10);
});

test("native token addresses match across empty, 0x000, and 0xeee representations", () => {
  const nativeEmpty: SwapTokenOption = {
    chainId: 42_161,
    symbol: "ETH",
    contractAddress: "",
  };
  const nativeZero: SwapTokenOption = {
    chainId: 42_161,
    symbol: "ETH",
    contractAddress: "0x0000000000000000000000000000000000000000",
  };
  const nativeEee: SwapTokenOption = {
    chainId: 42_161,
    symbol: "ETH",
    contractAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  };

  assert.equal(isSameTokenOption(nativeEmpty, nativeZero), true);
  assert.equal(isSameTokenOption(nativeEmpty, nativeEee), true);
  assert.equal(isSameTokenOption(nativeZero, nativeEee), true);

  const result = removeTokenFromSources([nativeEmpty], nativeEee, true);
  assert.equal(result.removed, true);
  assert.deepEqual(result.sources, []);
});

test("selecting matching asset deselects unified source token", () => {
  const unifiedUsdc: SwapTokenOption = {
    symbol: "USDC",
    isUnified: true,
    unifiedSymbol: "USDC",
    sourceTokens: [
      {
        chainId: 42_161,
        symbol: "USDC",
        contractAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      },
      {
        chainId: 10,
        symbol: "USDC",
        contractAddress: "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
      },
    ],
  };
  const destArbUsdc: SwapTokenOption = {
    chainId: 42_161,
    symbol: "USDC",
    contractAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  };

  // Single mode deselects unified asset entirely
  const singleResult = removeTokenFromSources([unifiedUsdc], destArbUsdc, true);
  assert.equal(singleResult.removed, true);
  assert.deepEqual(singleResult.sources, []);

  // Multi mode removes matched token from unified sourceTokens
  const multiResult = removeTokenFromSources([unifiedUsdc], destArbUsdc, false);
  assert.equal(multiResult.removed, true);
  assert.equal(multiResult.sources.length, 1);
  assert.equal(multiResult.sources[0].sourceTokens?.length, 1);
  assert.equal(multiResult.sources[0].sourceTokens?.[0].chainId, 10);
});
