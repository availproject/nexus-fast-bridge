"use client";
import { useAppKit } from "@reown/appkit/react";
import { useEffect, useState } from "react";
import { useAccount, useChains, useSwitchChain } from "wagmi";
import { readBridgeParams } from "../lib/url-params";
import FastBridge from "./fast-bridge/fast-bridge";
import { PreviewPanel } from "./wallet-connect";

const FastBridgeShowcase = () => {
  const { address, isConnected, chainId } = useAccount();
  const chains = useChains();
  const { switchChain } = useSwitchChain();
  const [params, setParams] = useState(readBridgeParams());

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

  const { open } = useAppKit();

  return (
    <PreviewPanel>
      <FastBridge
        connectedAddress={address}
        isWalletConnected={isConnected}
        onConnectWallet={() => {
          open({ view: "Connect" });
        }}
        prefill={{
          token: params.token as
            | import("@avail-project/nexus-core").SUPPORTED_TOKENS
            | undefined,
          chainId: params.to as
            | import("@avail-project/nexus-core").SUPPORTED_CHAINS_IDS
            | undefined,
          amount: params.amount,
          recipient: params.recipient,
        }}
      />
    </PreviewPanel>
  );
};

export default FastBridgeShowcase;
