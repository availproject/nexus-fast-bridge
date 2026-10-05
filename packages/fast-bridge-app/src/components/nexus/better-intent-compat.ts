import type {
  IntentAllowance,
  IntentBalance,
  IntentEvent,
  IntentHookData,
  IntentProvider,
  IntentQuote,
  IntentRouteConstraints,
  IntentSource,
  IntentStepError,
  IntentToken,
  NexusClient,
} from "@avail-project/nexus-core";
import { formatUnits } from "@avail-project/nexus-core/utils";
import Decimal from "decimal.js";
import {
  CHAIN_METADATA,
  SUPPORTED_CHAINS,
  TOKEN_CONTRACT_ADDRESSES,
  TOKEN_METADATA,
} from "../common/utils/constant.ts";

type SupportedChain = ReturnType<NexusClient["getSupportedChains"]>[number];
export type SupportedToken = IntentToken & {
  contractAddress: string;
};

export interface IntentAllowanceHookData {
  allow: () => Promise<void> | void;
  allowances: IntentAllowance[];
  deny: () => Promise<void> | void;
}

/** Providers the Better Intent middleware can name on a quote, status, or catalog entry. */
export const BETTER_INTENT_PROVIDERS: readonly IntentProvider[] = [
  "nexus-v2",
  "mayan",
  "relay",
];

/** Providers whose intents the Nexus Explorer does not index. */
const EXTERNAL_INTENT_PROVIDERS: readonly IntentProvider[] = ["mayan", "relay"];
const INTENT_ID_URL_PATTERN = /(?:^|\/)(0x[a-fA-F0-9]{64}|\d+)(?:\/)?$/;

export const isBetterIntentProvider = (
  value: unknown
): value is IntentProvider =>
  typeof value === "string" &&
  (BETTER_INTENT_PROVIDERS as readonly string[]).includes(value);

const INTENT_PROVIDER_LABELS: Record<IntentProvider, string> = {
  "nexus-v2": "Nexus",
  mayan: "Mayan",
  relay: "Relay",
};

/** Display name for the provider a quote was routed through, or undefined if it is not one. */
export const formatIntentProviderName = (value: unknown): string | undefined =>
  isBetterIntentProvider(value) ? INTENT_PROVIDER_LABELS[value] : undefined;

export const isExternalIntentProvider = (
  value: unknown
): value is IntentProvider =>
  typeof value === "string" &&
  (EXTERNAL_INTENT_PROVIDERS as readonly string[]).includes(value);

/** Extracts either a Better Intent hash or a legacy numeric ID from an explorer URL. */
export const extractIntentIdFromUrl = (url?: string | null) => {
  if (!url) {
    return undefined;
  }
  const match = url.match(INTENT_ID_URL_PATTERN);
  return match?.[1];
};

export type SupportedChainsAndTokensResult = Array<
  Omit<SupportedChain, "logo"> & {
    logo: string;
    swapSupported: boolean;
    tokens: SupportedToken[];
  }
>;

export interface ChainBalance {
  balance: string;
  chain: { id: number; logo: string; name: string };
  contractAddress: `0x${string}`;
  decimals: number;
  symbol: string;
  universe: "EVM";
  value: string;
  verified?: boolean;
}

export interface TokenBalance {
  balance: string;
  chainBalances: ChainBalance[];
  decimals: number;
  logo: string;
  name: string;
  symbol: string;
  value: string;
  verified?: boolean;
}

