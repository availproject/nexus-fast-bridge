import { appConfig } from "@fastbridge/runtime";
import FastBridgeShowcase from "@/components/fast-bridge-showcase";
import HeroSection from "@/components/hero-section";
import Navbar from "@/components/navbar";
import NexusProvider from "@/components/nexus/nexus-provider";
import { Toaster } from "@/components/ui/sonner";
import Web3Provider from "@/providers/web3-provider";

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
            </main>
          </div>
        </div>
        <Toaster />
      </NexusProvider>
    </Web3Provider>
  );
}
