"use client";
import * as React from "react";
import { LoaderPinwheel } from "lucide-react";
import { useAccount } from "wagmi";
import { useNexus } from "./nexus/NexusProvider";
import config from "../../config";

interface PreviewPanelProps {
  children: React.ReactNode;
}

/**
 * PreviewPanel - UI wrapper that displays loading state or children.
 * Nexus initialization is handled by NexusInitializer at App level.
 * This component only checks if Nexus is ready, no local state that resets on remount.
 */
export function PreviewPanel({ children }: Readonly<PreviewPanelProps>) {
  const { status } = useAccount();
  const { nexusSDK, loading: nexusLoading } = useNexus();

  // Only show loading if wallet is connected but Nexus is still loading
  // Don't show loading if nexusSDK already exists (already initialized)
  const showLoading = status === "connected" && !nexusSDK && nexusLoading;

  return (
    <div className="flex items-center justify-center relative">
      {showLoading ? (
        <div className="flex flex-col items-center gap-2">
          <LoaderPinwheel className="size-6 animate-spin" />
          <span>Initializing Avail Nexus...</span>
          <div>
            <span>
              You may need to sign a message in your wallet to continue.
            </span>
          </div>
        </div>
      ) : status === "connected" && nexusSDK ? (
        <>{children}</>
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
            Please connect your wallet to use the fast bridge.
          </p>
        </div>
      ) : null}
    </div>
  );
}
