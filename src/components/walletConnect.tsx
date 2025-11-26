"use client";
import * as React from "react";
import { LoaderPinwheel } from "lucide-react";
import type { EthereumProvider } from "@avail-project/nexus-core";
import { useAccount, useConnectorClient } from "wagmi";
import { useNexus } from "./nexus/NexusProvider";
import { Button } from "./ui/button";
import { toast } from "sonner";
import config from "../../config";
import { useIsMobile } from "@/hooks/use-mobile";

interface PreviewPanelProps {
  children: React.ReactNode;
}

export function PreviewPanel({ children }: Readonly<PreviewPanelProps>) {
  const [initError, setInitError] = React.useState<string | null>(null);
  const { status, connector } = useAccount();
  const { data: walletClient } = useConnectorClient();
  const { nexusSDK, handleInit, loading: nexusLoading } = useNexus();
  const isMobile = useIsMobile();

  const initializeNexus = React.useCallback(async () => {
    if (nexusLoading || nexusSDK) return; // Prevent multiple calls
    setInitError(null);

    try {
      const mobileProvider = walletClient && {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        request: (args: unknown) => walletClient.request(args as any),
      };
      const desktopProvider = await connector?.getProvider();
      const effectiveProvider = isMobile ? mobileProvider : desktopProvider;
      if (!effectiveProvider) {
        throw new Error("No provider available");
      }

      await handleInit(effectiveProvider as EthereumProvider);
    } catch (error) {
      console.error("Nexus initialization failed:", error);
      const errorMessage = (error as Error)?.message || "Unknown error";
      setInitError(errorMessage);
      toast.error(`Failed to initialize Nexus: ${errorMessage}`);
    }
  }, [connector, handleInit]);

  // Show loading during initial connection check or Nexus initialization
  const showLoading =
    nexusLoading || (status === "connected" && !nexusSDK && nexusLoading);

  React.useEffect(() => {
    if (status === "connected" && !nexusSDK) {
      initializeNexus();
    }
  }, [status, nexusSDK, initializeNexus]);

  let panelContent: React.ReactNode = null;

  if (showLoading) {
    panelContent = (
      <div className="flex flex-col items-center gap-2">
        <LoaderPinwheel className="size-6 animate-spin" />
        <span>Initializing Avail Nexus...</span>
        <div>
          <span>
            You may need to sign a message in your wallet to continue.
          </span>
        </div>
      </div>
    );
  } else if (status === "connected" && nexusSDK) {
    panelContent = <>{children}</>;
  } else if (status === "connected" && !nexusSDK && initError) {
    panelContent = (
      <div className="text-center">
        <p className="text-red-600 mb-4">
          Failed to initialize Nexus: {initError}
        </p>
        <Button onClick={initializeNexus}>Retry Initialize Nexus</Button>
      </div>
    );
  } else if (status !== "connected") {
    panelContent = (
      <div className="text-center px-4">
        <img
          src={config.chainGifUrl}
          alt={config.chainGifAlt}
          className="mb-4 mx-auto rounded-lg w-full max-w-[200px] sm:max-w-[300px] md:max-w-[400px] h-auto"
        />
        <div
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 px-2"
          style={{ lineHeight: "1.2", marginTop: "4rem" }}
        >
          {config.heroText}
        </div>
        <p className="text-sm sm:text-base text-muted-foreground mb-4 px-2">
          Please connect your wallet to use the fast bridge.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px] relative">
      {panelContent}
    </div>
  );
}
