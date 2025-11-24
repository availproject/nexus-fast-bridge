"use client";
import * as React from "react";
import { LoaderPinwheel } from "lucide-react";
import type { EthereumProvider } from "@avail-project/nexus-core";
import { useAccount } from "wagmi";
import { useNexus } from "./nexus/NexusProvider";
import { Button } from "./ui/button";
import { toast } from "sonner";
import config from "../../config";

interface PreviewPanelProps {
  children: React.ReactNode;
}

export function PreviewPanel({ children }: Readonly<PreviewPanelProps>) {
  const [loading, setLoading] = React.useState(false);
  const [initError, setInitError] = React.useState<string | null>(null);
  const [isInitializing, setIsInitializing] = React.useState(true);
  const { status, connector, address } = useAccount();
  const {
    nexusSDK,
    handleInit,
    deinitializeNexus,
    loading: nexusLoading,
    setIntent,
    setAllowance,
  } = useNexus();
  const prevAddressRef = React.useRef<string | undefined>(address);

  const initializeNexus = React.useCallback(async () => {
    if (loading || nexusSDK) return; // Prevent multiple calls

    setLoading(true);
    setInitError(null);

    try {
      const provider = (await connector?.getProvider()) as EthereumProvider;
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
  }, [connector, handleInit]);

  // Track initial connection check
  React.useEffect(() => {
    // Once we know the connection status, mark initialization as complete
    if (status === "connected" || status === "disconnected") {
      // Small delay to ensure status is stable
      const timer = setTimeout(() => {
        setIsInitializing(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Handle wallet disconnection - clear Nexus state and balances
  React.useEffect(() => {
    if (status === "disconnected" && nexusSDK) {
      deinitializeNexus();
      setIntent(null);
      setAllowance(null);
      prevAddressRef.current = undefined;
    }
  }, [status, nexusSDK, deinitializeNexus, setIntent, setAllowance]);

  // Handle account change - reinitialize Nexus when account address changes
  React.useEffect(() => {
    if (
      status === "connected" &&
      address &&
      address !== prevAddressRef.current
    ) {
      const previousAddress = prevAddressRef.current;
      const currentAddress = address;
      prevAddressRef.current = address;

      // If account changed and Nexus is initialized, reinitialize with new account
      if (nexusSDK && previousAddress !== undefined) {
        // Account changed - deinitialize and reinitialize
        deinitializeNexus().then(() => {
          // Small delay to ensure deinit completes, then reinitialize
          setTimeout(() => {
            // Check if still connected and address hasn't changed again
            if (
              currentAddress === prevAddressRef.current &&
              !loading &&
              !initError
            ) {
              initializeNexus();
            }
          }, 100);
        });
      }
    } else if (status === "connected" && address && !prevAddressRef.current) {
      // First connection - set the address
      prevAddressRef.current = address;
    }
  }, [
    status,
    nexusSDK,
    address,
    initError,
    initializeNexus,
    deinitializeNexus,
  ]);

  // Auto-initialize Nexus when wallet is connected (first time)
  React.useEffect(() => {
    if (
      status === "connected" &&
      !nexusSDK &&
      !loading &&
      !initError &&
      address
    ) {
      initializeNexus();
    }
  }, [status, nexusSDK, initError, address, initializeNexus]);

  // Show loading during initial connection check or Nexus initialization
  const showLoading =
    isInitializing ||
    nexusLoading ||
    (status === "connected" && !nexusSDK && loading);

  return (
    <div className="flex items-center justify-center min-h-[400px] relative">
      {showLoading ? (
        <div className="flex items-center gap-2">
          <LoaderPinwheel className="size-6 animate-spin" />
          <span>Initializing Nexus...</span>
        </div>
      ) : status === "connected" && nexusSDK ? (
        <>{children}</>
      ) : status === "connected" && !nexusSDK && initError ? (
        <div className="text-center">
          <p className="text-red-600 mb-4">
            Failed to initialize Nexus: {initError}
          </p>
          <Button onClick={initializeNexus}>Retry Initialize Nexus</Button>
        </div>
      ) : status !== "connected" ? (
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
            Please connect your wallet using the button in the navbar to use the
            bridge.
          </p>
        </div>
      ) : null}
    </div>
  );
}
