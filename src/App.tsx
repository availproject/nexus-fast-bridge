import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import Web3Provider from "@/providers/web3Provider";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/navbar";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import NexusProvider from "@/components/nexus/NexusProvider";
import config from "../config";
import { type NexusNetwork } from "@avail-project/nexus-core";
import Home from "@/pages/Home";
import Opportunities from "@/pages/Opportunities";
import Positions from "@/pages/Positions";

import { NexusInitializer } from "@/components/NexusInitializer";
import { fromBytes, fromHex, toBytes, toHex } from "viem";
import Decimal from "decimal.js";
import { useAccount } from "wagmi";

// @ts-expect-error not intended
window.nexus = {
  fromHex,
  Decimal,
  fromBytes,
  toBytes,
  toHex,
};

function LandingPage() {
  return (
    <div className="font-sans min-h-screen overflow-x-hidden w-full">
      <Navbar />
      <div className="min-h-full w-full max-w-full flex gap-4 md:gap-16 overflow-x-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `radial-gradient(125% 125% at 50% 10%, #fff 50%, ${config.primaryColor} 125%)`,
          }}
        />
        <main className="flex flex-col flex-1 min-w-0 max-w-full px-4 py-12 gap-8 items-center justify-center">
          <div className="z-10 text-center px-4 max-w-4xl">
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
        </main>
      </div>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isConnected } = useAccount();

  const getCurrentTab = () => {
    if (location.pathname === "/opportunities") return "opportunities";
    if (location.pathname === "/positions") return "positions";
    return "fastbridge";
  };

  const currentTab = getCurrentTab();

  const handleTabChange = (tabId: string) => {
    if (tabId === "opportunities") navigate("/opportunities");
    else if (tabId === "positions") navigate("/positions");
    else navigate("/");
  };

  // Show landing page if wallet is not connected
  if (!isConnected) {
    return <LandingPage />;
  }

  return (
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
          <div className="z-10 flex justify-center">
            <AnimatedTabs
              tabs={[
                { id: "fastbridge", label: "FastBridge" },
                { id: "opportunities", label: "Opportunities" },
                { id: "positions", label: "Positions" },
              ]}
              activeTab={currentTab}
              onTabChange={handleTabChange}
            />
          </div>
          {/* Keep all components mounted, hide inactive ones */}
          <div
            style={{ display: currentTab === "fastbridge" ? "block" : "none" }}
          >
            <Home />
          </div>
          <div
            style={{
              display: currentTab === "opportunities" ? "block" : "none",
            }}
          >
            <Opportunities />
          </div>
          <div
            style={{ display: currentTab === "positions" ? "block" : "none" }}
          >
            <Positions />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Web3Provider>
        <NexusProvider
          config={{
            network: config.nexusNetwork as NexusNetwork,
            debug: true,
          }}
        >
          <NexusInitializer>
            <AppContent />
            <Toaster />
          </NexusInitializer>
        </NexusProvider>
      </Web3Provider>
    </BrowserRouter>
  );
}