export interface LegacyIntent {
  bridgeProvider: string | null;
  destination: {
    amount: string;
    minAmount?: string;
    minAmountUsd?: string;
    value?: string;
    chain: { id: number; logo: string; name: string };
    token: {
      contractAddress: `0x${string}`;
      decimals: number;
      logo?: string;
      symbol: string;
    };
    gas: {
      amount: string;
      token: {
        contractAddress: `0x${string}`;
        decimals: number;
        symbol: string;
      };
    };
  };
  executionWarnings?: IntentQuote["executionWarnings"];
  feesAndBuffer: {
    buffer: string;
    bridge: {
      caGas: string;
      caGasUsd?: string;
      fulfillmentUsd?: string;
      protocol: string;
      protocolUsd?: string;
      solver: string;
      solverUsd?: string;
      total: string;
      totalUsd?: string;
    };
  };
  isExecutable?: boolean;
  sources: Array<{
    amount: string;
    /** Stable index assigned by the Better Intent quote and used by status legs. */
    sourceIndex: number;
    chain: { id: number; logo: string; name: string };
    token: {
      contractAddress: `0x${string}`;
      decimals: number;
      logo?: string;
      symbol: string;
    };
    value?: string;
  }>;
  /** Total source amount when every source uses the same token symbol. */
  sourcesTotal?: string;
}

export const addIntentUsdValues = (
  intent: LegacyIntent,
  getUsdRate: (symbol: string) => number
): LegacyIntent => {
  const destinationRate = getUsdRate(intent.destination.token.symbol);
  const destinationAmount = Number(intent.destination.amount);
  return {
    ...intent,
    destination: {
      ...intent.destination,
      value:
        intent.destination.value ??
        (destinationRate > 0 && Number.isFinite(destinationAmount)
          ? String(destinationAmount * destinationRate)
          : undefined),
    },
    // Better Intent fee fields are denominated in the destination token.
    // Keep them in that unit here so consumers can convert exactly once.
    feesAndBuffer: intent.feesAndBuffer,
    sources: intent.sources.map((source) => {
      const rate = getUsdRate(source.token.symbol);
      const amount = Number(source.amount);
      return {
        ...source,
        value:
          source.value ??
          (rate > 0 && Number.isFinite(amount)
            ? String(amount * rate)
            : undefined),
      };
    }),
  };
};

export interface LegacyIntentHookData {
  allow: () => void;
  deny: () => void;
  readonly execution?: IntentHookData["execution"];
  intent: LegacyIntent;
  readonly isExecutable?: boolean;
  refresh: (sources?: number[] | IntentSource[]) => Promise<LegacyIntent>;
}

export interface LegacyAllowanceHookData {
  allow: IntentAllowanceHookData["allow"];
  deny: () => void;
  sources: Array<{
    allowance: {
      current: string;
      currentRaw: bigint;
      minimum: string;
      minimumRaw: bigint;
    };
    chain: { id: number; logo: string; name: string };
    holderAddress: `0x${string}`;
    token: {
      contractAddress: `0x${string}`;
      decimals: number;
      logo?: string;
      symbol: string;
    };
  }>;
}

const sameAddress = (left: string, right: string) =>
  left.toLowerCase() === right.toLowerCase();

const normalizeBalanceTokenAddress = (address: string) => {
  const normalized = address.toLowerCase();
  return normalized === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
    ? "0x0000000000000000000000000000000000000000"
    : normalized;
};

const chainById = (chains: SupportedChainsAndTokensResult, chainId: number) =>
  chains.find((chain) => chain.id === chainId);

type ProviderEntry = IntentProvider | { id: IntentProvider };

const getProviderId = (provider: ProviderEntry): IntentProvider =>
  typeof provider === "string" ? provider : provider.id;

export type RawSupportedChainInput = SupportedChain & {
  swapSupported?: boolean;
  tokens?: IntentToken[];
};

export interface KnownTokenInfo {
  contractAddress: string;
  decimals: number;
  logo?: string;
  name: string;
  symbol: string;
}

