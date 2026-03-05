"use client";
import { ConnectKitButton } from "connectkit";
import { useAccount } from "wagmi";
import FastBridge from "./fast-bridge/fast-bridge";
import { PreviewPanel } from "./wallet-connect";

const FastBridgeShowcase = () => {
  const { address, isConnected } = useAccount();

  return (
    <PreviewPanel>
      <ConnectKitButton.Custom>
        {({ show }) => (
          <FastBridge
            connectedAddress={address}
            isWalletConnected={isConnected}
            onConnectWallet={show}
          />
        )}
      </ConnectKitButton.Custom>
    </PreviewPanel>
  );
};

export default FastBridgeShowcase;
