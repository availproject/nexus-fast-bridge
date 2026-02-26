"use client";
import { useAccount } from "wagmi";
import { ConnectKitButton } from "connectkit";
import FastBridge from "./fast-bridge/fast-bridge";
import { PreviewPanel } from "./walletConnect";

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
