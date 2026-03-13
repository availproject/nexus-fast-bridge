"use client";
import { motion } from "motion/react";
import FastBridgeShowcase from "@/components/fast-bridge-showcase";
import HeroSection from "@/components/hero-section";
import Navbar from "@/components/navbar";
import NexusProvider from "@/components/nexus/nexus-provider";
import { Toaster } from "@/components/ui/sonner";
import { useRuntime } from "@/providers/runtime-context";
import Web3Provider from "@/providers/web3-provider";

export default function App() {
  const { appConfig, chainFeatures } = useRuntime();

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
            <div
              className="absolute inset-0 z-0"
              style={{
                background: `radial-gradient(125% 125% at 50% 10%, #fff 50%, ${appConfig.primaryColor} 125%)`,
              }}
            />
            <main className="flex min-w-0 max-w-full flex-1 flex-col gap-8 px-4 py-12">
              <HeroSection />
              <FastBridgeShowcase />
              {chainFeatures.pageDescription && (
                <div className="mx-auto mt-8 max-w-2xl text-center text-[#19191A]/80 text-sm leading-relaxed">
                  <p>{chainFeatures.pageDescription}</p>
                </div>
              )}
            </main>
          </div>
        </div>
        <Toaster />
        {chainFeatures.showSupportCta && chainFeatures.supportCtaHref && (
          <div className="sticky bottom-4 left-4 z-100 ml-4 flex flex-wrap items-center justify-start gap-3">
            <motion.a
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex min-h-11 items-center gap-2 rounded border border-[#19191A] bg-transparent px-[14px] py-2 font-medium text-[#19191A] text-sm no-underline transition-[transform,background-color,border-color,box-shadow] duration-200 hover:bg-[#19191A] hover:text-white focus-visible:bg-[#19191A] focus-visible:text-white md:justify-self-start"
              href={chainFeatures.supportCtaHref}
              initial={{ opacity: 0, x: -10 }}
              rel="noopener noreferrer"
              target="_blank"
              transition={{ delay: 0.85 }}
              whileHover={{
                scale: 1.05,
                y: -2,
              }}
              whileTap={{ scale: 0.98 }}
            >
              <span>
                {chainFeatures.supportCtaLine1 ?? "Reach out to us if"} <br />
                {chainFeatures.supportCtaLine2 ?? "you face any issues"}
              </span>
            </motion.a>
          </div>
        )}
      </NexusProvider>
    </Web3Provider>
  );
}
