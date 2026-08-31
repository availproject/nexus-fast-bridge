import type {
  IntentAllowanceHookData,
  IntentBalance,
  IntentEvent,
  IntentHookData,
  IntentQuote,
  IntentRouteConstraints,
  IntentSource,
  NexusClient,
} from "@avail-project/nexus-core";
import { formatUnits } from "@avail-project/nexus-core/utils";

type SupportedChain = ReturnType<NexusClient["getSupportedChains"]>[number];
type SupportedToken = SupportedChain["tokens"][number] & {
  contractAddress: `0x${string}`;
};

export type SupportedChainsAndTokensResult = Array<
  Omit<SupportedChain, "logo" | "tokens"> & {
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
}

export interface TokenBalance {
  balance: string;
  chainBalances: ChainBalance[];
  decimals: number;
  logo: string;
  name: string;
  symbol: string;
  value: string;
}

export interface LegacyIntent {
  bridgeProvider: string | null;
  destination: {
    amount: string;
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
  feesAndBuffer: {
    buffer: string;
    bridge: {
      caGas: string;
      protocol: string;
      solver: string;
      total: string;
    };
  };
  sources: Array<{
    amount: string;
    chain: { id: number; logo: string; name: string };
    token: {
      contractAddress: `0x${string}`;
      decimals: number;
      logo?: string;
      symbol: string;
    };
    value?: string;
  }>;
  sourcesTotal: string;
}

export const addIntentUsdValues = (
  intent: LegacyIntent,
  getUsdRate: (symbol: string) => number
): LegacyIntent => {
  const destinationRate = getUsdRate(intent.destination.token.symbol);
  const destinationAmount = Number(intent.destination.amount);
  const feeAmountToUsd = (value: string) => {
    const amount = Number(value);
    return destinationRate > 0 && Number.isFinite(amount)
      ? String(amount * destinationRate)
      : value;
  };
  return {
    ...intent,
    destination: {
      ...intent.destination,
      value:
        destinationRate > 0 && Number.isFinite(destinationAmount)
          ? String(destinationAmount * destinationRate)
          : intent.destination.value,
    },
    feesAndBuffer: {
      ...intent.feesAndBuffer,
      bridge: {
        ...intent.feesAndBuffer.bridge,
        caGas: feeAmountToUsd(intent.feesAndBuffer.bridge.caGas),
        protocol: feeAmountToUsd(intent.feesAndBuffer.bridge.protocol),
        solver: feeAmountToUsd(intent.feesAndBuffer.bridge.solver),
        total: feeAmountToUsd(intent.feesAndBuffer.bridge.total),
      },
    },
    sources: intent.sources.map((source) => {
      const rate = getUsdRate(source.token.symbol);
      const amount = Number(source.amount);
      return {
        ...source,
        value:
          rate > 0 && Number.isFinite(amount)
            ? String(amount * rate)
            : source.value,
      };
    }),
  };
};

export interface LegacyIntentHookData {
  allow: () => void;
  deny: () => void;
  intent: LegacyIntent;
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

const chainById = (chains: SupportedChainsAndTokensResult, chainId: number) =>
  chains.find((chain) => chain.id === chainId);

const tokenByAddress = (
  chains: SupportedChainsAndTokensResult,
  chainId: number,
  address: string
) =>
  chainById(chains, chainId)?.tokens.find((token) =>
    sameAddress(token.address, address)
  );

export const normalizeSupportedChains = (
  chains: ReturnType<NexusClient["getSupportedChains"]>
): SupportedChainsAndTokensResult =>
  chains.map((chain) => ({
    ...chain,
    logo: chain.logo ?? "",
    swapSupported: chain.capabilities.intent,
    tokens: chain.tokens.map((token) => ({
      ...token,
      contractAddress: token.address,
    })),
  }));

export const isTokenSupportedForRole = (
  chains: SupportedChainsAndTokensResult | null | undefined,
  role: "source" | "destination",
  chainId: number | undefined,
  tokenAddress: string
): boolean => {
  if (!chains || chainId === undefined) {
    return true;
  }
  const token = tokenByAddress(chains, chainId, tokenAddress);
  if (!token) {
    return false;
  }
  const directional = role === "source" ? token.asSource : token.asDestination;
  return (directional ?? token.providers).length > 0;
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
    const identity = `${entry.symbol.toUpperCase()}:${entry.decimals}`;
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
    };
    const existing = grouped.get(identity);
    if (existing) {
      existing.chainBalances.push(chainBalance);
      existing.balance = String(Number(existing.balance) + Number(readable));
      existing.value = String(
        Number(existing.value) + Number(entry.valueUsd ?? 0)
      );
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
    });
  }

  return [...grouped.values()];
};

