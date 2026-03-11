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

        try {
          const response = await originalRequest(callArgs);
          
          if (methodToCall === "personal_sign" && typeof response === "string") {
            const MAGIC_BYTES = "6492649264926492649264926492649264926492649264926492649264926492";

            if (response.endsWith(MAGIC_BYTES)) {
              // The struct layout for ERC-6492 is: (address factory, bytes factoryCalldata, bytes originalSignature)
              // The data begins after the '0x' in a static/dynamic combined ABI layout.
              
              const dataHex = response.slice(2, -MAGIC_BYTES.length);
              
              // Extract the offset to the `originalSignature` parameter (the 3rd item in the tuple).
              // Tuple parameters: 
              // [0] address (32 bytes)
              // [1] offset to calldata (32 bytes)
              // [2] offset to originalSignature (32 bytes)
              
              const sigOffsetParamsOffset = 64 * 2; // 64 chars offset exactly covers index [0] and [1]
              const sigOffsetHex = dataHex.substring(sigOffsetParamsOffset, sigOffsetParamsOffset + 64);
              const sigOffsetChars = parseInt(sigOffsetHex, 16) * 2;
              
              // Read the dynamically sized bytes array at the `originalSignature` offset.
              // A bytes array is prefixed by its length.
              const sigLengthHex = dataHex.substring(sigOffsetChars, sigOffsetChars + 64);
              const sigLengthChars = parseInt(sigLengthHex, 16) * 2;
              
              const originalSigHex = dataHex.substring(sigOffsetChars + 64, sigOffsetChars + 64 + sigLengthChars);
              const finalSig = "0x" + originalSigHex;
              
              toast.success(`Unwrapped ERC-6492 Signature! Length: ${finalSig.length}`);
              return finalSig;
            }
          }
          
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
    if (
      status === "connected" &&
      !nexusSDK &&
      !loading &&
      !initError &&
      !hasAttemptedInitRef.current &&
      address &&
      connector
    ) {
      hasAttemptedInitRef.current = true;
      initializeNexus();
    }
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