export const getKnownTokenDecimals = (
  chainId?: number,
  symbol?: string,
  _contractAddress?: string
): number | undefined => {
  if (!chainId) {
    return undefined;
  }
  const s = symbol?.toUpperCase();

  // Arc native USDC is 18 decimals
  if (chainId === SUPPORTED_CHAINS.ARC && s === "USDC") {
    return 18;
  }
  // BNB Smart Chain: BEP-20 USDC, USDT, and native BNB are 18 decimals
  if (
    chainId === SUPPORTED_CHAINS.BNB &&
    (s === "USDC" || s === "USDT" || s === "BNB")
  ) {
    return 18;
  }
  // MegaETH USDM is 18 decimals; Mountain USDM on all chains is 18 decimals
  if (s === "USDM") {
    return 18;
  }
  return undefined;
};

export interface TokenLookupCandidate {
  address?: string;
  chain?: { id?: number };
  chainId?: number;
  contractAddress?: string;
  decimals?: number;
  logo?: string;
  logoURI?: string;
  name?: string;
  symbol?: string;
}

export interface NormalizeIntentQuoteOptions {
  balances?: Array<
    | TokenLookupCandidate
    | {
        chainBalances?: TokenLookupCandidate[];
        decimals?: number;
        logo?: string;
        name?: string;
        symbol?: string;
      }
  > | null;
  fromTokens?: TokenLookupCandidate[] | null;
  tokenResolver?: (
    chainId: number,
    address: string
  ) =>
    | {
        decimals?: number;
        logo?: string;
        name?: string;
        symbol?: string;
      }
    | null
    | undefined;
  toToken?: TokenLookupCandidate | null;
}

export const findKnownToken = (
  chainId: number | undefined,
  address: string | undefined
): KnownTokenInfo | undefined => {
  if (!(chainId && address)) {
    return undefined;
  }

  for (const [symbol, addressMap] of Object.entries(TOKEN_CONTRACT_ADDRESSES)) {
    const knownAddress = addressMap[chainId];
    if (knownAddress && sameAddress(knownAddress, address)) {
      const meta = TOKEN_METADATA[symbol as keyof typeof TOKEN_METADATA];
      const specialDecimals = getKnownTokenDecimals(
        chainId,
        symbol,
        knownAddress
      );
      const decimals = specialDecimals ?? meta?.decimals ?? 6;
      return {
        contractAddress: knownAddress,
        decimals,
        logo: meta?.logo,
        name: meta?.name ?? symbol,
        symbol,
      };
    }
  }

  if (
    sameAddress(address, "0x0000000000000000000000000000000000000000") ||
    sameAddress(address, "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")
  ) {
    const chainMeta = CHAIN_METADATA[chainId];
    if (chainMeta?.nativeCurrency) {
      return {
        contractAddress: address,
        decimals: chainMeta.nativeCurrency.decimals ?? 18,
        logo: chainMeta.logo,
        name: chainMeta.nativeCurrency.name ?? chainMeta.nativeCurrency.symbol,
        symbol: chainMeta.nativeCurrency.symbol,
      };
    }
  }

  return undefined;
};

const findFromTokenResolver = (
  chainId: number,
  address: string,
  options?: NormalizeIntentQuoteOptions
): KnownTokenInfo | undefined => {
  const resolved = options?.tokenResolver?.(chainId, address);
  if (resolved && typeof resolved.decimals === "number") {
    return {
      contractAddress: address,
      decimals: resolved.decimals,
      logo: resolved.logo,
      name: resolved.name ?? resolved.symbol ?? "",
      symbol: resolved.symbol ?? "",
    };
  }
  return undefined;
};

const isNativeAddress = (address: string): boolean =>
  sameAddress(address, "0x0000000000000000000000000000000000000000") ||
  sameAddress(address, "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");

