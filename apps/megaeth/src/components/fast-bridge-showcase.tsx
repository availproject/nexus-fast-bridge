"use client";
import { useAccount } from "wagmi";
import FastBridge from "./fast-bridge/fast-bridge";
import { PreviewPanel } from "./walletConnect";
import { readBridgeParams } from "@/lib/url-params";
import { useAppKit } from "@reown/appkit/react";
import { useEffect, useState } from "react";

const FastBridgeShowcase = () => {
  const { address, isConnected } = useAccount();
  const [params, setParams] = useState(readBridgeParams());

  useEffect(() => {
    // Only fetch once on mount
    setParams(readBridgeParams());
  }, []);

  const { open } = useAppKit();

  return (
    <PreviewPanel>
      <FastBridge
        connectedAddress={address}
        isWalletConnected={isConnected}
        onConnectWallet={() => void open({ view: "Connect" })}
        prefill={{
          token: params.token as any,
          chainId: params.to as any,
          amount: params.amount,
          recipient: params.recipient,
        }}
      />
    </PreviewPanel>
  );
};

export default FastBridgeShowcase;
