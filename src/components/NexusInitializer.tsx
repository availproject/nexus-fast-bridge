"use client";
import * as React from "react";
import type { EthereumProvider } from "@avail-project/nexus-core";
import { useAccount } from "wagmi";
import { useNexus } from "./nexus/NexusProvider";
import { toast } from "sonner";

/**
 * NexusInitializer - Lives at App level to initialize Nexus once.
 * This component handles Nexus SDK initialization/deinitialization
 * based on wallet connection status. Since it's mounted at the App level,
 * it won't re-initialize when routes change.
 */
export function NexusInitializer({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = React.useState(false);
  const [initError, setInitError] = React.useState<string | null>(null);
  const { status, connector, address } = useAccount();
  const { nexusSDK, handleInit, deinitializeNexus } = useNexus();
  const prevAddressRef = React.useRef<string | undefined>(undefined);
  const initializingRef = React.useRef(false);

  const initializeNexus = React.useCallback(async () => {
    // Prevent multiple simultaneous initialization attempts
    if (loading || nexusSDK || initializingRef.current) return;

    initializingRef.current = true;
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
      initializingRef.current = false;
    }
  }, [connector, handleInit, loading, nexusSDK]);

  // Handle wallet disconnection - clear Nexus state
  React.useEffect(() => {
    if (status === "disconnected" && nexusSDK) {
      deinitializeNexus();
      prevAddressRef.current = undefined;
      location.reload();
    } // reload page to free the resources
  }, [status, nexusSDK, deinitializeNexus]);

  // Handle account change - reinitialize Nexus when account address changes
  React.useEffect(() => {
    if (
      status === "connected" &&
      address &&
      address !== prevAddressRef.current
    ) {
      const previousAddress = prevAddressRef.current;
      prevAddressRef.current = address;

      // If account changed and Nexus is initialized, reinitialize with new account
      if (nexusSDK && previousAddress !== undefined) {
        deinitializeNexus().then(() => {
          setTimeout(() => {
            if (
              address === prevAddressRef.current &&
              !initializingRef.current
            ) {
              initializeNexus();
            }
          }, 100);
        });
      }
    } else if (status === "connected" && address && !prevAddressRef.current) {
      prevAddressRef.current = address;
    }
  }, [status, nexusSDK, address, initializeNexus, deinitializeNexus]);

  // Auto-initialize Nexus when wallet is connected (first time)
  React.useEffect(() => {
    if (
      status === "connected" &&
      !nexusSDK &&
      !loading &&
      !initError &&
      address &&
      !initializingRef.current
    ) {
      initializeNexus();
    }
  }, [status, nexusSDK, initError, address, initializeNexus, loading]);

  // Expose initialization state via context or just render children
  // The actual loading UI is handled by PreviewPanel
  return <>{children}</>;
}