const findFromSelectedToToken = (
  chainId: number,
  address: string,
  toToken?: TokenLookupCandidate | null
): KnownTokenInfo | undefined => {
  if (!toToken || toToken.chainId !== chainId) {
    return undefined;
  }
  const toAddress = toToken.contractAddress ?? toToken.address ?? "";
  const matchesAddress =
    sameAddress(toAddress, address) || (!toAddress && isNativeAddress(address));

  if (!matchesAddress) {
    return undefined;
  }

  const decimals =
    toToken.decimals ??
    getKnownTokenDecimals(chainId, toToken.symbol, address) ??
    18;

  return {
    contractAddress: toAddress || address,
    decimals,
    logo: toToken.logo ?? toToken.logoURI,
    name: toToken.name ?? toToken.symbol ?? "",
    symbol: toToken.symbol ?? "",
  };
};

const findFromSelectedFromTokens = (
  chainId: number,
  address: string,
  fromTokens?: TokenLookupCandidate[] | null
): KnownTokenInfo | undefined => {
  if (!fromTokens) {
    return undefined;
  }
  const match = fromTokens.find(
    (t) =>
      t.chainId === chainId &&
      sameAddress(t.contractAddress ?? t.address ?? "", address)
  );
  if (match && typeof match.decimals === "number") {
    return {
      contractAddress: match.contractAddress ?? match.address ?? address,
      decimals: match.decimals,
      logo: match.logo ?? match.logoURI,
      name: match.name ?? match.symbol ?? "",
      symbol: match.symbol ?? "",
    };
  }
  return undefined;
};

const findFromChainBalanceList = (
  chainId: number,
  address: string,
  asset: NonNullable<NormalizeIntentQuoteOptions["balances"]>[number]
): KnownTokenInfo | undefined => {
  if (!("chainBalances" in asset && Array.isArray(asset.chainBalances))) {
    return undefined;
  }
  const cbMatch = asset.chainBalances.find(
    (cb) =>
      cb.chain?.id === chainId &&
      sameAddress(cb.contractAddress ?? cb.address ?? "", address)
  );
  if (!cbMatch || typeof cbMatch.decimals !== "number") {
    return undefined;
  }
  return {
    contractAddress: cbMatch.contractAddress ?? cbMatch.address ?? address,
    decimals: cbMatch.decimals,
    logo: cbMatch.logo ?? cbMatch.logoURI ?? asset.logo,
    name: cbMatch.name ?? asset.name ?? cbMatch.symbol,
    symbol: cbMatch.symbol ?? asset.symbol ?? "",
  };
};

const findFromFlatBalance = (
  chainId: number,
  address: string,
  asset: NonNullable<NormalizeIntentQuoteOptions["balances"]>[number]
): KnownTokenInfo | undefined => {
  if (
    !("chainId" in asset) ||
    asset.chainId !== chainId ||
    !sameAddress(asset.contractAddress ?? asset.address ?? "", address) ||
    typeof asset.decimals !== "number"
  ) {
    return undefined;
  }
  return {
    contractAddress: address,
    decimals: asset.decimals,
    logo: asset.logo ?? asset.logoURI,
    name: asset.name ?? asset.symbol ?? "",
    symbol: asset.symbol ?? "",
  };
};

const findFromBalances = (
  chainId: number,
  address: string,
  balances?: NormalizeIntentQuoteOptions["balances"]
): KnownTokenInfo | undefined => {
  if (!balances) {
    return undefined;
  }
  for (const asset of balances) {
    const match =
      findFromChainBalanceList(chainId, address, asset) ??
      findFromFlatBalance(chainId, address, asset);
    if (match) {
      return match;
    }
  }
  return undefined;
};

const findFromSupportedChains = (
  chains: SupportedChainsAndTokensResult,
  chainId: number,
  address: string
): SupportedToken | undefined => {
  const chainMatch = chainById(chains, chainId)?.tokens?.find((token) =>
    sameAddress(token.contractAddress ?? token.address, address)
  );
  if (!chainMatch) {
    return undefined;
  }
  const specialDecimals = getKnownTokenDecimals(
    chainId,
    chainMatch.symbol,
    address
  );
  return {
    ...chainMatch,
    decimals: specialDecimals ?? chainMatch.decimals,
  };
};

