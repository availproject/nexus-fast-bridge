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

  // Cannot reverse multi-source selections
  if (selection.fromTokens.length > 1) {
    return undefined;
  }

  // Cannot reverse if both sides are empty
  if (!(source || destination)) {
    return undefined;
  }

  // An aggregate source has no single destination chain to reverse into.
  if (source?.isUnified || destination?.isUnified) {
    return undefined;
  }

  // Both source and destination exist
  if (source && destination) {
    if (!(source.chainId && destination.chainId)) {
      return undefined;
    }
    return {
      fromTokens: [
        {
          ...clearTokenInput(destination),
          // The input stays in the source panel; its quote and percentage do not.
          userAmount: source.userAmount ?? "",
          userAmountMode: source.userAmountMode ?? "token",
        },
      ],
      toToken: clearTokenInput(source),
    };
  }

  // Only source is selected -> moves to destination
  if (source && !destination) {
    if (!source.chainId) {
      return undefined;
    }
    return {
      fromTokens: [],
      toToken: clearTokenInput(source),
    };
  }

  // Only destination is selected -> moves to source
  if (!source && destination) {
    if (!destination.chainId) {
      return undefined;
    }
    return {
      fromTokens: [clearTokenInput(destination)],
      toToken: undefined,
    };
  }

  return undefined;
}
