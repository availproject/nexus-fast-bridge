"use client";
import {
  type EthereumProvider,
  type NexusNetwork,
  NexusSDK,
  type OnAllowanceHookData,
  type OnIntentHookData,
  type OnSwapIntentHookData,
  type SupportedChainsAndTokensResult,
  type SupportedChainsResult,
  type UserAsset,
} from "@avail-project/nexus-core";
import {
  createContext,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAccountEffect } from "wagmi";
import { useRuntime } from "@/providers/runtime-context";
import {
  DEFAULT_USD_PEGGED_TOKEN_SYMBOLS,
  fetchCoinbaseUsdRate,
  fetchCoinGeckoUsdRate,
  getCoinbaseSymbolCandidates,
  normalizeTokenSymbol,
  resolveBaseSymbol,
  TOKEN_PRICE_PEGS,
  toFinitePositiveNumber,
  USD_PEGGED_FALLBACK_RATE,
} from "../common/utils/token-pricing";

interface NexusContextType {
  allowance: RefObject<OnAllowanceHookData | null>;
  attachEventHooks: () => void;
  bridgableBalance: UserAsset[] | null;
  deinitializeNexus: () => Promise<void>;
  exchangeRate: Record<string, number> | null;
  fetchBridgableBalance: () => Promise<void>;
  fetchSwapBalance: () => Promise<void>;
  getFiatValue: (amount: number, token: string) => number;
  handleInit: (provider: EthereumProvider) => Promise<void>;
  initializeNexus: (provider: EthereumProvider) => Promise<void>;
  intent: RefObject<OnIntentHookData | null>;
  loading: boolean;
  network?: NexusNetwork;
  nexusSDK: NexusSDK | null;
  resolveTokenUsdRate: (tokenSymbol: string) => Promise<number | null>;
  setAllowance: (data: OnAllowanceHookData | null) => void;
  setIntent: (data: OnIntentHookData | null) => void;
  supportedChainsAndTokens: SupportedChainsAndTokensResult | null;
  swapBalance: UserAsset[] | null;
  swapIntent: RefObject<OnSwapIntentHookData | null>;
  swapSupportedChainsAndTokens: SupportedChainsResult | null;
}

export const NexusContext = createContext<NexusContextType | undefined>(
  undefined
);

interface NexusProviderProps {
  children: React.ReactNode;
  config?: {
    network?: NexusNetwork;
    debug?: boolean;
  };
}

const defaultConfig: Required<NexusProviderProps["config"]> = {
  network: "mainnet",
  debug: false,
};

