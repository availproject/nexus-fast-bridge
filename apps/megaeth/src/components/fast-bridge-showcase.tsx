"use client";
import { useAccount } from "wagmi";
import { ConnectKitButton } from "connectkit";
import FastBridge from "./fast-bridge/fast-bridge";
import { PreviewPanel } from "./walletConnect";
import { readBridgeParams } from "@/lib/url-params";
import { useEffect, useState } from "react";

const FastBridgeShowcase = () => {
  const { address, isConnected } = useAccount();
  const [params, setParams] = useState(readBridgeParams());

  useEffect(() => {
    // Only fetch once on mount
    setParams(readBridgeParams());
  }, []);

  return (
    <PreviewPanel>
      <ConnectKitButton.Custom>
        {({ show }) => (
          <FastBridge
            connectedAddress={address}
            isWalletConnected={isConnected}
            onConnectWallet={show}
            prefill={{
              token: params.token as any,
              chainId: params.to as any,
              amount: params.amount,
              recipient: params.recipient,
            }}
          />
        )}
      </ConnectKitButton.Custom>
    </PreviewPanel>
  );
};

export default FastBridgeShowcase;