export const tokenByAddress = (
  chains: SupportedChainsAndTokensResult,
  chainId: number,
  address: string,
  options?: NormalizeIntentQuoteOptions
): SupportedToken | KnownTokenInfo | undefined => {
  return (
    findFromTokenResolver(chainId, address, options) ??
    findFromSelectedToToken(chainId, address, options?.toToken) ??
    findFromSelectedFromTokens(chainId, address, options?.fromTokens) ??
    findFromBalances(chainId, address, options?.balances) ??
    findFromSupportedChains(chains, chainId, address) ??
    findKnownToken(chainId, address)
  );
};

export const populateChainsWithTokens = (
  chains: SupportedChainsAndTokensResult,
  tokens: IntentToken[] | null | undefined
): SupportedChainsAndTokensResult => {
  if (!tokens || tokens.length === 0) {
    return chains;
  }
  const tokensByChain = new Map<number, IntentToken[]>();
  for (const token of tokens) {
    const list = tokensByChain.get(token.chainId);
    if (list) {
      list.push(token);
    } else {
      tokensByChain.set(token.chainId, [token]);
    }
  }
  return chains.map((chain) => {
    const fetched = tokensByChain.get(chain.id);
    if (!fetched || fetched.length === 0) {
      return chain;
    }
    const existing = new Set(
      chain.tokens.map((t) => (t.contractAddress ?? t.address).toLowerCase())
    );
    const merged = [...chain.tokens];
    for (const token of fetched) {
      if (!existing.has(token.address.toLowerCase())) {
        merged.push({
          ...token,
          contractAddress: token.address,
        });
      }
    }
    return {
      ...chain,
      tokens: merged,
    };
  });
};

export const normalizeSupportedChains = (
  chains: RawSupportedChainInput[] | null | undefined
): SupportedChainsAndTokensResult =>
  (chains ?? []).map((chain) => ({
    ...chain,
    logo: chain.logo ?? "",
    swapSupported: chain.capabilities?.intent ?? chain.swapSupported ?? false,
    tokens:
      chain.tokens?.map((token) => ({
        ...token,
        contractAddress: token.address,
      })) ?? [],
  }));

export const isTokenSupportedForRole = (
  chains: SupportedChainsAndTokensResult | null | undefined,
  role: "source" | "destination",
  chainId: number | undefined,
  tokenAddress: string,
  providerHint?: readonly string[]
): boolean => {
  if (!chains || chainId === undefined) {
    return true;
  }
  const chain = chainById(chains, chainId);
  if (!chain) {
    return false;
  }

  const chainDirectional =
    role === "source" ? chain.asSource : chain.asDestination;
  const chainProviderIds = new Set(
    (chainDirectional ?? chain.providers ?? []).map(getProviderId)
  );
  const hintedProviderIds = new Set(
    (providerHint ?? []).filter((provider): provider is IntentProvider =>
      BETTER_INTENT_PROVIDERS.includes(provider as IntentProvider)
    )
  );

  const tokens = chain.tokens ?? [];
  const token = tokens.find((entry) =>
    sameAddress(entry.contractAddress ?? entry.address, tokenAddress)
  );

  if (!token) {
    if (hintedProviderIds.size > 0) {
      return Array.from(hintedProviderIds).some((provider) =>
        chainProviderIds.has(provider)
      );
    }
    if (tokens.length === 0) {
      return chainProviderIds.size > 0;
    }
    return false;
  }

  const tokenDirectional =
    role === "source" ? token.asSource : token.asDestination;
  const tokenProviderIds = (tokenDirectional ?? token.providers ?? []).map(
    getProviderId
  );

  // Route-constrained chain support comes from /chains, while token support
  // comes from the combined SDK catalog. A token is selectable only when the
  // same provider supports both the chain and token in the requested role.
  return (
    tokenProviderIds.length === 0 ||
    tokenProviderIds.some((provider) => chainProviderIds.has(provider))
  );
};

