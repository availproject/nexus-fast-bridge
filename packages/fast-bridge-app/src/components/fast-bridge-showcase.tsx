"use client";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAccount, useChains, useSwitchChain } from "wagmi";
import { CHAIN_REGISTRY } from "@/config/chain-settings";
import { useRuntime } from "@/providers/runtime-context";
import { readBridgeParams, writeBridgeParams } from "../lib/url-params";
import { TOKEN_CONTRACT_ADDRESSES } from "./common/utils/constant";
import type { SwapTokenOption } from "./nexus-one/components/swap-asset-selector";
import { NexusOne } from "./nexus-one/nexus-one";
import { PreviewPanel } from "./wallet-connect";

const FastBridgeShowcase = () => {
  const { address, isConnected, chainId } = useAccount();
  const chains = useChains();
  const { switchChain } = useSwitchChain();
  const { setChain } = useRuntime();
  const location = useLocation();
  const [params, setParams] = useState(readBridgeParams());

  // biome-ignore lint/correctness/useExhaustiveDependencies: location is needed to trigger readBridgeParams on route updates
  useEffect(() => {
    setParams(readBridgeParams());
  }, [location]);

  useEffect(() => {
    if (isConnected && chainId && switchChain) {
      const isSupported = chains.some((c) => c.id === chainId);
      if (!isSupported) {
        // Switch to Ethereum Mainnet (1) if the current chain is not supported
        switchChain({ chainId: 1 });
      }
    }
  }, [isConnected, chainId, chains, switchChain]);

  const handleDestinationTokenChange = (token: SwapTokenOption) => {
    if (!token.chainId) {
      return;
    }
    const targetSlug = Object.values(CHAIN_REGISTRY).find(
      (c) => c.appConfig.chainId === token.chainId
    )?.slug;

    if (targetSlug) {
      // Update the route slug
      setChain(targetSlug);

      // Update URL query parameters
      const newParams = {
        ...params,
        to: token.chainId,
        token: token.symbol.toUpperCase(),
      } as typeof params;
      writeBridgeParams(newParams);
      setParams(newParams);
    }
  };

  const tokenAddress =
    params.token && params.to
      ? ((TOKEN_CONTRACT_ADDRESSES as Record<string, Record<number, string>>)[
          params.token.toUpperCase()
        ]?.[params.to] as `0x${string}`)
      : undefined;

  return (
    <PreviewPanel>
      <NexusOne
        config={{
          mode: "swap",
          prefill: {
            amount: params.amount,
            recipient: params.recipient,
            destination:
              params.to && tokenAddress
                ? {
                    chain: params.to,
                    token: tokenAddress,
                  }
                : undefined,
          },
        }}
        connectedAddress={address}
        onDestinationTokenChange={handleDestinationTokenChange}
      />
    </PreviewPanel>
  );
};

export default FastBridgeShowcase;
