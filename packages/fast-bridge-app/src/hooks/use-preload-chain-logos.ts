import { useEffect } from "react";
import { CHAIN_REGISTRY } from "@/config/chain-settings";

/**
 * Preloads all chain logo images into the browser cache on mount.
 * This prevents the ~2s flicker when switching chains by ensuring
 * every logo is already cached before it's needed in the navbar.
 */
export function usePreloadChainLogos(): void {
  useEffect(() => {
    const urls = Object.values(CHAIN_REGISTRY)
      .map((chain) => chain.appConfig.chainLogoUrl)
      .filter(Boolean);

    for (const url of urls) {
      const img = new Image();
      img.src = url;
    }
  }, []);
}

export function usePreloadBackgroundImages(): void {
  useEffect(() => {
    const urls = Object.values(CHAIN_REGISTRY)
      .map((chain) => chain.appConfig.backgroundImageUrl)
      .filter(Boolean);

    for (const url of urls) {
      const img = new Image();
      img.src = url;
    }
  }, []);
}

export function usePreloadMascotImages(): void {
  useEffect(() => {
    const urls = Object.values(CHAIN_REGISTRY)
      .map((chain) => chain.chainFeatures.mascotImageUrl)
      .filter(Boolean) as string[];

    for (const url of urls) {
      const img = new Image();
      img.src = url;
    }
  }, []);
}
