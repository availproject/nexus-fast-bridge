"use client";
import { AnimatePresence, motion } from "motion/react";
import FastBridgeShowcase from "@/components/fast-bridge-showcase";
import HeroSection from "@/components/hero-section";
import Navbar from "@/components/navbar";
import NexusProvider from "@/components/nexus/nexus-provider";
import { Toaster } from "@/components/ui/sonner";
import {
  usePreloadBackgroundImages,
  // usePreloadChainLogos,
  usePreloadMascotImages,
} from "@/hooks/use-preload-chain-logos";
import { useRuntime } from "@/providers/runtime-context";
import Web3Provider from "@/providers/web3-provider";

const SWEEP_LTR_CHAINS = new Set(["arbitrum", "monad"]);

export default function App() {
  const { appConfig, chainFeatures } = useRuntime();
  // usePreloadChainLogos();
  usePreloadBackgroundImages();
  usePreloadMascotImages();

  const isLTR = SWEEP_LTR_CHAINS.has(chainFeatures.slug);

  const sweepInitial = isLTR
    ? { WebkitMaskPositionX: "100%", maskPositionX: "100%" }
    : { WebkitMaskPositionY: "0%", maskPositionY: "0%" };

  const sweepAnimate = isLTR
    ? { WebkitMaskPositionX: "0%", maskPositionX: "0%" }
    : { WebkitMaskPositionY: "100%", maskPositionY: "100%" };

  const sweepMaskStyle = isLTR
    ? {
        WebkitMaskImage:
          "linear-gradient(to right, black 0%, black 40%, transparent 55%)",
        maskImage:
          "linear-gradient(to right, black 0%, black 40%, transparent 55%)",
        WebkitMaskSize: "300% 100%",
        maskSize: "300% 100%",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat" as const,
      }
    : {
        WebkitMaskImage:
          "linear-gradient(to top, black 0%, black 40%, transparent 55%)",
        maskImage:
          "linear-gradient(to top, black 0%, black 40%, transparent 55%)",
        WebkitMaskSize: "100% 300%",
        maskSize: "100% 300%",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat" as const,
      };

  return (
    <Web3Provider appConfig={appConfig}>
      <NexusProvider
        config={{
          network: "mainnet",
          debug: true,
        }}
      >
        <div className="min-h-screen w-full overflow-x-hidden font-sans">
          <Navbar />
          <div className="flex min-h-full w-full max-w-full gap-4 overflow-x-hidden md:gap-16">
            {/* Background: crossfade between images using opacity.
                CSS `transition: background` cannot tween between two image
                URLs — it only works on colors. Using two composited layers
                (old stays, new fades in on top) is GPU-accelerated and
                paint-free, so it's always smooth. */}
            <div className="absolute inset-0 z-0 overflow-hidden">
              <AnimatePresence mode="popLayout">
                <motion.div
                  animate={sweepAnimate}
                  className="absolute inset-0"
                  exit={{ opacity: 0 }}
                  initial={sweepInitial}
                  key={appConfig.backgroundImageUrl}
                  style={{
                    backgroundImage: `url(${appConfig.backgroundImageUrl})`,
                    backgroundPosition: "bottom",
                    backgroundSize: "cover",
                    backgroundRepeat: "no-repeat",
                    willChange: "mask-position",
                    ...sweepMaskStyle,
                  }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                />
              </AnimatePresence>
            </div>
            <main className="flex min-w-0 max-w-full flex-1 flex-col gap-8 px-4 py-12">
              <HeroSection />
              <FastBridgeShowcase />
              {chainFeatures.pageDescription && (
                <div className="mx-auto mt-8 hidden max-w-2xl text-center text-[#19191A]/80 text-sm leading-relaxed">
                  <p>{chainFeatures.pageDescription}</p>
                </div>
              )}
            </main>
          </div>
        </div>
        <Toaster />
        {/* Removed CTA from app.tsx root */}
      </NexusProvider>
    </Web3Provider>
  );
}