export type GetRouteSupportedChains = (
  constraints: IntentRouteConstraints
) => Promise<SupportedChainsAndTokensResult>;

export const normalizeIntentBalances = (
  balances: IntentBalance[],
  chains: SupportedChainsAndTokensResult
): TokenBalance[] => {
  const grouped = new Map<string, TokenBalance>();

  for (const entry of balances) {
    if (!entry.usable) {
      continue;
    }
    const readable = formatUnits(entry.balanceRaw, entry.decimals);
    const chain = chainById(chains, entry.chainId);
    const token = tokenByAddress(chains, entry.chainId, entry.tokenAddress);
    // Balances are token-specific. Symbol and decimals are display metadata
    // and are not sufficient to distinguish two contracts or two chains.
    const identity = `${entry.chainId}:${normalizeBalanceTokenAddress(entry.tokenAddress)}`;
    const tokenVerified =
      token && "verified" in token && typeof token.verified === "boolean"
        ? token.verified
        : true;
    const isEntryVerified = entry.verified !== false && tokenVerified;
    const chainBalance: ChainBalance = {
      balance: readable,
      value: String(entry.valueUsd ?? 0),
      symbol: entry.symbol,
      chain: {
        id: entry.chainId,
        logo: chain?.logo ?? "",
        name: chain?.name ?? `Chain ${entry.chainId}`,
      },
      contractAddress: entry.tokenAddress,
      decimals: entry.decimals,
      universe: "EVM",
      verified: isEntryVerified,
    };
    const existing = grouped.get(identity);
    if (existing) {
      existing.chainBalances.push(chainBalance);
      existing.balance = new Decimal(existing.balance)
        .plus(readable)
        .toString();
      existing.value = new Decimal(existing.value)
        .plus(entry.valueUsd ?? 0)
        .toString();
      if (existing.verified !== undefined) {
        existing.verified = existing.verified && isEntryVerified;
      }
      continue;
    }
    grouped.set(identity, {
      balance: readable,
      value: String(entry.valueUsd ?? 0),
      chainBalances: [chainBalance],
      decimals: entry.decimals,
      logo: token?.logo ?? entry.logo ?? "",
      name: entry.name,
      symbol: entry.symbol,
      verified: isEntryVerified,
    });
  }

  return [...grouped.values()];
};

