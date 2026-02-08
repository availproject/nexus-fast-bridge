"use client";

import * as React from "react";
import { LoaderPinwheel } from "lucide-react";
import type { EthereumProvider } from "@fastbridge/nexus-adapter";
import { toast } from "sonner";

import { useNexus } from "./nexus-provider";
import { Button } from "@/components/ui/button";

type WalletStatus =
  | "connected"
  | "connecting"
  | "reconnecting"
  | "disconnected"
  | string;

interface WalletConnectorLike {
  getProvider?: () => Promise<unknown>;
}

interface PreviewPanelProps {
  children: React.ReactNode;
  chainGifUrl: string;
  chainGifAlt: string;
  heroText: string;
  wallet: {
    status: WalletStatus;
    connector?: WalletConnectorLike | null;
    address?: string;
  };
}

export function PreviewPanel({
  children,
  chainGifUrl,
  chainGifAlt,
  heroText,
  wallet,
}: Readonly<PreviewPanelProps>) {
  const [loading, setLoading] = React.useState(false);
  const [initError, setInitError] = React.useState<string | null>(null);
  const [isInitializing, setIsInitializing] = React.useState(true);
  const { status, connector, address } = wallet;
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
    if (loading || nexusSDK) return;

    setLoading(true);
    setInitError(null);

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Nexus initialization timed out after 30 seconds"));
      }, 30_000);
    });

    try {
      const provider = (await connector?.getProvider()) as EthereumProvider;
      if (!provider) {
        throw new Error("No provider available");
      }
      await Promise.race([handleInit(provider), timeoutPromise]);
    } catch (error) {
      console.error("Nexus initialization failed:", error);
      const errorMessage = (error as Error)?.message || "Unknown error";
      setInitError(errorMessage);
      toast.error(`Failed to initialize Nexus: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [connector, handleInit, loading, nexusSDK]);

  React.useEffect(() => {
    if (status === "connected" || status === "disconnected") {
      const timer = setTimeout(() => {
        setIsInitializing(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [status]);

  React.useEffect(() => {
    if (status === "disconnected" && nexusSDK) {
      void deinitializeNexus();
      setIntent(null);
      setAllowance(null);
      prevAddressRef.current = undefined;
    }
  }, [status, nexusSDK, deinitializeNexus, setIntent, setAllowance]);

  React.useEffect(() => {
    if (status === "connected" && address && address !== prevAddressRef.current) {
      const previousAddress = prevAddressRef.current;
      const currentAddress = address;
      prevAddressRef.current = address;

      if (nexusSDK && previousAddress !== undefined) {
        void deinitializeNexus().then(() => {
          setTimeout(() => {
            if (
              currentAddress === prevAddressRef.current &&
              !loading &&
              !initError
            ) {
              void initializeNexus();
            }
          }, 100);
        });
      }
    } else if (status === "connected" && address && !prevAddressRef.current) {
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

  React.useEffect(() => {
    if (
      status === "connected" &&
      !nexusSDK &&
      !loading &&
      !initError &&
      address &&
      connector
    ) {
      void initializeNexus();
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

  const showLoading =
    isInitializing ||
    nexusLoading ||
    (status === "connected" && !nexusSDK && loading);

  return (
    <div className="flex items-center justify-center min-h-[400px] relative">
      {showLoading ? (
        <div className="flex flex-col items-center gap-2">
          <LoaderPinwheel className="size-6 animate-spin" />
          <span>Initializing Avail Nexus...</span>
          <div>
            <span>You may need to sign a message in your wallet to continue.</span>
          </div>
        </div>
      ) : status === "connected" && nexusSDK ? (
        <>{children}</>
      ) : status === "connected" && !nexusSDK && initError ? (
        <div className="text-center">
          <p className="text-red-600 mb-4">
            Failed to initialize Nexus: {initError}
          </p>
          <Button onClick={() => void initializeNexus()}>
            Retry Initialize Nexus
          </Button>
        </div>
      ) : status !== "connected" ? (
        <div className="text-center px-4">
          <img
            src={chainGifUrl}
            alt={chainGifAlt}
            className="mb-4 mx-auto rounded-lg w-full max-w-[200px] sm:max-w-[300px] md:max-w-[400px] h-auto"
          />
          <div
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 px-2"
            style={{ lineHeight: "1.2", marginTop: "4rem" }}
          >
            {heroText}
          </div>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 px-2">
            Please connect your wallet to use the fast bridge.
          </p>
        </div>
      ) : null}
    </div>
  );
}
