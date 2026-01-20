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

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

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