export const normalizeIntentQuote = (
  quote: IntentQuote,
  chains: SupportedChainsAndTokensResult,
  options?: NormalizeIntentQuoteOptions
): LegacyIntent => {
  const outputChain = chainById(chains, quote.output.chainId);
  const outputToken = tokenByAddress(
    chains,
    quote.output.chainId,
    quote.output.tokenAddress,
    options
  );
  const inputSymbol = quote.input[0]?.tokenSymbol;
  const knownInputMeta = inputSymbol
    ? TOKEN_METADATA[inputSymbol as keyof typeof TOKEN_METADATA]
    : undefined;
  const isArcUsdcOutput =
    quote.output.chainId === SUPPORTED_CHAINS.ARC &&
    (outputToken?.symbol === "USDC" || inputSymbol === "USDC");
  const knownSpecialOutputDecimals = getKnownTokenDecimals(
    quote.output.chainId,
    outputToken?.symbol ?? (isArcUsdcOutput ? "USDC" : undefined),
    quote.output.tokenAddress
  );
  const outputDecimals =
    outputToken?.decimals ??
    knownSpecialOutputDecimals ??
    (isArcUsdcOutput ? 18 : undefined) ??
    (outputToken?.symbol && outputToken.symbol === inputSymbol
      ? knownInputMeta?.decimals
      : undefined) ??
    (outputToken?.symbol
      ? TOKEN_METADATA[outputToken.symbol as keyof typeof TOKEN_METADATA]
          ?.decimals
      : undefined) ??
    18;
  const sources = quote.input.map((entry, sourceIndex) => {
    const chain = chainById(chains, entry.chainId);
    const token = tokenByAddress(
      chains,
      entry.chainId,
      entry.tokenAddress,
      options
    );
    const knownMeta = entry.tokenSymbol
      ? TOKEN_METADATA[entry.tokenSymbol as keyof typeof TOKEN_METADATA]
      : undefined;
    const isArcUsdcSource =
      entry.chainId === SUPPORTED_CHAINS.ARC && entry.tokenSymbol === "USDC";
    const specialSourceDecimals = getKnownTokenDecimals(
      entry.chainId,
      entry.tokenSymbol ?? token?.symbol,
      entry.tokenAddress
    );
    const decimals =
      token?.decimals ??
      specialSourceDecimals ??
      (isArcUsdcSource ? 18 : knownMeta?.decimals) ??
      outputDecimals;
    return {
      amount: formatUnits(entry.amountRaw, decimals),
      value: entry.amountUsd,
      sourceIndex,
      chain: {
        id: entry.chainId,
        logo: chain?.logo ?? "",
        name: chain?.name ?? `Chain ${entry.chainId}`,
      },
      token: {
        contractAddress: entry.tokenAddress,
        decimals,
        logo: token?.logo ?? knownMeta?.logo,
        symbol: entry.tokenSymbol,
      },
    };
  });
  const sourceSymbols = new Set(
    quote.input.map((entry) => entry.tokenSymbol.trim().toUpperCase())
  );
  const sourcesTotal =
    sourceSymbols.size === 1
      ? quote.input
          .reduce(
            (total, entry, index) =>
              total.plus(
                formatUnits(
                  entry.totalRequiredRaw,
                  sources[index]?.token.decimals ?? outputDecimals
                )
              ),
            new Decimal(0)
          )
          .toString()
      : undefined;
  const displayedFeeTotalRaw =
    quote.fees.depositRaw + quote.fees.protocolRaw + quote.fees.solverRaw;
  const displayedFeeTotalUsd = new Decimal(quote.fees.depositUsd)
    .plus(quote.fees.protocolUsd)
    .plus(quote.fees.solverUsd)
    .toString();

  return {
    bridgeProvider: quote.provider,
    executionWarnings: quote.executionWarnings,
    isExecutable: quote.isExecutable,
    destination: {
      amount: formatUnits(quote.output.amountRaw, outputDecimals),
      minAmount: formatUnits(quote.output.minAmountRaw, outputDecimals),
      minAmountUsd: quote.output.minAmountUsd,
      value: quote.output.amountUsd,
      chain: {
        id: quote.output.chainId,
        logo: outputChain?.logo ?? "",
        name: outputChain?.name ?? `Chain ${quote.output.chainId}`,
      },
      token: {
        contractAddress: quote.output.tokenAddress,
        decimals: outputDecimals,
        logo: outputToken?.logo ?? knownInputMeta?.logo,
        symbol: outputToken?.symbol ?? inputSymbol ?? "",
      },
      gas: {
        amount: "0",
        token: {
          contractAddress: "0x0000000000000000000000000000000000000000",
          decimals:
            outputChain?.nativeCurrency?.decimals ??
            CHAIN_METADATA[quote.output.chainId]?.nativeCurrency?.decimals ??
            18,
          symbol:
            outputChain?.nativeCurrency?.symbol ??
            CHAIN_METADATA[quote.output.chainId]?.nativeCurrency?.symbol ??
            "",
        },
      },
    },
    feesAndBuffer: {
      buffer: "0",
      bridge: {
        // The legacy UI reads `caGas` as its network-fee slot. Better Intent's
        // source-side network fee is `depositRaw`; `caGasRaw` is not shown
        // separately because it can overlap other fee components.
        caGas: formatUnits(quote.fees.depositRaw, outputDecimals),
        caGasUsd: quote.fees.depositUsd,
        fulfillmentUsd: quote.fees.fulfillmentUsd,
        protocol: formatUnits(quote.fees.protocolRaw, outputDecimals),
        protocolUsd: quote.fees.protocolUsd,
        solver: formatUnits(quote.fees.solverRaw, outputDecimals),
        solverUsd: quote.fees.solverUsd,
        total: formatUnits(displayedFeeTotalRaw, outputDecimals),
        totalUsd: displayedFeeTotalUsd,
      },
    },
    sources,
    ...(sourcesTotal === undefined ? {} : { sourcesTotal }),
  };
};

