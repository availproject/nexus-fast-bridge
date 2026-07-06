import {
  CHAIN_METADATA,
  getShortChainName,
  TOKEN_IMAGES,
  TOKEN_METADATA,
} from "../../common/utils/constant";
import type { UserAsset } from "../../nexus/nexus-provider";
import { getCachedReceiveTokenMatch } from "../components/receive-asset-selector";
import type { SwapTokenOption } from "../components/swap-asset-selector";

export type TokenVisualIdentity = {
  chainId?: number;
  chainLogo?: string;
  chainName?: string;
  contractAddress?: string;
  decimals?: number;
  name?: string;
  symbol?: string;
  tokenLogo?: string;
};

export type TokenVisualSources = {
  balanceAssets?: UserAsset[] | null;
  tokens?: SwapTokenOption[] | null;
};

export type ResolvedTokenVisuals = {
  chainLogo?: string;
  chainName?: string;
  decimals?: number;
  name?: string;
  symbol?: string;
  tokenLogo?: string;
};

const NATIVE_ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const NATIVE_EVM_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

const normalizeAddressForLookup = (address?: string) => {
  if (!address) {
    return "";
  }
  const lower = address.toLowerCase();
  if (lower === NATIVE_EVM_ADDRESS || lower === NATIVE_ZERO_ADDRESS) {
    return NATIVE_ZERO_ADDRESS;
  }
  return lower;
};

const isNativeTokenAddress = (address?: string) =>
  normalizeAddressForLookup(address) === NATIVE_ZERO_ADDRESS;

const getTokenSymbolKey = (symbol?: string) =>
  symbol?.trim().toUpperCase() ?? "";

const flattenTokenOptions = (tokens?: SwapTokenOption[] | null) => {
  const flattened: SwapTokenOption[] = [];
  const visit = (token: SwapTokenOption) => {
    flattened.push(token);
    for (const sourceToken of token.sourceTokens ?? []) {
      visit(sourceToken);
    }
  };

  for (const token of tokens ?? []) {
    visit(token);
  }

  return flattened;
};

const matchesTokenIdentity = (
  candidate: {
    chainId?: number;
    contractAddress?: string;
    symbol?: string;
  },
  identity: TokenVisualIdentity
) => {
  if (identity.chainId && candidate.chainId !== identity.chainId) {
    return false;
  }

  const identityAddress = normalizeAddressForLookup(identity.contractAddress);
  const candidateAddress = normalizeAddressForLookup(candidate.contractAddress);
  if (
    identityAddress &&
    candidateAddress &&
    identityAddress === candidateAddress
  ) {
    return true;
  }

  if (identityAddress && candidateAddress) {
    return false;
  }

  const identitySymbol = getTokenSymbolKey(identity.symbol);
  const candidateSymbol = getTokenSymbolKey(candidate.symbol);
  return Boolean(identitySymbol && candidateSymbol === identitySymbol);
};

const getStaticTokenLogo = (symbol?: string) => {
  const symbolKey = getTokenSymbolKey(symbol);
  return (
    TOKEN_IMAGES[symbolKey] ??
    TOKEN_METADATA[symbolKey as keyof typeof TOKEN_METADATA]?.logo
  );
};

const getTokenFromSelectedOptions = (
  identity: TokenVisualIdentity,
  tokens?: SwapTokenOption[] | null
) =>
  flattenTokenOptions(tokens).find((token) =>
    matchesTokenIdentity(token, identity)
  );

const getTokenFromBalances = (
  identity: TokenVisualIdentity,
  balanceAssets?: UserAsset[] | null
): ResolvedTokenVisuals | null => {
  for (const asset of balanceAssets ?? []) {
    for (const breakdown of asset.breakdown ?? []) {
      const chainId = breakdown.chain?.id;
      const symbol = breakdown.symbol ?? asset.symbol;
      if (
        !matchesTokenIdentity(
          {
            chainId,
            contractAddress: breakdown.contractAddress,
            symbol,
          },
          identity
        )
      ) {
        continue;
      }

      const chainMeta = chainId ? CHAIN_METADATA[chainId] : undefined;
      return {
        chainLogo: chainMeta?.logo ?? breakdown.chain?.logo,
        chainName: getShortChainName(
          chainId,
          chainMeta?.name ?? breakdown.chain?.name
        ),
        decimals: breakdown.decimals ?? asset.decimals,
        name: symbol,
        symbol,
        tokenLogo: asset.logo ?? getStaticTokenLogo(symbol),
      };
    }
  }

  return null;
};

const getTokenFromLifiCache = (
  identity: TokenVisualIdentity
): ResolvedTokenVisuals | null => {
  if (!(identity.chainId && (identity.contractAddress || identity.symbol))) {
    return null;
  }

  const cachedToken = getCachedReceiveTokenMatch({
    balance: "0",
    balanceInFiat: "$0.00",
    chainId: identity.chainId,
    contractAddress: identity.contractAddress ?? NATIVE_ZERO_ADDRESS,
    decimals: identity.decimals ?? 18,
    name: identity.name ?? identity.symbol ?? "Token",
    symbol: identity.symbol ?? "Token",
  });

  if (!cachedToken) {
    return null;
  }

  return {
    chainLogo: cachedToken.chainLogo,
    chainName: cachedToken.chainName,
    decimals: cachedToken.decimals,
    name: cachedToken.name,
    symbol: cachedToken.symbol,
    tokenLogo: cachedToken.logo,
  };
};

export function resolveTokenVisuals(
  identity: TokenVisualIdentity,
  sources: TokenVisualSources = {}
): ResolvedTokenVisuals {
  const chainMeta = identity.chainId
    ? CHAIN_METADATA[identity.chainId]
    : undefined;
  const selectedToken = getTokenFromSelectedOptions(identity, sources.tokens);
  const balanceToken = getTokenFromBalances(identity, sources.balanceAssets);
  const lifiToken = getTokenFromLifiCache(identity);
  const staticTokenLogo = getStaticTokenLogo(
    identity.symbol ??
      selectedToken?.symbol ??
      balanceToken?.symbol ??
      lifiToken?.symbol
  );
  const nativeTokenLogo = isNativeTokenAddress(identity.contractAddress)
    ? chainMeta?.logo
    : undefined;

  return {
    chainLogo:
      identity.chainLogo ??
      selectedToken?.chainLogo ??
      balanceToken?.chainLogo ??
      lifiToken?.chainLogo ??
      chainMeta?.logo,
    chainName: getShortChainName(
      identity.chainId ?? selectedToken?.chainId,
      identity.chainName ??
        selectedToken?.chainName ??
        balanceToken?.chainName ??
        lifiToken?.chainName ??
        chainMeta?.name
    ),
    decimals:
      identity.decimals ??
      selectedToken?.decimals ??
      balanceToken?.decimals ??
      lifiToken?.decimals,
    name:
      identity.name ??
      selectedToken?.name ??
      balanceToken?.name ??
      lifiToken?.name,
    symbol:
      identity.symbol ??
      selectedToken?.symbol ??
      balanceToken?.symbol ??
      lifiToken?.symbol,
    tokenLogo:
      identity.tokenLogo ??
      selectedToken?.logo ??
      balanceToken?.tokenLogo ??
      lifiToken?.tokenLogo ??
      nativeTokenLogo ??
      staticTokenLogo,
  };
}