export const normalizeIntentQuote = (
  quote: IntentQuote,
  chains: SupportedChainsAndTokensResult
): LegacyIntent => {
  const outputChain = chainById(chains, quote.output.chainId);
  const outputToken = tokenByAddress(
    chains,
    quote.output.chainId,
    quote.output.tokenAddress
  );
  const outputDecimals = outputToken?.decimals ?? 18;
  const sources = quote.input.map((entry) => {
    const chain = chainById(chains, entry.chainId);
    const token = tokenByAddress(chains, entry.chainId, entry.tokenAddress);
    const decimals = token?.decimals ?? outputDecimals;
    return {
      amount: formatUnits(entry.amountRaw, decimals),
      chain: {
        id: entry.chainId,
        logo: chain?.logo ?? "",
        name: chain?.name ?? `Chain ${entry.chainId}`,
      },
      token: {
        contractAddress: entry.tokenAddress,
        decimals,
        logo: token?.logo,
        symbol: entry.tokenSymbol,
      },
    };
  });
  const sourceTotalRaw = quote.input.reduce(
    (total, entry) => total + entry.totalRequiredRaw,
    0n
  );
  const displayedFeeTotalRaw =
    quote.fees.depositRaw + quote.fees.protocolRaw + quote.fees.solverRaw;

  return {
    bridgeProvider: quote.provider,
    destination: {
      amount: formatUnits(quote.output.amountRaw, outputDecimals),
      chain: {
        id: quote.output.chainId,
        logo: outputChain?.logo ?? "",
        name: outputChain?.name ?? `Chain ${quote.output.chainId}`,
      },
      token: {
        contractAddress: quote.output.tokenAddress,
        decimals: outputDecimals,
        logo: outputToken?.logo,
        symbol: outputToken?.symbol ?? "",
      },
      gas: {
        amount: "0",
        token: {
          contractAddress: "0x0000000000000000000000000000000000000000",
          decimals: outputChain?.nativeCurrency.decimals ?? 18,
          symbol: outputChain?.nativeCurrency.symbol ?? "",
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
        protocol: formatUnits(quote.fees.protocolRaw, outputDecimals),
        solver: formatUnits(quote.fees.solverRaw, outputDecimals),
        total: formatUnits(displayedFeeTotalRaw, outputDecimals),
      },
    },
    sources,
    sourcesTotal: formatUnits(
      sourceTotalRaw,
      sources[0]?.token.decimals ?? outputDecimals
    ),
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
  chains: SupportedChainsAndTokensResult
): LegacyIntentHookData => ({
  allow: data.allow,
  deny: data.deny,
  intent: normalizeIntentQuote(data.quote, chains),
  refresh: async (sources) =>
    normalizeIntentQuote(
      await data.refresh(normalizeRefreshSources(sources, data.quote)),
      chains
    ),
});

export const adaptAllowanceHook = (
  data: IntentAllowanceHookData,
  chains: SupportedChainsAndTokensResult
): LegacyAllowanceHookData => ({
  allow: data.allow,
  deny: data.deny,
  sources: data.allowances.map((allowance) => {
    const chain = chainById(chains, allowance.chainId);
    const token = tokenByAddress(
      chains,
      allowance.chainId,
      allowance.tokenAddress
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
      error?: unknown;
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
      error: event.error,
    };
  }
  return event;
};
