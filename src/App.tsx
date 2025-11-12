import Web3Provider from "@/providers/web3Provider";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/navbar";
import HeroSection from "@/components/hero-section";
import FastBridgeShowcase from "@/components/fast-bridge-showcase";
import NexusProvider from "@/components/nexus/NexusProvider";
import config from "../config";
import { type NexusNetwork } from "@avail-project/nexus-core";

export default function App() {
  return (
    <Web3Provider>
      <NexusProvider
        config={{
          network: config.nexusNetwork as NexusNetwork,
          debug: true,
        }}
      >
        <div className="font-sans min-h-screen">
        <Navbar />
          <div className="min-h-full w-full flex gap-16">
            <div
              className="absolute inset-0 z-0"
              style={{
                background: `radial-gradient(125% 125% at 50% 10%, #fff 50%, ${config.primaryColor} 125%)`,
              }}
            />
            <main className="flex flex-col flex-1 px-4 py-12 gap-8">
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
