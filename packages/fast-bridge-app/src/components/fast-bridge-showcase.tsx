"use client";
import { TOKEN_CONTRACT_ADDRESSES } from "@avail-project/nexus-core";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { useAccount, useChains, useSwitchChain } from "wagmi";
import { getChainSlugById } from "@/config/chain-settings";
import { readBridgeParams } from "../lib/url-params";
import { useRuntime } from "../providers/runtime-context";
import NexusOne from "./nexus-one/nexus-one";
import type { NexusOneConfig } from "./nexus-one/types";
import { findCitreaReceiveToken } from "./nexus-one/utils/citrea-tokens";
import { PreviewPanel } from "./wallet-connect";

const DESTINATION_TOKEN_BY_CHAIN_SLUG: Record<string, string> = {
  citrea: "ctUSD",
  megaeth: "USDM",
};

interface ReceiveAsset {
  chainId?: number;
  contractAddress: string;
  symbol: string;
}

type DestinationPair = NonNullable<
  NonNullable<NexusOneConfig["prefill"]>["destination"]
>;

const tokenAddresses = TOKEN_CONTRACT_ADDRESSES as Record<
  string,
  Partial<Record<number, Address>>
>;

function getReceiveTokenAddress(
  chainId: number,
  symbol: string
): Address | undefined {
  if (symbol.toLowerCase() === "ctusd") {
    return findCitreaReceiveToken({ chainId, symbol })?.contractAddress as
      | Address
      | undefined;
  }

  return tokenAddresses[symbol.toUpperCase()]?.[chainId];
}

function getPreferredDestinationPair(
  chainSlug: string,
  chainId: number,
  fallbackSymbol: string
): DestinationPair | undefined {
  const preferredSymbols = Array.from(
    new Set([
      DESTINATION_TOKEN_BY_CHAIN_SLUG[chainSlug] ?? "USDC",
      fallbackSymbol,
      "USDC",
      "USDT",
      "USDM",
    ])
  );

  for (const symbol of preferredSymbols) {
    const token = getReceiveTokenAddress(chainId, symbol);
    if (token) {
      return { chain: chainId, token };
    }
  }
}

const FastBridgeShowcase = () => {
  const { address, isConnected, chainId } = useAccount();
  const chains = useChains();
  const { switchChain } = useSwitchChain();
  const { appConfig, chainSlug, setChain } = useRuntime();
  const [params, setParams] = useState(readBridgeParams());
  const [receiveAssetOverride, setReceiveAssetOverride] =
    useState<ReceiveAsset | null>(null);

  useEffect(() => {
    // Only fetch once on mount
    setParams(readBridgeParams());
  }, []);

  useEffect(() => {
    if (isConnected && chainId && switchChain) {
      const isSupported = chains.some((c) => c.id === chainId);
      if (!isSupported) {
        // Switch to Ethereum Mainnet (1) if the current chain is not supported
        switchChain({ chainId: 1 });
      }
    }
  }, [isConnected, chainId, chains, switchChain]);

  const receiveDestination = useMemo(() => {
    if (receiveAssetOverride?.chainId === appConfig.chainId) {
      return undefined;
    }

    return getPreferredDestinationPair(
      chainSlug,
      appConfig.chainId,
      appConfig.nexusPrimaryToken
    );
  }, [
    appConfig.chainId,
    appConfig.nexusPrimaryToken,
    chainSlug,
    receiveAssetOverride,
  ]);

  const nexusConfig = useMemo<NexusOneConfig>(() => {
    const prefill: NexusOneConfig["prefill"] = {};
    if (receiveDestination) {
      prefill.destination = receiveDestination;
    }
    if (params.amount) {
      prefill.amount = params.amount;
    }
    if (params.recipient) {
      prefill.recipient = params.recipient;
    }

    return {
      mode: "swap",
      prefill,
    };
  }, [params.amount, params.recipient, receiveDestination]);

  const handleReceiveAssetChange = useCallback(
    (asset: ReceiveAsset) => {
      setReceiveAssetOverride(asset);
      const slug = asset.chainId ? getChainSlugById(asset.chainId) : undefined;
      if (slug && slug !== chainSlug) {
        setChain(slug);
      }
    },
    [chainSlug, setChain]
  );

  return (
    <PreviewPanel>
      <NexusOne
        config={nexusConfig}
        connectedAddress={address}
        onReceiveAssetChange={handleReceiveAssetChange}
      />
    </PreviewPanel>
  );
};

export default FastBridgeShowcase;
