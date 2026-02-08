import { getChainRuntimeConfig, type ChainSlug } from "@fastbridge/chain-runtime-config";

import Web3Provider from "@/providers/web3Provider";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/navbar";
import HeroSection from "@/components/hero-section";
import FastBridgeShowcase from "@/components/fast-bridge-showcase";
import NexusProvider from "./nexus-provider";

interface AppShellProps {
  chainSlug: ChainSlug;
  primaryColor: string;
}

export default function AppShell({ chainSlug, primaryColor }: AppShellProps) {
  const runtimeConfig = getChainRuntimeConfig(chainSlug);

  return (
    <Web3Provider>
      <NexusProvider config={runtimeConfig.nexus}>
        <div className="font-sans min-h-screen overflow-x-hidden w-full">
          <Navbar />
          <div className="min-h-full w-full max-w-full flex gap-4 md:gap-16 overflow-x-hidden">
            <div
              className="absolute inset-0 z-0"
              style={{
                background: `radial-gradient(125% 125% at 50% 10%, #fff 50%, ${primaryColor} 125%)`,
              }}
            />
            <main className="flex flex-col flex-1 min-w-0 max-w-full px-4 py-12 gap-8">
              <HeroSection />
              <FastBridgeShowcase />
            </main>
          </div>
        </div>
        <Toaster />
      </NexusProvider>
    </Web3Provider>
  );
}
