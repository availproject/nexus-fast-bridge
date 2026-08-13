"use client";
import {
  createNexusClient,
  type EthereumProvider,
  type NexusClient,
  type NexusNetwork,
} from "@avail-project/nexus-core";
import { getCoinbaseRates } from "@avail-project/nexus-core/utils";
import { type NormalizedUserAsset, normalizeUserAssets } from "./balance-utils";
import {
  type ChainBalance,
  type LegacyAllowanceHookData,
  type LegacyIntentHookData,
  normalizeIntentBalances,
  normalizeSupportedChains,
  type SupportedChainsAndTokensResult,
  type TokenBalance,
} from "./better-intent-compat";

export type UserAsset = NormalizedUserAsset;

type SupportedChainsResult = SupportedChainsAndTokensResult;

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
import { useAccount, useAccountEffect } from "wagmi";
import { trackFastBridgeFail } from "@/lib/telemetry";
import { getUserFacingError } from "@/lib/user-facing-error";
import {
  isSwapSupportedBySdkChainList,
  type SdkChainListWithSwapSupport,
} from "../common/utils/constant";
import {
  buildUsdPeggedSymbolSet,
  DEFAULT_USD_PEGGED_TOKEN_SYMBOLS,
  fetchCoinbaseUsdRate,
  fetchCoinGeckoUsdRate,
  getCoinbaseSymbolCandidates,
  normalizeTokenSymbol,
  toFinitePositiveNumber,
  USD_PEGGED_FALLBACK_RATE,
} from "../common/utils/token-pricing";

function getErrorCode(error: unknown, fallback: string): string | number {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" || typeof code === "number") {
      return code;
    }
  }
  return fallback;
}

interface NexusContextType {
  allowance: RefObject<LegacyAllowanceHookData | null>;
  attachEventHooks: () => void;
  bridgableBalance: UserAsset[] | null;
  deinitializeNexus: () => Promise<void>;
  exchangeRate: Record<string, number> | null;
  fetchBridgableBalance: () => Promise<void>;
  fetchSwapBalance: () => Promise<UserAsset[] | null>;
  getFiatValue: (amount: number, token: string) => number;
  handleInit: (provider: EthereumProvider) => Promise<void>;
  initializeNexus: (provider: EthereumProvider) => Promise<void>;
  intent: RefObject<LegacyIntentHookData | null>;
  loading: boolean;
  network?: NexusNetwork;
  nexusInitError: string | null;
  nexusSDK: NexusClient | null;
  resolveTokenUsdRate: (tokenSymbol: string) => Promise<number | null>;
  setAllowance: (data: LegacyAllowanceHookData | null) => void;
  setIntent: (data: LegacyIntentHookData | null) => void;
  supportedChainsAndTokens: SupportedChainsAndTokensResult | null;
  swapBalance: UserAsset[] | null;
  swapIntent: RefObject<LegacyIntentHookData | null>;
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
  network: "canary",
  debug: true,
};

const NEXUS_INIT_ERROR_MSG =
  "FastBridge couldn't finish connecting. Refresh the page and try again.";
const BALANCES_ERROR_MSG =
  "We couldn't load your balances. Check your connection and try again.";

const withTimeout = <T,>(promise: Promise<T>, ms = 15_000): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          "This request took too long. Check your connection and try again."
        )
      );
    }, ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