const normalizeRefreshSources = (
  sources: number[] | IntentSource[] | undefined,
  quote: IntentQuote
): IntentSource[] | undefined => {
  if (!sources || sources.length === 0) {
    return undefined;
  }
  if (typeof sources[0] !== "number") {
    return sources as IntentSource[];
  }
  return (sources as number[]).flatMap((chainId) => {
    const input = quote.input.find((entry) => entry.chainId === chainId);
    return input ? [{ chainId, tokenAddress: input.tokenAddress }] : [];
  });
};

export const adaptIntentHook = (
  data: IntentHookData,
  chains: SupportedChainsAndTokensResult,
  options?: NormalizeIntentQuoteOptions
): LegacyIntentHookData => ({
  allow: data.allow,
  deny: data.deny,
  get execution() {
    return data.execution;
  },
  get isExecutable() {
    return data.quote?.isExecutable;
  },
  intent: normalizeIntentQuote(data.quote, chains, options),
  refresh: async (sources) =>
    normalizeIntentQuote(
      await data.refresh(normalizeRefreshSources(sources, data.quote)),
      chains,
      options
    ),
});

export const adaptAllowanceHook = (
  data: IntentAllowanceHookData,
  chains: SupportedChainsAndTokensResult,
  options?: NormalizeIntentQuoteOptions
): LegacyAllowanceHookData => ({
  allow: data.allow,
  deny: data.deny,
  sources: data.allowances.map((allowance) => {
    const chain = chainById(chains, allowance.chainId);
    const token = tokenByAddress(
      chains,
      allowance.chainId,
      allowance.tokenAddress,
      options
    );
    const decimals = token?.decimals ?? 18;
    return {
      allowance: {
        current: formatUnits(allowance.currentRaw, decimals),
        currentRaw: allowance.currentRaw,
        minimum: formatUnits(allowance.requiredRaw, decimals),
        minimumRaw: allowance.requiredRaw,
      },
      chain: {
        id: allowance.chainId,
        logo: chain?.logo ?? "",
        name: chain?.name ?? `Chain ${allowance.chainId}`,
      },
      holderAddress: allowance.owner,
      token: {
        contractAddress: allowance.tokenAddress,
        decimals,
        logo: token?.logo,
        symbol: token?.symbol ?? "",
      },
    };
  }),
});

export type LegacyPlanEvent =
  | { type: "plan_preview"; plan: { steps: IntentQuote["plan"]["steps"] } }
  | { type: "plan_confirmed"; plan: { steps: IntentQuote["plan"]["steps"] } }
  | {
      type: "plan_progress";
      stepType: string;
      state: string;
      step: IntentQuote["plan"]["steps"][number];
      committed?: boolean;
      error?: unknown;
      errorDetails?: IntentStepError;
    }
  | IntentEvent;

export const adaptIntentEvent = (event: IntentEvent): LegacyPlanEvent => {
  if (event.type === "quote") {
    return { type: "plan_preview", plan: event.quote.plan };
  }
  if (event.type === "step") {
    return {
      type: "plan_progress",
      stepType: event.step.type,
      state: event.state,
      step: event.step,
      committed: event.committed,
      error: event.errorDetails ?? event.error,
      errorDetails: event.errorDetails,
    };
  }
  return event;
};
