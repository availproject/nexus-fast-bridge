import Web3Provider from "@/providers/web3Provider";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/navbar";
import HeroSection from "@/components/hero-section";
import FastBridgeShowcase from "@/components/fast-bridge-showcase";
import NexusProvider from "@/components/nexus/NexusProvider";
import config from "../config";
import { useEffect } from "react";

// @ts-expect-error - Environment is not exported from @avail-project/nexus-core
enum Environment {
  FOLLY, // Dev with test-net tokens
  CERISE, // Dev with main-net tokens
  CORAL, // Test-net with main-net tokens
  JADE, // Main-net with main-net tokens
}

export default function App() {
  // Clean up WalletConnect subscription on app load
  useEffect(() => {
    const cleanupWalletConnectSubscription = async () => {
      try {
        const dbName = "WALLET_CONNECT_V2_INDEXED_DB";
        const storeName = "keyvaluestorage";
        const keyToDelete = "wc@2:core:0.3:subscription";

        const request = indexedDB.open(dbName);

        request.onsuccess = () => {
          const db = request.result;

          if (!db.objectStoreNames.contains(storeName)) {
            db.close();
            return;
          }

          const transaction = db.transaction(storeName, "readwrite");
          const store = transaction.objectStore(storeName);

          // Check if the key exists before deleting
          const getRequest = store.get(keyToDelete);

          getRequest.onsuccess = () => {
            if (getRequest.result !== undefined) {
              store.delete(keyToDelete);
              console.log("[WalletConnect] Cleaned up stale subscription");
            }
          };

          transaction.oncomplete = () => {
            db.close();
          };
        };

        request.onerror = () => {
          // DB doesn't exist or error accessing it, ignore
        };
      } catch (error) {
        // Ignore errors - this is a cleanup operation
        console.debug("[WalletConnect] Cleanup skipped:", error);
      }
    };

    cleanupWalletConnectSubscription();
  }, []);

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
      </NexusProvider>
    </Web3Provider>
  );
}
