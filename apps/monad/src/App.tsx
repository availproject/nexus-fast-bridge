import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import Web3Provider from "@/providers/web3Provider";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/navbar";
import Home from "@/components/fast-bridge/fast-bridge";
import Opportunities from "@/pages/Opportunities";
import NexusProvider from "@/components/nexus/NexusProvider";
import { NexusInitializer } from "@/components/NexusInitializer";
import config from "../config";
import { SUPPORTED_CHAINS, type NexusNetwork } from "@avail-project/nexus-core";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { useAccount } from "wagmi";

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { address } = useAccount();

  const tabs = [
    { id: "fastbridge", label: "Fast Bridge" },
    { id: "opportunities", label: "Opportunities" },
  ];

  const activeTab = location.pathname.startsWith("/opportunities")
    ? "opportunities"
    : "fastbridge";

  const handleTabChange = (id: string) => {
    if (id === "fastbridge") navigate("/");
    else if (id === "opportunities") navigate("/opportunities");
  };

  return (
    <div className="font-sans min-h-screen overflow-x-hidden w-full flex flex-col">
      <Navbar />
      <div className="min-h-full flex-grow w-full max-w-full flex gap-4 md:gap-16 overflow-x-hidden relative">
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `radial-gradient(125% 125% at 50% 10%, #fff 50%, ${config.primaryColor} 125%)`,
          }}
        />
        <main className="flex flex-col flex-1 min-w-0 max-w-full px-4 py-12 gap-8 relative z-10">
          <div className="flex justify-center mb-8">
            <AnimatedTabs
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </div>

          <Routes>
            <Route
              path="/"
              element={
                <Home
                  connectedAddress={address!}
                  prefill={{
                    chainId: SUPPORTED_CHAINS.MONAD,
                    token: "USDC",
                  }}
                />
              }
            />
            <Route path="/opportunities" element={<Opportunities />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/monad">
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
