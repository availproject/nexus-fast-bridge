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

import { NexusInitializer } from "@/components/NexusInitializer";

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentTab =
    location.pathname === "/opportunities" ? "opportunities" : "fastbridge";

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
              ]}
              activeTab={currentTab}
              onTabChange={(tabId) =>
                navigate(tabId === "opportunities" ? "/opportunities" : "/")
              }
            />
          </div>
          {/* Keep both components mounted, hide inactive one */}
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
