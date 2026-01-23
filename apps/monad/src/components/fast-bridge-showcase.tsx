"use client";
import { useAccount } from "wagmi";
import FastBridge from "./fast-bridge/fast-bridge";
import { PreviewPanel } from "./walletConnect";

const FastBridgeShowcase = () => {
  const { address } = useAccount();

  return (
    <PreviewPanel>
      <FastBridge connectedAddress={address as `0x${string}`} />
    </PreviewPanel>
  );
};

export default FastBridgeShowcase;