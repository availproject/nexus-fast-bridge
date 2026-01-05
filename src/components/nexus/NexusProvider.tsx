"use client";
import {
  type EthereumProvider,
  type NexusNetwork,
  NexusSDK,
  type OnAllowanceHookData,
  type OnIntentHookData,
  type OnSwapIntentHook,
  type SupportedChainsResult,
  type UserAsset,
  type OnSwapIntentHookData,
  NexusError,
  ERROR_CODES,
  type SupportedChainsAndTokensResult,
} from "@avail-project/nexus-core";
import { createContext, useCallback, useMemo, useState } from "react";

interface NexusContextType {
  nexusSDK: NexusSDK | null;
  unifiedBalance: UserAsset[] | null;
  initializeNexus: (provider: EthereumProvider) => Promise<void>;
  deinitializeNexus: () => Promise<void>;
  attachEventHooks: () => void;
  intent: OnIntentHookData | null;
  swapIntent: OnSwapIntentHookData | null;
  setSwapIntent: React.Dispatch<
    React.SetStateAction<OnSwapIntentHookData | null>
  >;
  setIntent: React.Dispatch<React.SetStateAction<OnIntentHookData | null>>;
  allowance: OnAllowanceHookData | null;
  setAllowance: React.Dispatch<
    React.SetStateAction<OnAllowanceHookData | null>
  >;
  handleInit: (provider: EthereumProvider) => Promise<void>;
  supportedChainsAndTokens: SupportedChainsAndTokensResult | null;
  swapSupportedChainsAndTokens: SupportedChainsResult | null;
  network?: NexusNetwork;
  loading: boolean;
  fetchUnifiedBalance: () => Promise<void>;
  handleNexusError: (err: unknown) => {
    code?: (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
    message: string;
    context?: string;
    details?: Record<string, unknown>;
  };
}

const NexusContext = createContext<NexusContextType | undefined>(undefined);
const NexusProvider = ({
  children,
  config = {
    network: "mainnet",
    debug: true,
  },
}: {
  children: React.ReactNode;
  config?: {
    network?: NexusNetwork;
    debug?: boolean;
  };
}) => {
  const sdk = useMemo(
    () => new NexusSDK({ ...config, siweChain: 143 }),
    [config],
  );
  const [nexusSDK, setNexusSDK] = useState<NexusSDK | null>(null);
  const [supportedChainsAndTokens, setSupportedChainsAndTokens] =
    useState<SupportedChainsAndTokensResult | null>(null);
  const [swapSupportedChainsAndTokens, setSwapSupportedChainsAndTokens] =
    useState<SupportedChainsResult | null>(null);
  const [unifiedBalance, setUnifiedBalance] = useState<UserAsset[] | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [intent, setIntent] = useState<OnIntentHookData | null>(null);
  const [swapIntent, setSwapIntent] = useState<
    Parameters<OnSwapIntentHook>[0] | null
  >(null);
  const [allowance, setAllowance] = useState<OnAllowanceHookData | null>(null);

  const initChainsAndTokens = useCallback(() => {
    const list = sdk?.utils
      ?.getSupportedChains(config?.network === "testnet" ? 0 : undefined)
      .filter((chain) => chain.id !== 728126428);

    setSupportedChainsAndTokens(list ?? null);
    const swapList = sdk?.utils?.getSwapSupportedChainsAndTokens();
    setSwapSupportedChainsAndTokens(swapList ?? null);
  }, [sdk, config?.network]);

  const initializeNexus = useCallback(
    async (provider: EthereumProvider) => {
      setLoading(true);
      try {
        if (sdk.isInitialized())
          throw new Error("Nexus is already initialized");
        await sdk.initialize(provider);
        setNexusSDK(sdk);
        const unifiedBalance = await sdk?.getUnifiedBalances(true);
        setUnifiedBalance(unifiedBalance);
        initChainsAndTokens();
      } catch (error) {
        console.error("Error initializing Nexus:", error);
      } finally {
        setLoading(false);
      }
    },
    [sdk, initChainsAndTokens],
  );

  const deinitializeNexus = useCallback(async () => {
    try {
      if (!sdk.isInitialized()) {
        setNexusSDK(null);
        setUnifiedBalance(null);
        setIntent(null);
        setAllowance(null);
        return;
      }
      await sdk.deinit();
      setNexusSDK(null);
      setUnifiedBalance(null);
      setIntent(null);
      setAllowance(null);
    } catch (error) {
      console.error("Error deinitializing Nexus:", error);
      setNexusSDK(null);
      setUnifiedBalance(null);
      setIntent(null);
      setAllowance(null);
    }
  }, [sdk]);

  const attachEventHooks = useCallback(() => {
    sdk.setOnAllowanceHook((data: OnAllowanceHookData) => {
      data.allow(data.sources.map(() => "min"));
    });

    sdk.setOnIntentHook((data: OnIntentHookData) => {
      setIntent(data);
    });

    sdk.setOnSwapIntentHook((data: OnSwapIntentHookData) => {
      setSwapIntent(data);
    });
  }, [sdk]);

  const handleInit = useCallback(
    async (provider: EthereumProvider) => {
      if (sdk.isInitialized()) {
        return;
      }
      await initializeNexus(provider);
      attachEventHooks();
    },
    [sdk, initializeNexus, attachEventHooks],
  );

  const fetchUnifiedBalance = useCallback(async () => {
    try {
      const unifiedBalance = await sdk?.getUnifiedBalances(true);
      setUnifiedBalance(unifiedBalance);
    } catch (error) {
      console.error("Error fetching unified balance:", error);
    }
  }, [sdk]);

  const handleNexusError: NexusContextType["handleNexusError"] = useCallback(
    (err) => {
      if (err instanceof NexusError) {
        const { code, message, data } = err;
        return {
          code,
          message,
          context: data?.context,
          details: data?.details ?? undefined,
        };
      }
      return { message: (err as Error)?.message || "Unexpected error" };
    },
    [],
  );

  const value = useMemo(
    () => ({
      nexusSDK,
      initializeNexus,
      deinitializeNexus,
      attachEventHooks,
      intent,
      setIntent,
      allowance,
      setAllowance,
      handleInit,
      supportedChainsAndTokens,
      swapSupportedChainsAndTokens,
      unifiedBalance,
      network: config?.network,
      loading,
      fetchUnifiedBalance,
      swapIntent,
      setSwapIntent,
      handleNexusError,
    }),
    [
      nexusSDK,
      initializeNexus,
      deinitializeNexus,
      attachEventHooks,
      intent,
      setIntent,
      allowance,
      setAllowance,
      handleInit,
      supportedChainsAndTokens,
      swapSupportedChainsAndTokens,
      unifiedBalance,
      config,
      loading,
      fetchUnifiedBalance,
      swapIntent,
      setSwapIntent,
      handleNexusError,
    ],
  );
  return (
    <NexusContext.Provider value={value}>{children}</NexusContext.Provider>
  );
};

export default NexusProvider;
export { NexusContext, type NexusContextType };
export { useNexus } from "./useNexus"; // eslint-disable-line react-refresh/only-export-components -- Hook exports are safe
