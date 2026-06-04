"use client";
import type {
  NexusNetwork as LegacyNexusNetwork,
  NexusSDK as LegacyNexusSDK,
  OnAllowanceHookData as LegacyOnAllowanceHookData,
  OnIntentHookData as LegacyOnIntentHookData,
  OnSwapIntentHookData as LegacyOnSwapIntentHookData,
} from "@avail-project/nexus-core";
import {
  type ChainBalance,
  createNexusClient,
  type EthereumProvider,
  type NexusClient,
  type NexusNetwork,
  type SupportedChainsAndTokensResult,
  type TokenBalance,
} from "@avail-project/nexus-sdk-v2";
import { getCoinbaseRates } from "@avail-project/nexus-sdk-v2/utils";
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

export type UserAsset = TokenBalance & {
  balanceInFiat: number;
  breakdown: Array<
    ChainBalance & {
      balanceInFiat: number;
      chain: ChainBalance["chain"];
      contractAddress: string;
      decimals: number;
      icon?: string;
      symbol: string;
    }
  >;
  icon?: string;
};

export type UserAssetDatum = UserAsset;

type SupportedChainsResult = SupportedChainsAndTokensResult;
export type NexusContextSDK = NexusClient & LegacyNexusSDK;

interface NexusContextType {
  allowance: RefObject<LegacyOnAllowanceHookData | null>;
  attachEventHooks: () => void;
  bridgableBalance: UserAsset[] | null;
  deinitializeNexus: () => Promise<void>;
  exchangeRate: Record<string, number> | null;
  fetchBridgableBalance: () => Promise<void>;
  fetchSwapBalance: () => Promise<void>;
  getFiatValue: (amount: number, token: string) => number;
  handleInit: (provider: EthereumProvider) => Promise<void>;
  initializeNexus: (provider: EthereumProvider) => Promise<void>;
  intent: RefObject<LegacyOnIntentHookData | null>;
  loading: boolean;
  network?: LegacyNexusNetwork;
  nexusSDK: NexusContextSDK | null;
  resolveTokenUsdRate: (symbol: string) => Promise<number>;
  setAllowance: (data: LegacyOnAllowanceHookData | null) => void;
  setIntent: (data: LegacyOnIntentHookData | null) => void;
  supportedChainsAndTokens: SupportedChainsAndTokensResult | null;
  swapBalance: UserAsset[] | null;
  swapIntent: RefObject<LegacyOnSwapIntentHookData | null>;
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

const getUsdRateKey = (symbol: string) => symbol.trim().toUpperCase();

const buildUsdRates = (rates: Record<string, string | number>) => {
  const usdPerUnit: Record<string, number> = {};

  for (const [symbol, value] of Object.entries(rates)) {
    const unitsPerUsd = Number.parseFloat(String(value));
    if (Number.isFinite(unitsPerUsd) && unitsPerUsd > 0) {
      usdPerUnit[getUsdRateKey(symbol)] = 1 / unitsPerUsd;
    }
  }

  return usdPerUnit;
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

  const sdkRef = useRef<NexusClient | null>(null);
  const initializedRef = useRef(false);
  const [nexusSDK, setNexusSDK] = useState<NexusContextSDK | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [supportedChainsAndTokens, setSupportedChainsAndTokens] =
    useState<SupportedChainsAndTokensResult | null>(null);
  const [swapSupportedChainsAndTokens, setSwapSupportedChainsAndTokens] =
    useState<SupportedChainsResult | null>(null);
  const [bridgableBalance, setBridgableBalance] = useState<UserAsset[] | null>(
    null
  );
  const [swapBalance, setSwapBalance] = useState<UserAsset[] | null>(null);
  const [exchangeRateState, setExchangeRateState] = useState<Record<
    string,
    number
  > | null>(null);
  const exchangeRate = useRef<Record<string, number> | null>(null);

  const intent = useRef<LegacyOnIntentHookData | null>(null);
  const allowance = useRef<LegacyOnAllowanceHookData | null>(null);
  const swapIntent = useRef<LegacyOnSwapIntentHookData | null>(null);

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

  const updateSupportedChains = useCallback(
    (client: NexusClient) => {
      const list = applyTokenLogos(client.getSupportedChains() ?? null);
      setSupportedChainsAndTokens(list);
      setSwapSupportedChainsAndTokens(list);
    },
    [applyTokenLogos]
  );

  const getFiatValue = useCallback((amount: number, token: string) => {
    const key = getUsdRateKey(token);
    const stableRate = ["USDC", "USDT", "USDM"].includes(key) ? 1 : 0;
    const rate = exchangeRate.current?.[key] ?? stableRate;
    return rate * amount;
  }, []);

  const normalizeUserAssets = useCallback(
    (assets: TokenBalance[] | null): UserAsset[] | null => {
      if (!assets) {
        return null;
      }

      return assets.map((asset) => {
        let computedAssetUsd = 0;
        const sourceBalances =
          asset.chainBalances ??
          (asset as unknown as { breakdown?: ChainBalance[] }).breakdown ??
          [];

        const breakdown = sourceBalances.map((entry) => {
          const balance = Number.parseFloat(String(entry.balance ?? "0"));
          const safeBalance =
            Number.isFinite(balance) && balance > 0 ? balance : 0;
          const existingUsd = Number.parseFloat(String(entry.value ?? "0"));
          const balanceInFiat =
            Number.isFinite(existingUsd) && existingUsd >= 0
              ? existingUsd
              : getFiatValue(safeBalance, entry.symbol ?? asset.symbol);

          computedAssetUsd += balanceInFiat;

          return {
            ...entry,
            balanceInFiat,
            contractAddress: entry.contractAddress,
            decimals: entry.decimals,
            icon: asset.logo,
            symbol: entry.symbol,
          };
        });

        const assetUsd = Number.parseFloat(String(asset.value ?? "0"));
        const balanceInFiat =
          Number.isFinite(assetUsd) && assetUsd >= 0
            ? assetUsd
            : computedAssetUsd;

        return {
          ...asset,
          balanceInFiat,
          breakdown,
          icon: asset.logo,
        };
      });
    },
    [getFiatValue]
  );

  useEffect(() => {
    let cancelled = false;
    const client = createNexusClient({
      network: stableConfig.network,
      debug: stableConfig.debug,
    });

    client
      .initialize()
      .then(() => {
        if (cancelled) {
          client.destroy();
          return;
        }
        sdkRef.current = client;
        updateSupportedChains(client);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Failed to initialize read-only Nexus client:", error);
        }
      });

    return () => {
      cancelled = true;
      client.destroy();
      if (sdkRef.current === client) {
        sdkRef.current = null;
      }
    };
  }, [stableConfig, updateSupportedChains]);