const NexusProvider = ({
  children,
  config = defaultConfig,
}: NexusProviderProps) => {
  const { chainFeatures } = useRuntime();
  const stableConfig = useMemo(
    () => ({ ...defaultConfig, ...config }),
    [config]
  );

  const sdkRef = useRef<NexusSDK | null>(null);
  sdkRef.current ??= new NexusSDK({
    ...stableConfig,
  });
  const sdk = sdkRef.current;

  const [nexusSDK, setNexusSDK] = useState<NexusSDK | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const applyTokenLogos = useCallback(
    (chains: SupportedChainsAndTokensResult | null) => {
      if (!chains) {
        return null;
      }
      const overrides = chainFeatures.tokenLogoOverrideBySymbol ?? {};
      if (Object.keys(overrides).length === 0) {
        return chains;
      }
      return chains.map((chain) => ({
        ...chain,
        tokens: chain.tokens.map((token) => ({
          ...token,
          logo:
            overrides[token.symbol] ??
            overrides[token.symbol.toUpperCase()] ??
            token.logo,
        })),
      }));
    },
    [chainFeatures.tokenLogoOverrideBySymbol]
  );
  const [supportedChainsAndTokens, setSupportedChainsAndTokens] =
    useState<SupportedChainsAndTokensResult | null>(
      applyTokenLogos(
        sdk.utils.getSupportedChains(
          stableConfig.network === "testnet" ? 0 : undefined
        ) ?? null
      )
    );
  const [swapSupportedChainsAndTokens, setSwapSupportedChainsAndTokens] =
    useState<SupportedChainsResult | null>(
      sdk.utils.getSwapSupportedChainsAndTokens() ?? null
    );
  const [bridgableBalance, setBridgableBalance] = useState<UserAsset[] | null>(
    null
  );
  const [swapBalance, setSwapBalance] = useState<UserAsset[] | null>(null);
  const exchangeRate = useRef<Record<string, number> | null>(null);
  const usdRateCache = useRef<Record<string, number>>({});
  const usdRateRequests = useRef<Record<string, Promise<number | null>>>({});

  const intent = useRef<OnIntentHookData | null>(null);
  const allowance = useRef<OnAllowanceHookData | null>(null);
  const swapIntent = useRef<OnSwapIntentHookData | null>(null);
  const usdPeggedSymbols = useMemo(
    () => new Set<string>(DEFAULT_USD_PEGGED_TOKEN_SYMBOLS),
    []
  );

  const cacheUsdRate = useCallback((tokenSymbol: string, usdRate: number) => {
    const normalized = normalizeTokenSymbol(tokenSymbol);
    const rate = toFinitePositiveNumber(usdRate);
    if (!(normalized && rate)) {
      return;
    }
    usdRateCache.current[normalized] = rate;
    exchangeRate.current = {
      ...(exchangeRate.current ?? {}),
      [normalized]: rate,
    };
  }, []);

  const getCachedUsdRateForSymbols = useCallback(
    (symbols: string[]): number => {
      for (const symbol of symbols) {
        const rate =
          toFinitePositiveNumber(exchangeRate.current?.[symbol]) ??
          toFinitePositiveNumber(usdRateCache.current[symbol]);
        if (rate) {
          return rate;
        }
      }

      return 0;
    },
    []
  );

  const getLocalUsdRate = useCallback(
    (tokenSymbol: string): number => {
      const normalized = normalizeTokenSymbol(tokenSymbol);
      if (!normalized) {
        return 0;
      }

      const cachedRate = getCachedUsdRateForSymbols(
        getCoinbaseSymbolCandidates(normalized)
      );
      if (cachedRate) {
        return cachedRate;
      }

      const baseSymbol = resolveBaseSymbol(normalized);
      if (baseSymbol === "USD" || usdPeggedSymbols.has(normalized)) {
        return USD_PEGGED_FALLBACK_RATE;
      }

      if (baseSymbol && usdPeggedSymbols.has(baseSymbol)) {
        return USD_PEGGED_FALLBACK_RATE;
      }

      return baseSymbol
        ? getCachedUsdRateForSymbols(getCoinbaseSymbolCandidates(baseSymbol))
        : 0;
    },
    [getCachedUsdRateForSymbols, usdPeggedSymbols]
  );

  const applySupportedChainLists = useCallback(() => {
    const list = sdk.utils.getSupportedChains(
      stableConfig.network === "testnet" ? 0 : undefined
    );
    setSupportedChainsAndTokens(applyTokenLogos(list ?? null));
    const swapList = sdk.utils.getSwapSupportedChainsAndTokens();
    setSwapSupportedChainsAndTokens(swapList ?? null);
  }, [applyTokenLogos, sdk, stableConfig.network]);

  useEffect(() => {
    applySupportedChainLists();
  }, [applySupportedChainLists]);

  const cacheCoinbaseRates = useCallback((rates: Record<string, unknown>) => {
    // Coinbase returns "units per USD" (e.g., 1 USD = 0.00028 ETH).
    // Convert to "USD per unit" (e.g., 1 ETH = ~$3514) for straightforward UI calculations.
    const usdPerUnit: Record<string, number> = {};

    for (const [symbol, value] of Object.entries(rates)) {
      const normalized = normalizeTokenSymbol(symbol);
      if (TOKEN_PRICE_PEGS[normalized]) {
        continue;
      }
      const unitsPerUsd = Number.parseFloat(String(value));
      if (Number.isFinite(unitsPerUsd) && unitsPerUsd > 0) {
        usdPerUnit[normalized] = 1 / unitsPerUsd;
      }
    }

    exchangeRate.current = usdPerUnit;
  }, []);

  const setupNexus = useCallback(async () => {
    applySupportedChainLists();
    const [bridgeAbleBalanceResult, swapBalanceResult, rates] =
      await Promise.allSettled([
        sdk.getBalancesForBridge(),
        sdk.getBalancesForSwap(),
        sdk.utils.getCoinbaseRates(),
      ]);

    if (bridgeAbleBalanceResult.status === "fulfilled") {
      setBridgableBalance(bridgeAbleBalanceResult.value);
    }
    if (swapBalanceResult.status === "fulfilled") {
      setSwapBalance(swapBalanceResult.value);
    }

    if (rates?.status === "fulfilled") {
      cacheCoinbaseRates(rates.value);
    }
  }, [applySupportedChainLists, cacheCoinbaseRates, sdk]);

  const resolveTokenUsdRate = useCallback(
    (tokenSymbol: string): Promise<number | null> => {
      const normalized = normalizeTokenSymbol(tokenSymbol);
      if (!normalized) {
        return Promise.resolve(null);
      }

      const cached = getLocalUsdRate(normalized);
      if (cached) {
        return Promise.resolve(cached);
      }

      const baseSymbol = resolveBaseSymbol(normalized);
      if (baseSymbol === "USD" || usdPeggedSymbols.has(normalized)) {
        cacheUsdRate(normalized, USD_PEGGED_FALLBACK_RATE);
        return Promise.resolve(USD_PEGGED_FALLBACK_RATE);
      }

      const requestKey = baseSymbol ?? normalized;
      usdRateRequests.current[requestKey] ??= (async () => {
        const resolved =
          (await fetchCoinbaseUsdRate(requestKey)) ??
          (await fetchCoinGeckoUsdRate(requestKey));
        if (!resolved) {
          return null;
        }
        cacheUsdRate(requestKey, resolved);
        if (requestKey !== normalized) {
          cacheUsdRate(normalized, resolved);
        }
        return resolved;
      })();

      return usdRateRequests.current[requestKey];
    },
    [cacheUsdRate, getLocalUsdRate, usdPeggedSymbols]
  );

  const initializeNexus = async (provider: EthereumProvider) => {
    setLoading(true);
    try {
      if (sdk.isInitialized()) {
        throw new Error("Nexus is already initialized");
      }
      await sdk.initialize(provider);
      setNexusSDK(sdk);
    } catch (error) {
      console.error("Error initializing Nexus:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deinitializeNexus = async () => {
    try {
      if (!nexusSDK) {
        return;
      }
      await nexusSDK.deinit();
      setNexusSDK(null);
      setBridgableBalance(null);
      setSwapBalance(null);
      exchangeRate.current = null;
      intent.current = null;
      swapIntent.current = null;
      allowance.current = null;
      setLoading(false);
    } catch (error) {
      console.error("Error deinitializing Nexus:", error);
    }
  };

  const attachEventHooks = () => {
    sdk.setOnAllowanceHook((data: OnAllowanceHookData) => {
      /**
       * Useful when you want the user to select, min, max or a custom value
       * Can use this to capture data and then show it on the UI
       * @see - always call data.allow() to progress the flow, otherwise it will stay stuck here.
       * const {allow, sources, deny} = data
       * @example allow(['min', 'max', '0.5']), the array in allow function should match number of sources.
       * You can skip setting this hook if you want, sdk will auto progress if this hook is not attached
       */
      allowance.current = data;
    });

    sdk.setOnIntentHook((data: OnIntentHookData) => {
      /**
       * Useful when you want to capture the intent, and display it on the UI (bridge, bridgeAndTransfer, bridgeAndExecute)
       * const {allow, deny, intent, refresh} = data
       * @see - always call data.allow() to progress the flow, otherwise it will stay stuck here.
       * deny() to reject the intent
       * refresh() to refresh the intent, best to call refresh in 15 second intervals
       * data.intent -> details about the intent, useful when wanting to display info on UI
       * You can skip setting this hook if you want, sdk will auto progress if this hook is not attached
       */
      intent.current = data;
    });

    sdk.setOnSwapIntentHook((data: OnSwapIntentHookData) => {
      /**
       * Same behaviour and function as setOnIntentHook, except this one is for swaps exclusively
       */
      swapIntent.current = data;
    });
  };

  const handleInit = async (provider: EthereumProvider) => {
    if (sdk.isInitialized() || loading) {
      return;
    }

    if (!provider || typeof provider.request !== "function") {
      console.error("[NexusProvider] Invalid provider:", provider);
      throw new Error("Invalid EIP-1193 provider");
    }

    await initializeNexus(provider);

    await setupNexus();

    attachEventHooks();
  };

  const fetchBridgableBalance = async () => {
    try {
      const updatedBalance = await sdk.getBalancesForBridge();
      setBridgableBalance(updatedBalance);
    } catch (error) {
      console.error("Error fetching bridgable balance:", error);
    }
  };

  const fetchSwapBalance = async () => {
    try {
      const updatedBalance = await sdk.getBalancesForSwap();
      setSwapBalance(updatedBalance);
    } catch (error) {
      console.error("Error fetching swap balance:", error);
    }
  };

  function getFiatValue(amount: number, token: string) {
    const rate = getLocalUsdRate(token);
    return rate * amount;
  }

  useAccountEffect({
    onDisconnect() {
      deinitializeNexus();
    },
  });

  const setIntent = (data: OnIntentHookData | null) => {
    intent.current = data;
  };

  const setAllowance = (data: OnAllowanceHookData | null) => {
    allowance.current = data;
  };

  const value = {
    nexusSDK,
    initializeNexus,
    deinitializeNexus,
    attachEventHooks,
    intent,
    allowance,
    handleInit,
    supportedChainsAndTokens,
    swapSupportedChainsAndTokens,
    bridgableBalance,
    swapBalance,
    network: config?.network,
    loading,
    fetchBridgableBalance,
    fetchSwapBalance,
    swapIntent,
    exchangeRate: exchangeRate.current,
    getFiatValue,
    resolveTokenUsdRate,
    setIntent,
    setAllowance,
  };
  return (
    <NexusContext.Provider value={value}>{children}</NexusContext.Provider>
  );
};

export function useNexus() {
  const context = useContext(NexusContext);
  if (!context) {
    throw new Error("useNexus must be used within a NexusProvider");
  }
  return context;
}

export default NexusProvider;
