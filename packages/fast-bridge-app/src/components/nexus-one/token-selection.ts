import type { SwapTokenOption } from "./components/swap-asset-selector";

export interface TokenSelection {
  fromTokens: SwapTokenOption[];
  toToken?: SwapTokenOption;
}

/** Keep asset identity/balances, but never reuse amounts from a completed route. */
export function clearTokenInput(token: SwapTokenOption): SwapTokenOption {
  return {
    ...token,
    userAmount: "",
    userAmountMode: "token",
    userAmountUsd: undefined,
    selectedPct: null,
    sourceTokens: token.sourceTokens?.map(clearTokenInput),
  };
}

export function retainTokenSelection(
  selection: TokenSelection,
  isMultiAssetMode: boolean
): TokenSelection {
  return {
    fromTokens: isMultiAssetMode
      ? []
      : selection.fromTokens.slice(0, 1).map(clearTokenInput),
    toToken: selection.toToken ? clearTokenInput(selection.toToken) : undefined,
  };
}

export function reverseTokenSelection(
  selection: TokenSelection
): TokenSelection | undefined {
  const source = selection.fromTokens[0];
  const destination = selection.toToken;
  // An aggregate source has no single destination chain to reverse into.
  if (
    selection.fromTokens.length !== 1 ||
    !source?.chainId ||
    !destination?.chainId ||
    source.isUnified ||
    destination.isUnified
  ) {
    return undefined;
  }
  return {
    fromTokens: [clearTokenInput(destination)],
    toToken: clearTokenInput(source),
  };
}
