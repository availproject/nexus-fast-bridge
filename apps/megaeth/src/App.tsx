import Web3Provider from "@/providers/web3Provider";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/navbar";
import HeroSection from "@/components/hero-section";
import FastBridgeShowcase from "@/components/fast-bridge-showcase";
import NexusProvider from "@/components/nexus/NexusProvider";
import config from "../config";
import { motion } from "motion/react";

// @ts-expect-error - Environment is not exported from @avail-project/nexus-core
enum Environment {
  FOLLY, // Dev with test-net tokens
  CERISE, // Dev with main-net tokens
  CORAL, // Test-net with main-net tokens
  JADE, // Main-net with main-net tokens
}

export default function App() {
  return (
    <Web3Provider>
      <NexusProvider
        config={{
          // network: {
          //   NETWORK_HINT: Environment.CERISE,
          //   COSMOS_GRPC_URL: "https://debugnet.availproject.org/grpc-web/",
          //   COSMOS_REST_URL: "https://debugnet.availproject.org",
          //   COSMOS_RPC_URL: "https://debugnet.availproject.org:26650",
          //   COSMOS_WS_URL: "wss://debugnet.availproject.org:26650/websocket",
          //   INTENT_EXPLORER_URL:
          //     "https://explorer.nexus-cerise.availproject.org",
          //   VSC_BASE_URL: "https://vsc-debugnet.availproject.org",
          //   VSC_WS_URL: "wss://vsc-debugnet.availproject.org",
          // },
          network: "mainnet",
          debug: true,
        }}
      >
        <div className="font-sans min-h-screen overflow-x-hidden w-full">
          <Navbar />
          <div className="min-h-full w-full max-w-full flex gap-4 md:gap-16 overflow-x-hidden">
            <div
              className="absolute inset-0 z-0"
              style={{
                background: `radial-gradient(125% 125% at 50% 10%, #fff 50%, ${config.primaryColor} 125%)`,
              }}
            />
            <main className="flex flex-col flex-1 min-w-0 max-w-full px-4 py-12 gap-8">
              <HeroSection />
              <FastBridgeShowcase />
            </main>
          </div>
        </div>
        <Toaster />
        <div className="sticky z-100 bottom-4 left-4 ml-4 flex flex-wrap items-center justify-start gap-3">
          <motion.a
            href="https://discord.com/invite/AvailProject"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded gap-2 border border-[#19191A] bg-transparent px-[14px] py-2 text-sm font-medium text-[#19191A] no-underline transition-[transform,background-color,border-color,box-shadow] duration-200 md:justify-self-start hover:bg-[#19191A] hover:text-white focus-visible:bg-[#19191A] focus-visible:text-white"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.85 }}
            whileHover={{
              scale: 1.05,
              y: -2,
            }}
            whileTap={{ scale: 0.98 }}
          >
            <span>
              Reach out to us if <br /> you face any issues
            </span>
          </motion.a>
        </div>
      </NexusProvider>
    </Web3Provider>
  );
}
