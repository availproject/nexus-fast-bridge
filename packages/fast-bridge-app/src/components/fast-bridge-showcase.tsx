"use client";
import { useAppKit } from "@reown/appkit/react";
import { useCallback, useMemo, useState } from "react";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { getChainSlugById, getChainSlugByName } from "@/config/chain-settings";
import { readBridgeParams } from "../lib/url-params";
import { useRuntime } from "../providers/runtime-context";
import ArcAppBanner from "./arc-app-banner";
import {
  SUPPORTED_CHAINS,
  TOKEN_CONTRACT_ADDRESSES,
} from "./common/utils/constant";
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
  chainName?: string;
  contractAddress: string;
  symbol: string;
}

type DestinationPair = NonNullable<
  NonNullable<NexusOneConfig["prefill"]>["destination"]
>;

const ARC_USDC_DESTINATION_PAIR: DestinationPair = {
  chain: SUPPORTED_CHAINS.ARC,
  token: "0x0000000000000000000000000000000000000000",
};

const tokenAddresses = TOKEN_CONTRACT_ADDRESSES as Record<
  string,
  Partial<Record<number, Address>>
>;

function getReceiveAssetKey(asset: ReceiveAsset | null): string {
  if (!asset) {
    return "";
  }
  return `${asset.chainId ?? asset.chainName ?? "unknown"}:${asset.contractAddress.toLowerCase()}:${asset.symbol.toUpperCase()}`;
}

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
  const { address } = useAccount();
  const { open } = useAppKit();
  const { appConfig, chainSlug, setChain } = useRuntime();
  const [params] = useState(() => readBridgeParams());
  const [receiveAssetOverride, setReceiveAssetOverride] =
    useState<ReceiveAsset | null>(null);

  const isAppRoute =
    chainSlug === "app" ||
    (typeof window !== "undefined" &&
      (window.location.pathname === "/app" ||
        window.location.pathname === "/app/" ||
        window.location.pathname === "/app.html"));

  const receiveAssetOverrideKey = useMemo(
    () => getReceiveAssetKey(receiveAssetOverride),
    [receiveAssetOverride]
  );

  const receiveDestination = useMemo(() => {
    if (receiveAssetOverrideKey) {
      return undefined;
    }

    if (isAppRoute) {
      return ARC_USDC_DESTINATION_PAIR;
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
    isAppRoute,
    receiveAssetOverrideKey,
  ]);

  const nexusConfig = useMemo<NexusOneConfig>(() => {
    const prefill: NexusOneConfig["prefill"] = {};
    if (receiveDestination) {
      prefill.destination = receiveDestination;
    }
    if (!isAppRoute) {
      if (params.amount) {
        prefill.amount = params.amount;
      }
      if (params.recipient) {
        prefill.recipient = params.recipient;
      }
    }

    return {
      mode: "swap",
      prefill,
    };
  }, [isAppRoute, params.amount, params.recipient, receiveDestination]);

  const handleReceiveAssetChange = useCallback(
    (asset: ReceiveAsset) => {
      setReceiveAssetOverride((current) =>
        getReceiveAssetKey(current) === getReceiveAssetKey(asset)
          ? current
          : asset
      );
      if (!isAppRoute) {
        const slug =
          (asset.chainId ? getChainSlugById(asset.chainId) : undefined) ??
          getChainSlugByName(asset.chainName);
        if (slug && slug !== chainSlug) {
          setChain(slug);
        }
      }
    },
    [chainSlug, isAppRoute, setChain]
  );

  return (
    <PreviewPanel>
      <div className="fastbridge-showcase-container">
        {isAppRoute ? <ArcAppBanner /> : null}
        <NexusOne
          config={nexusConfig}
          connectedAddress={address}
          onConnectWallet={() => {
            open({ view: "Connect" });
          }}
          onReceiveAssetChange={handleReceiveAssetChange}
        />
      </div>
    </PreviewPanel>
  );
};

export default FastBridgeShowcase;
