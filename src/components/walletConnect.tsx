"use client";
import * as React from "react";
import { LoaderPinwheel } from "lucide-react";
import type { EthereumProvider } from "@avail-project/nexus-core";
import { useAccount, useWalletClient } from "wagmi";
import { useNexus } from "./nexus/NexusProvider";
import { Button } from "./ui/button";
import { toast } from "sonner";
import config from "../../config";

interface WalletConnectWrapperProps {
  children: React.ReactNode;
}

export function WalletConnectWrapper({
  children,
}: Readonly<WalletConnectWrapperProps>) {
  const [loading, setLoading] = React.useState(false);
  const [initError, setInitError] = React.useState<string | null>(null);
  const { status } = useAccount();
  const { data: walletConnectClient } = useWalletClient();
  const { nexusSDK, handleInit } = useNexus();

  const initializeNexus = React.useCallback(async () => {
    if (loading || nexusSDK) return; // Prevent multiple calls

    setLoading(true);
    setInitError(null);

    try {
      const provider =
        walletConnectClient &&
        ({
          request: (args: unknown) => walletConnectClient.request(args as any),
        } as EthereumProvider);

      console.log("provider", provider);

      if (!provider) {
        throw new Error("No provider available");
      }

      await handleInit(provider);
    } catch (error) {
      console.error("Nexus initialization failed:", error);
      const errorMessage = (error as Error)?.message || "Unknown error";
      setInitError(errorMessage);
      toast.error(`Failed to initialize Nexus: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [walletConnectClient, handleInit, loading, nexusSDK]);

  // Auto-initialize Nexus when wallet is connected
  React.useEffect(() => {
    if (status === "connected" && !nexusSDK && !loading && !initError) {
      initializeNexus();
    }
  }, [status, nexusSDK, loading, initError, initializeNexus]);

  return (
    <div className="flex items-center justify-center min-h-[400px] relative">
      {status === "connected" && nexusSDK && <>{children}</>}
      {status === "connected" && !nexusSDK && loading && (
        <div className="flex items-center gap-2">
          <LoaderPinwheel className="size-6 animate-spin" />
          <span>Initializing Nexus...</span>
        </div>
      )}
      {status === "connected" && !nexusSDK && !loading && initError && (
        <div className="text-center">
          <p className="text-red-600 mb-4">
            Failed to initialize Nexus: {initError}
          </p>
          <Button onClick={initializeNexus}>Retry Initialize Nexus</Button>
        </div>
      )}
      {status !== "connected" && (
        <div className="text-center">
          <img
            src={config.chainGifUrl}
            alt={config.chainGifAlt}
            width={400}
            height={400}
            className="mb-4"
            style={{
              marginLeft: "auto",
              marginRight: "auto",
              borderRadius: "10px",
            }}
          />
          <div
            className="text-5xl font-bold mb-4"
            style={{ fontSize: "3.5rem", lineHeight: "2.4" }}
          >
            {config.heroText}
          </div>
          <p className="text-muted-foreground mb-4">
            Please connect your wallet using the button in the navbar to use the
            bridge.
          </p>
        </div>
      )}
    </div>
  );
}
