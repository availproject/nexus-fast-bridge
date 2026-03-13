"use client";
import type { EthereumProvider } from "@avail-project/nexus-core";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { useRuntime } from "@/providers/runtime-context";
import { useNexus } from "./nexus/nexus-provider";

interface PreviewPanelProps {
  children: ReactNode;
}

export function PreviewPanel({ children }: Readonly<PreviewPanelProps>) {
  const { chainFeatures } = useRuntime();
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const { status, connector, address } = useAccount();
  const { nexusSDK, handleInit, deinitializeNexus, setIntent, setAllowance } =
    useNexus();
  const prevAddressRef = useRef<string | undefined>(address);

  const initializeNexus = useCallback(async () => {
    if (loading || nexusSDK) {
      return; // Prevent multiple calls
    }

    console.log("[Nexus Init] Starting initialization...");
    console.log("[Nexus Init] Connector:", connector);
    console.log("[Nexus Init] Connector name:", connector?.name);
    console.log("[Nexus Init] Connector type:", connector?.type);

    setLoading(true);
    setInitError(null);

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Nexus initialization timed out after 30 seconds"));
      }, 30_000); // 30 second timeout
    });

    try {
      if (!connector) {
        throw new Error("No connector available");
      }

      console.log("[Nexus Init] Getting provider from connector...");
      const provider = (await connector.getProvider()) as EthereumProvider;

      console.log("[Nexus Init] Provider:", provider);
      console.log("[Nexus Init] Provider type:", typeof provider);
      console.log(
        "[Nexus Init] Provider has request:",
        typeof provider?.request === "function"
      );

      if (!provider) {
        throw new Error("No provider available from connector");
      }

      if (typeof provider.request !== "function") {
        throw new Error(
          "Provider does not have a request method (not EIP-1193 compliant)"
        );
      }

      console.log("[Nexus Init] Provider validated, calling handleInit...");

      // Race between initialization and timeout
      await Promise.race([handleInit(provider), timeoutPromise]);

      console.log("[Nexus Init] Initialization successful!");
    } catch (error) {
      console.error("[Nexus Init] Initialization failed:", error);
      const errorMessage = (error as Error)?.message || "Unknown error";
      setInitError(errorMessage);
      toast.error(`Failed to initialize Nexus: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [connector, handleInit, loading, nexusSDK]);

  // Handle wallet disconnection - clear Nexus state and balances
  useEffect(() => {
    if (status === "disconnected" && nexusSDK) {
      deinitializeNexus();
      setIntent(null);
      setAllowance(null);
      prevAddressRef.current = undefined;
    }
    if (status === "disconnected") {
      setInitError(null);
    }
  }, [status, nexusSDK, deinitializeNexus, setIntent, setAllowance]);

  // Handle account change - reinitialize Nexus when account address changes
  useEffect(() => {
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
    loading,
  ]);

  // Auto-initialize Nexus when wallet is connected and address is available
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;
    if (
      status === "connected" &&
      !nexusSDK &&
      !loading &&
      !initError &&
      address &&
      connector
    ) {
      const delayMs = chainFeatures.walletInitDelayMs ?? 0;
      if (delayMs > 0) {
        timeoutId = setTimeout(() => {
          initializeNexus();
        }, delayMs);
      } else {
        initializeNexus();
      }
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    status,
    nexusSDK,
    initError,
    address,
    connector,
    initializeNexus,
    loading,
    chainFeatures.walletInitDelayMs,
  ]);

  return (
    <div className="relative flex min-h-[400px] items-center justify-center">
      {children}
    </div>
  );
}