const NexusProvider = ({
  children,
  config = defaultConfig,
}: NexusProviderProps) => {
  const stableConfig = useMemo(
    () => ({ ...defaultConfig, ...config }),
    [config]
  );

  const { address } = useAccount();
  const accountAddressRef = useRef(address);
  accountAddressRef.current = address;

  const sdkRef = useRef<NexusClient | null>(null);
  const [sdk, setSdk] = useState<NexusClient | null>(null);
  const [nexusSDK, setNexusSDK] = useState<NexusClient | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [nexusInitError, setNexusInitError] = useState<string | null>(null);
  const supportedChainsAndTokens =
    useRef<SupportedChainsAndTokensResult | null>(null);
  const swapSupportedChainsAndTokens = useRef<SupportedChainsResult | null>(
    null
  );
  const [supportedChainsAndTokensState, setSupportedChainsAndTokensState] =
    useState<SupportedChainsAndTokensResult | null>(null);
  const [
    swapSupportedChainsAndTokensState,
    setSwapSupportedChainsAndTokensState,
  ] = useState<SupportedChainsResult | null>(null);
  const [bridgableBalance, setBridgableBalance] = useState<UserAsset[] | null>(
    null
  );
  const [swapBalance, setSwapBalance] = useState<UserAsset[] | null>(null);
  const [exchangeRateState, setExchangeRateState] = useState<Record<
    string,
    number
  > | null>(null);
  const exchangeRate = useRef<Record<string, number> | null>(null);
  const coinbaseUsdRateCache = useRef<Record<string, number>>({});
  const coinbaseUsdRateRequests = useRef<
    Record<string, Promise<number | null>>
  >({});
  const usdPeggedSymbols = useRef<Set<string>>(
    new Set(DEFAULT_USD_PEGGED_TOKEN_SYMBOLS)
  );

  const intent = useRef<LegacyIntentHookData | null>(null);
  const allowance = useRef<LegacyAllowanceHookData | null>(null);
  const swapIntent = useRef<LegacyIntentHookData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setNexusInitError(null);
    console.log("NEXUS CONFIG", stableConfig);
    const nextSdk = createNexusClient({
      network: stableConfig.network,
      debug: stableConfig.debug,
      forceMayan: true,
    });

    withTimeout(nextSdk.initialize(), 15_000)
      .then(() => {
        if (cancelled) {
          return;
        }
        sdkRef.current = nextSdk;
        setSdk(nextSdk);
        console.log("SupportedChains", nextSdk.getSupportedChains());
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        console.error(
          "Failed to initialize default read-only Nexus client:",
          err
        );
        setNexusInitError(getUserFacingError(err, NEXUS_INIT_ERROR_MSG));
      });

    return () => {
      cancelled = true;
      nextSdk.destroy();
      if (sdkRef.current === nextSdk) {
        sdkRef.current = null;
      }
      setSdk(null);
      setNexusSDK(null);
    };
  }, [stableConfig]);

  const cacheUsdRate = useCallback((tokenSymbol: string, usdRate: number) => {
    const normalized = normalizeTokenSymbol(tokenSymbol);
    const rate = toFinitePositiveNumber(usdRate);
    if (!(normalized && rate)) {
      return;
    }

    coinbaseUsdRateCache.current[normalized] = rate;
    const currentRates = exchangeRate.current ?? {};
    if (currentRates[normalized] === rate) {
      return;
    }

    const nextRates = {
      ...currentRates,
      [normalized]: rate,
    };
    exchangeRate.current = nextRates;
    setExchangeRateState(nextRates);
  }, []);

  const getUsdRateFromLocalSources = useCallback((tokenSymbol: string) => {
    const normalizedSymbol = normalizeTokenSymbol(tokenSymbol);
    if (!normalizedSymbol) {
      return 0;
    }

    for (const candidate of getCoinbaseSymbolCandidates(normalizedSymbol)) {
      const sdkRate = toFinitePositiveNumber(exchangeRate.current?.[candidate]);
      if (sdkRate) {
        return sdkRate;
      }

      const cachedRate = toFinitePositiveNumber(
        coinbaseUsdRateCache.current[candidate]
      );
      if (cachedRate) {
        return cachedRate;
      }
    }

    if (usdPeggedSymbols.current.has(normalizedSymbol)) {
      return USD_PEGGED_FALLBACK_RATE;
    }

    return 0;
  }, []);

  useEffect(() => {
    if (!sdk) {
      return;
    }

    let cancelled = false;
    let list: SupportedChainsAndTokensResult | null = null;
    let swapList: SupportedChainsAndTokensResult | null = null;
    try {
      list = normalizeSupportedChains(sdk.getSupportedChains());
      swapList = list;
    } catch (e) {
      console.warn(
        "SDK getSupportedChains failed (likely not initialized yet):",
        e
      );
    }

    supportedChainsAndTokens.current = list;
    swapSupportedChainsAndTokens.current = swapList;
    usdPeggedSymbols.current = buildUsdPeggedSymbolSet(list);
    setSupportedChainsAndTokensState(list);
    setSwapSupportedChainsAndTokensState(swapList);

    void getCoinbaseRates()
      .then((rates) => {
        if (cancelled) {
          return;
        }
        const usdPerUnit: Record<string, number> = {};

        for (const [symbol, value] of Object.entries(rates)) {
          const unitsPerUsd = Number.parseFloat(String(value));
          if (Number.isFinite(unitsPerUsd) && unitsPerUsd > 0) {
            usdPerUnit[normalizeTokenSymbol(symbol)] = 1 / unitsPerUsd;
          }
        }
        exchangeRate.current = usdPerUnit;
        setExchangeRateState(usdPerUnit);
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn("Unable to preload Nexus rates", error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sdk]);

  const normalizeUserAssetFiatValues = useCallback(
    (
      assets: TokenBalance[] | null,
      swapChains?: SdkChainListWithSwapSupport
    ): UserAsset[] | null =>
      normalizeUserAssets(
        assets,
        getUsdRateFromLocalSources,
        swapChains
          ? (source) =>
              isSwapSupportedBySdkChainList(source.chain.id, swapChains)
          : undefined
      ),
    [getUsdRateFromLocalSources]
  );

  const resolveTokenUsdRate = useCallback(
    async (tokenSymbol: string) => {
      const normalizedSymbol = normalizeTokenSymbol(tokenSymbol);
      if (!normalizedSymbol) {
        return null;
      }

      const sdkRate = toFinitePositiveNumber(
        exchangeRate.current?.[normalizedSymbol]
      );
      if (sdkRate) {
        return sdkRate;
      }

      const cachedRate = toFinitePositiveNumber(
        coinbaseUsdRateCache.current[normalizedSymbol]
      );
      if (cachedRate) {
        return cachedRate;
      }

      const inFlightRequest = coinbaseUsdRateRequests.current[normalizedSymbol];
      if (inFlightRequest) {
        return inFlightRequest;
      }

      const requestPromise = (async (): Promise<number | null> => {
        for (const candidate of getCoinbaseSymbolCandidates(normalizedSymbol)) {
          const sdkCandidateRate = toFinitePositiveNumber(
            exchangeRate.current?.[candidate]
          );
          if (sdkCandidateRate) {
            cacheUsdRate(normalizedSymbol, sdkCandidateRate);
            return sdkCandidateRate;
          }

          const cachedCandidateRate = toFinitePositiveNumber(
            coinbaseUsdRateCache.current[candidate]
          );
          if (cachedCandidateRate) {
            cacheUsdRate(normalizedSymbol, cachedCandidateRate);
            return cachedCandidateRate;
          }
        }

        const coinbaseRate = await fetchCoinbaseUsdRate(normalizedSymbol);
        if (coinbaseRate) {
          cacheUsdRate(normalizedSymbol, coinbaseRate);
          return coinbaseRate;
        }

        const coinGeckoRate = await fetchCoinGeckoUsdRate(normalizedSymbol);
        if (coinGeckoRate) {
          cacheUsdRate(normalizedSymbol, coinGeckoRate);
          return coinGeckoRate;
        }

        if (usdPeggedSymbols.current.has(normalizedSymbol)) {
          cacheUsdRate(normalizedSymbol, USD_PEGGED_FALLBACK_RATE);
          return USD_PEGGED_FALLBACK_RATE;
        }

        return null;
      })();

      coinbaseUsdRateRequests.current[normalizedSymbol] = requestPromise;
      try {
        return await requestPromise;
      } finally {
        delete coinbaseUsdRateRequests.current[normalizedSymbol];
      }
    },
    [cacheUsdRate]
  );

  const initializedRef = useRef(false);

  const setIntent = useCallback((data: LegacyIntentHookData | null) => {
    intent.current = data;
  }, []);

  const setAllowance = useCallback((data: LegacyAllowanceHookData | null) => {
    allowance.current = data;
  }, []);

  const setupNexus = useCallback(async () => {
    const activeSdk = sdkRef.current;
    if (!activeSdk) {
      setNexusInitError(NEXUS_INIT_ERROR_MSG);
      return;
    }
    try {
      const list = normalizeSupportedChains(activeSdk.getSupportedChains());
      supportedChainsAndTokens.current = list ?? null;
      setSupportedChainsAndTokensState(list ?? null);
      usdPeggedSymbols.current = buildUsdPeggedSymbolSet(list ?? null);
      const swapList = list;
      swapSupportedChainsAndTokens.current = swapList ?? null;
      setSwapSupportedChainsAndTokensState(swapList ?? null);

      const [bridgeAbleBalanceResult, swapBalanceResult, rates] =
        await withTimeout(
          Promise.allSettled([
            activeSdk.getBalancesForBridge(),
            activeSdk.getBalancesForSwap(),
            getCoinbaseRates(),
          ]),
          15_000
        );

      if (rates?.status === "fulfilled") {
        const usdPerUnit: Record<string, number> = {};

        for (const [symbol, value] of Object.entries(rates.value)) {
          const unitsPerUsd = Number.parseFloat(String(value));
          if (Number.isFinite(unitsPerUsd) && unitsPerUsd > 0) {
            usdPerUnit[normalizeTokenSymbol(symbol)] = 1 / unitsPerUsd;
          }
        }
        exchangeRate.current = usdPerUnit;
        setExchangeRateState(usdPerUnit);
      }

      if (bridgeAbleBalanceResult?.status === "fulfilled") {
        setBridgableBalance(
          normalizeUserAssetFiatValues(
            normalizeIntentBalances(bridgeAbleBalanceResult.value, list)
          )
        );
      }

      if (swapBalanceResult?.status === "fulfilled") {
        const rawSwapBalance = normalizeIntentBalances(
          swapBalanceResult.value,
          swapList
        );
        const filteredSwapBalance = filterUnsupportedSwapSources(
          rawSwapBalance,
          swapList
        );
        const normalizedSwapBalance = normalizeUserAssetFiatValues(
          filteredSwapBalance,
          swapList
        );
        console.log(
          "[NexusProvider] getBalancesForSwap:init raw",
          rawSwapBalance
        );
        setSwapBalance(normalizedSwapBalance);
      } else {
        const errorMsg = getUserFacingError(
          swapBalanceResult.reason,
          BALANCES_ERROR_MSG
        );
        setNexusInitError(errorMsg);
        trackFastBridgeFail({
          failure_type: "balance_fetch",
          reason: errorMsg,
          error_code: getErrorCode(
            swapBalanceResult.reason,
            "BALANCE_FETCH_ERROR"
          ),
          wallet_address: accountAddressRef.current,
        });
      }
    } catch (err) {
      console.error("Error setting up Nexus balances:", err);
      const errorMsg = getUserFacingError(err, BALANCES_ERROR_MSG);
      setNexusInitError(errorMsg);
      trackFastBridgeFail({
        failure_type: "balance_fetch",
        reason: errorMsg,
        error_code: getErrorCode(err, "BALANCE_FETCH_ERROR"),
        wallet_address: accountAddressRef.current,
      });
    }
  }, [normalizeUserAssetFiatValues]);

  const initializeNexus = useCallback(
    async (provider: EthereumProvider) => {
      setLoading(true);
      setNexusInitError(null);
      try {
        console.log("INITIALIZE NEXUS CONFIG", stableConfig);
        const nextSdk = createNexusClient({
          network: stableConfig.network,
          debug: stableConfig.debug,
          forceMayan: true,
        });

        await withTimeout(nextSdk.initialize(), 15_000);
        await withTimeout(nextSdk.setEVMProvider(provider), 15_000);

        sdkRef.current = nextSdk;
        setSdk(nextSdk);
        initializedRef.current = true;
        setNexusSDK(nextSdk);
      } catch (error) {
        console.error("Error initializing Nexus:", error);
        const errorMsg = getUserFacingError(error, NEXUS_INIT_ERROR_MSG);
        setNexusInitError(errorMsg);
        trackFastBridgeFail({
          failure_type: "sdk_init",
          reason: errorMsg,
          error_code: getErrorCode(error, "SDK_INIT_ERROR"),
          wallet_address: accountAddressRef.current,
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [stableConfig]
  );

  const deinitializeNexus = useCallback(() => {
    try {
      const activeSdk = nexusSDK ?? sdkRef.current;
      if (!activeSdk) {
        return Promise.resolve();
      }
      activeSdk.destroy();
      initializedRef.current = false;
      setNexusSDK(null);
      setBridgableBalance(null);
      setSwapBalance(null);
      setNexusInitError(null);
      intent.current = null;
      swapIntent.current = null;
      allowance.current = null;
      setLoading(false);
    } catch (error) {
      console.error("Error deinitializing Nexus:", error);
    }
    return Promise.resolve();
  }, [nexusSDK]);

  const attachEventHooks = useCallback(() => {
    // Dummy signature for backward compatibility, hooks are now per-call
  }, []);

  const handleInit = useCallback(
    async (provider: EthereumProvider) => {
      if (initializedRef.current || loading) {
        return;
      }
      if (!provider || typeof provider.request !== "function") {
        const message =
          "We couldn't access your wallet. Unlock it and reconnect, then try again.";
        setNexusInitError(message);
        trackFastBridgeFail({
          failure_type: "sdk_init",
          reason: message,
          error_code: "NO_PROVIDER",
          wallet_address: accountAddressRef.current,
        });
        throw new Error(message);
      }
      try {
        setNexusInitError(null);
        await initializeNexus(provider);
        await setupNexus();
        attachEventHooks();
      } catch (error) {
        console.error("Error during Nexus setup flow:", error);
        setNexusInitError(getUserFacingError(error, NEXUS_INIT_ERROR_MSG));
        throw error;
      }
    },
    [loading, initializeNexus, setupNexus, attachEventHooks]
  );

  const fetchBridgableBalance = useCallback(async () => {
    try {
      const activeSdk = sdkRef.current;
      if (!activeSdk) {
        return;
      }
      const updatedBalance = await withTimeout(
        activeSdk.getBalancesForBridge(),
        15_000
      );
      const chains = supportedChainsAndTokens.current ?? [];
      setBridgableBalance(
        normalizeUserAssetFiatValues(
          normalizeIntentBalances(updatedBalance, chains)
        )
      );
    } catch (error) {
      console.error("Error fetching bridgable balance:", error);
      const errorMsg = getUserFacingError(error, BALANCES_ERROR_MSG);
      setNexusInitError(errorMsg);
      trackFastBridgeFail({
        failure_type: "balance_fetch",
        reason: errorMsg,
        error_code: getErrorCode(error, "BALANCE_FETCH_ERROR"),
        wallet_address: accountAddressRef.current,
      });
    }
  }, [normalizeUserAssetFiatValues]);

  const fetchSwapBalance = useCallback(async () => {
    try {
      const activeSdk = sdkRef.current;
      if (!activeSdk) {
        return null;
      }
      const updatedBalance = await withTimeout(
        activeSdk.getBalancesForSwap(),
        15_000
      );
      const normalizedBalance = normalizeIntentBalances(
        updatedBalance,
        swapSupportedChainsAndTokens.current ?? []
      );
      const filteredSwapBalance = filterUnsupportedSwapSources(
        normalizedBalance,
        swapSupportedChainsAndTokens.current
      );
      const normalizedSwapBalance = normalizeUserAssetFiatValues(
        filteredSwapBalance,
        swapSupportedChainsAndTokens.current ?? undefined
      );
      console.log(
        "[NexusProvider] getBalancesForSwap:refresh raw",
        updatedBalance
      );
      setSwapBalance(normalizedSwapBalance);
      return normalizedSwapBalance;
    } catch (error) {
      console.error("Error fetching swap balance:", error);
      const errorMsg = getUserFacingError(error, BALANCES_ERROR_MSG);
      setNexusInitError(errorMsg);
      trackFastBridgeFail({
        failure_type: "balance_fetch",
        reason: errorMsg,
        error_code: getErrorCode(error, "BALANCE_FETCH_ERROR"),
        wallet_address: accountAddressRef.current,
      });
      return null;
    }
  }, [normalizeUserAssetFiatValues]);

  const getFiatValue = useCallback(
    (amount: number, token: string) => {
      const rate = getUsdRateFromLocalSources(token);
      return rate * amount;
    },
    [getUsdRateFromLocalSources]
  );

  // Backfill USD values once rates arrive so downstream selectors/max logic
  // do not treat supported assets as $0 simply due to timing.
  useEffect(() => {
    if (!exchangeRateState) {
      return;
    }
    setSwapBalance((prev) => normalizeUserAssetFiatValues(prev));
    setBridgableBalance((prev) => normalizeUserAssetFiatValues(prev));
  }, [exchangeRateState, normalizeUserAssetFiatValues]);

  useAccountEffect({
    onDisconnect() {
      deinitializeNexus();
    },
  });

  const value = useMemo(
    () => ({
      nexusSDK,
      nexusInitError,
      initializeNexus,
      deinitializeNexus,
      attachEventHooks,
      intent,
      allowance,
      handleInit,
      supportedChainsAndTokens: supportedChainsAndTokensState,
      swapSupportedChainsAndTokens: swapSupportedChainsAndTokensState,
      bridgableBalance,
      swapBalance,
      network: config?.network,
      loading,
      fetchBridgableBalance,
      fetchSwapBalance,
      setAllowance,
      setIntent,
      swapIntent,
      exchangeRate: exchangeRateState,
      getFiatValue,
      resolveTokenUsdRate,
    }),
    [
      nexusSDK,
      nexusInitError,
      initializeNexus,
      deinitializeNexus,
      attachEventHooks,
      handleInit,
      bridgableBalance,
      swapBalance,
      config,
      loading,
      fetchBridgableBalance,
      fetchSwapBalance,
      setAllowance,
      setIntent,
      exchangeRateState,
      getFiatValue,
      resolveTokenUsdRate,
      supportedChainsAndTokensState,
      swapSupportedChainsAndTokensState,
    ]
  );
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
