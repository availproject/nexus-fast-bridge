"use client";
import * as React from "react";
import type { EthereumProvider } from "@avail-project/nexus-core";
import { useAccount } from "wagmi";
import { useNexus } from "./nexus/NexusProvider";
import { toast } from "sonner";

interface PreviewPanelProps {
  children: React.ReactNode;
}

export function PreviewPanel({ children }: Readonly<PreviewPanelProps>) {
  const [loading, setLoading] = React.useState(false);
  const [initError, setInitError] = React.useState<string | null>(null);
  const { status, connector, address } = useAccount();
  const { nexusSDK, handleInit, deinitializeNexus, setIntent, setAllowance } =
    useNexus();
  const prevAddressRef = React.useRef<string | undefined>(address);
  const hasAttemptedInitRef = React.useRef<boolean>(false);

  const initializeNexus = React.useCallback(async () => {
    if (loading || nexusSDK) return; // Prevent multiple calls

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
      }, 30000); // 30 second timeout
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
        typeof provider?.request === "function",
      );

      if (!provider) {
        throw new Error("No provider available from connector");
      }

      if (typeof provider.request !== "function") {
        throw new Error(
          "Provider does not have a request method (not EIP-1193 compliant)",
        );
      }

      console.log("[Nexus Init] Provider validated, calling handleInit...");

      const originalRequest = provider.request.bind(provider);
      provider.request = async (args: { method: string; params?: any[] }) => {
        const methodToCall = args.method;
        const callArgs = { ...args, method: methodToCall };

        if (methodToCall === "eth_sendTransaction" && Array.isArray(callArgs.params) && callArgs.params.length > 0) {
          const txParam = { ...callArgs.params[0] };
          if (txParam && typeof txParam === "object") {
            // Backpack wallet strictly requires Type 2 transactions (EIP-1559)
            if (txParam.gasPrice) {
              txParam.maxFeePerGas = txParam.maxFeePerGas || txParam.gasPrice;
              txParam.maxPriorityFeePerGas = txParam.maxPriorityFeePerGas || txParam.gasPrice;
              delete txParam.gasPrice;
            }
            // Ensure both EIP-1559 fields exist if one does
            if (txParam.maxFeePerGas && !txParam.maxPriorityFeePerGas) {
              txParam.maxPriorityFeePerGas = txParam.maxFeePerGas;
            }
            callArgs.params = [txParam, ...callArgs.params.slice(1)];
          }
        }

        if (
          methodToCall === "personal_sign" &&
          Array.isArray(callArgs.params)
        ) {
          callArgs.params = callArgs.params.map((param) => {
            // Convert any string param that doesn't start with 0x into hex (required for Phantom EVM)
            if (typeof param === "string" && !param.startsWith("0x")) {
              try {
                if (typeof Buffer !== "undefined") {
                  return "0x" + Buffer.from(param, "utf8").toString("hex");
                }
                return (
                  "0x" +
                  Array.from(new TextEncoder().encode(param))
                    .map((b) => b.toString(16).padStart(2, "0"))
                    .join("")
                );
              } catch (e) {
                return param;
              }
            }
            return param;
          });
        }

        try {
          const response = await originalRequest(callArgs);

          return response;
        } catch (error) {
          throw error;
        }
      };

      try {
        // Race between initialization and timeout using the intercepted provider
        await Promise.race([handleInit(provider), timeoutPromise]);
      } catch (err: any) {
        throw err;
      }

      console.log("[Nexus Init] Initialization successful!");
    } catch (error) {
      console.error("[Nexus Init] Initialization failed:", error);
      const errorMessage = (error as Error)?.message || "Unknown error";
      setInitError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [connector, handleInit, loading, nexusSDK]);

  // Handle wallet disconnection - clear Nexus state and balances
  React.useEffect(() => {
    if (status === "disconnected" && nexusSDK) {
      deinitializeNexus();
      setIntent(null);
      setAllowance(null);
      prevAddressRef.current = undefined;
    }
    if (status === "disconnected") {
      setInitError(null);
      hasAttemptedInitRef.current = false;
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
      hasAttemptedInitRef.current = false;

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
              !initError &&
              !hasAttemptedInitRef.current
            ) {
              hasAttemptedInitRef.current = true;
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
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (
      status === "connected" &&
      !nexusSDK &&
      !loading &&
      !initError &&
      !hasAttemptedInitRef.current &&
      address &&
      connector
    ) {
      timeoutId = setTimeout(() => {
        hasAttemptedInitRef.current = true;
        initializeNexus();
      }, 500);
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
  ]);

  return (
    <div className="flex items-center justify-center min-h-[400px] relative">
      {children}
    </div>
  );
}
