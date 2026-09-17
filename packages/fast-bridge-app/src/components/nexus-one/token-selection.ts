import type { SwapTokenOption } from "./components/swap-asset-selector";

export interface TokenSelection {
  fromTokens: SwapTokenOption[];
  toToken?: SwapTokenOption;
}

export function isNativeAddress(address?: string | null): boolean {
  const normalized = (address ?? "").toLowerCase();
  return (
    !normalized ||
    normalized === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
    normalized === "0x0000000000000000000000000000000000000000"
  );
}

function getTokenKey(token?: SwapTokenOption | null): string {
  if (!token) {
    return "";
  }
  if (token.isUnified) {
    return `unified:${(token.unifiedSymbol ?? token.symbol ?? "").toLowerCase()}`;
  }
  const address = isNativeAddress(token.contractAddress)
    ? "native"
    : (token.contractAddress ?? "").toLowerCase();
  return `${token.chainId ?? "unknown"}:${address}`;
}

export function isSameTokenOption(
  a?: SwapTokenOption | null,
  b?: SwapTokenOption | null
): boolean {
  if (!(a && b)) {
    return false;
  }
  const keyA = getTokenKey(a);
  const keyB = getTokenKey(b);
  if (keyA && keyB && keyA === keyB) {
    return true;
  }

  if (a.chainId && b.chainId && a.chainId === b.chainId) {
    if (
      isNativeAddress(a.contractAddress) &&
      isNativeAddress(b.contractAddress)
    ) {
      return true;
    }
    const addrA = (a.contractAddress ?? "").toLowerCase();
    const addrB = (b.contractAddress ?? "").toLowerCase();
    if (
      addrA &&
      addrB &&
      (addrA === addrB || addrA.slice(-40) === addrB.slice(-40))
    ) {
      return true;
    }
    if (
      a.symbol &&
      b.symbol &&
      a.symbol.trim().toUpperCase() === b.symbol.trim().toUpperCase()
    ) {
      return true;
    }
  }

  // Unified checks
  if (a.isUnified || b.isUnified) {
    const symA = (a.unifiedSymbol ?? a.symbol ?? "").trim().toUpperCase();
    const symB = (b.unifiedSymbol ?? b.symbol ?? "").trim().toUpperCase();
    if (symA && symB && symA === symB) {
      return true;
    }
    if (a.sourceTokens?.some((child) => isSameTokenOption(child, b))) {
      return true;
    }
    if (b.sourceTokens?.some((child) => isSameTokenOption(a, child))) {
      return true;
    }
  }

  return false;
}

export function removeTokenFromSources(
  sources: SwapTokenOption[],
  token: SwapTokenOption,
  isSingleMode = false
): { removed: boolean; sources: SwapTokenOption[] } {
  if (!sources || sources.length === 0) {
    return { removed: false, sources: [] };
  }

  // Single mode: if the source matches, deselect it completely
  if (
    isSingleMode &&
    sources.length > 0 &&
    isSameTokenOption(sources[0], token)
  ) {
    return { removed: true, sources: [] };
  }

  let removed = false;
  const remainingSources: SwapTokenOption[] = [];

  for (const source of sources) {
    if (source.isUnified && source.sourceTokens?.length) {
      const remainingTokens = source.sourceTokens.filter(
        (child) => !isSameTokenOption(child, token)
      );
      if (remainingTokens.length === source.sourceTokens.length) {
        if (isSameTokenOption(source, token)) {
          removed = true;
          continue;
        }
        remainingSources.push(source);
        continue;
      }

      removed = true;
      if (remainingTokens.length > 0) {
        remainingSources.push({
          ...source,
          sourceTokens: remainingTokens,
        });
      }
      continue;
    }

    if (isSameTokenOption(source, token)) {
      removed = true;
    } else {
      remainingSources.push(source);
    }
  }

  return {
    removed,
    sources: removed ? remainingSources : sources,
  };
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
