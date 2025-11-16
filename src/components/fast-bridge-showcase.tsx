"use client";
import { useAccount } from "wagmi";
import FastBridge from "./fast-bridge/fast-bridge";
import { WalletConnectWrapper } from "./walletConnect";

const FastBridgeShowcase = () => {
  const { address } = useAccount();

  return (
    <WalletConnectWrapper>
      <FastBridge connectedAddress={address as `0x${string}`} />
    </WalletConnectWrapper>
  );
};

export default FastBridgeShowcase;