  const refreshRates = useCallback(async () => {
    const rates = await getCoinbaseRates();
    const usdPerUnit = buildUsdRates(rates);
    exchangeRate.current = usdPerUnit;
    setExchangeRateState(usdPerUnit);
    return usdPerUnit;
  }, []);

  const setupNexus = useCallback(
    async (client = sdkRef.current) => {
      if (!client) {
        return;
      }

      updateSupportedChains(client);

      const [bridgeBalanceResult, swapBalanceResult, ratesResult] =
        await Promise.allSettled([
          client.getBalancesForBridge(),
          client.getBalancesForSwap(),
          refreshRates(),
        ]);

      if (ratesResult.status === "rejected") {
        console.warn("Unable to preload Nexus rates", ratesResult.reason);
      }

      if (bridgeBalanceResult.status === "fulfilled") {
        setBridgableBalance(normalizeUserAssets(bridgeBalanceResult.value));
      }

      if (swapBalanceResult.status === "fulfilled") {
        setSwapBalance(normalizeUserAssets(swapBalanceResult.value));
      }
    },
    [normalizeUserAssets, refreshRates, updateSupportedChains]
  );

  const initializeNexus = useCallback(
    async (provider: EthereumProvider) => {
      setLoading(true);
      try {
        const client = createNexusClient({
          network: stableConfig.network,
          debug: stableConfig.debug,
        });

        await client.initialize();
        await client.setEVMProvider(provider);

        sdkRef.current?.destroy();
        sdkRef.current = client;
        initializedRef.current = true;
        setNexusSDK(client as unknown as NexusContextSDK);
        updateSupportedChains(client);
      } catch (error) {
        console.error("Error initializing Nexus:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [stableConfig, updateSupportedChains]
  );

  const deinitializeNexus = useCallback(() => {
    try {
      const activeSdk = sdkRef.current;
      if (!activeSdk) {
        return Promise.resolve();
      }
      activeSdk.destroy();
      sdkRef.current = null;
      initializedRef.current = false;
      setNexusSDK(null);
      setBridgableBalance(null);
      setSwapBalance(null);
      exchangeRate.current = null;
      setExchangeRateState(null);
      intent.current = null;
      swapIntent.current = null;
      allowance.current = null;
      setLoading(false);
    } catch (error) {
      console.error("Error deinitializing Nexus:", error);
    }
    return Promise.resolve();
  }, []);

  const attachEventHooks = useCallback(() => {
    // v2 takes hooks per operation. Refs stay here for the existing UI.
  }, []);

  const handleInit = useCallback(
    async (provider: EthereumProvider) => {
      if (initializedRef.current || loading) {
        return;
      }

      if (!provider || typeof provider.request !== "function") {
        throw new Error("Invalid EIP-1193 provider");
      }

      await initializeNexus(provider);
      await setupNexus();
      attachEventHooks();
    },
    [attachEventHooks, initializeNexus, loading, setupNexus]
  );

  const fetchBridgableBalance = useCallback(async () => {
    try {
      const activeSdk = sdkRef.current;
      if (!activeSdk) {
        return;
      }
      const updatedBalance = await activeSdk.getBalancesForBridge();
      setBridgableBalance(normalizeUserAssets(updatedBalance));
    } catch (error) {
      console.error("Error fetching bridgable balance:", error);
    }
  }, [normalizeUserAssets]);

  const fetchSwapBalance = useCallback(async () => {
    try {
      const activeSdk = sdkRef.current;
      if (!activeSdk) {
        return;
      }
      const updatedBalance = await activeSdk.getBalancesForSwap();
      setSwapBalance(normalizeUserAssets(updatedBalance));
    } catch (error) {
      console.error("Error fetching swap balance:", error);
    }
  }, [normalizeUserAssets]);

  const resolveTokenUsdRate = useCallback(
    async (symbol: string): Promise<number> => {
      const key = getUsdRateKey(symbol);
      if (exchangeRate.current?.[key] !== undefined) {
        return exchangeRate.current[key];
      }

      if (["USDC", "USDT", "USDM"].includes(key)) {
        return 1;
      }

      try {
        const rates = await refreshRates();
        return rates[key] ?? 0;
      } catch (error) {
        console.error(error);
        return 0;
      }
    },
    [refreshRates]
  );

  useEffect(() => {
    if (!exchangeRateState) {
      return;
    }
    setSwapBalance((previous) => normalizeUserAssets(previous));
    setBridgableBalance((previous) => normalizeUserAssets(previous));
  }, [exchangeRateState, normalizeUserAssets]);

  useAccountEffect({
    onDisconnect() {
      deinitializeNexus();
    },
  });

  const setIntent = useCallback((data: LegacyOnIntentHookData | null) => {
    intent.current = data;
  }, []);

  const setAllowance = useCallback((data: LegacyOnAllowanceHookData | null) => {
    allowance.current = data;
  }, []);

  const value = useMemo(
    () => ({
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
      network: stableConfig.network as LegacyNexusNetwork,
      loading,
      fetchBridgableBalance,
      fetchSwapBalance,
      swapIntent,
      exchangeRate: exchangeRateState,
      getFiatValue,
      resolveTokenUsdRate,
      setIntent,
      setAllowance,
    }),
    [
      nexusSDK,
      initializeNexus,
      deinitializeNexus,
      attachEventHooks,
      handleInit,
      supportedChainsAndTokens,
      swapSupportedChainsAndTokens,
      bridgableBalance,
      swapBalance,
      stableConfig.network,
      loading,
      fetchBridgableBalance,
      fetchSwapBalance,
      exchangeRateState,
      getFiatValue,
      resolveTokenUsdRate,
      setIntent,
      setAllowance,
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
