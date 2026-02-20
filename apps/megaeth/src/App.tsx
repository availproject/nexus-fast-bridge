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
import HeroSection from "@/components/hero-section";
import FastBridgeShowcase from "@/components/fast-bridge-showcase";
import NexusProvider from "@/components/nexus/NexusProvider";
import config from "../config";
import { motion } from "motion/react";
import { NexusInitializer } from "@/components/NexusInitializer";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import Opportunities from "@/pages/Opportunities";
import Positions from "@/pages/Positions";
import { type NexusNetwork } from "@avail-project/nexus-core";

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: "fastbridge", label: "Fast Bridge" },
    { id: "opportunities", label: "Opportunities" },
    { id: "positions", label: "Positions" },
  ];

  const activeTab = location.pathname.startsWith("/opportunities")
    ? "opportunities"
    : location.pathname.startsWith("/positions")
      ? "positions"
      : "fastbridge";

  const handleTabChange = (id: string) => {
    if (id === "fastbridge") navigate("/");
    else if (id === "opportunities") navigate("/opportunities");
    else if (id === "positions") navigate("/positions");
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
                <>
                  <HeroSection />
                  <FastBridgeShowcase />
                </>
              }
            />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/positions" element={<Positions />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/megaeth">
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
          </NexusInitializer>
        </NexusProvider>
      </Web3Provider>
    </BrowserRouter>
  );
}
