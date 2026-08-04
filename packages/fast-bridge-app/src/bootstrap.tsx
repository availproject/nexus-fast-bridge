import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./app";
import AboutPage from "./components/about-page";
import ContactPage from "./components/contact-page";
import FAQPage from "./components/faq-page";
import { GooglePageViewTracker } from "./components/google-page-view-tracker";
import GuidesPage from "./components/guides-page";
import TopCrossChainBridgesPage from "./components/guides-page/top-cross-chain-bridges";
import LandingPage from "./components/landing-page";
import { preloadReceiveTokens } from "./components/nexus-one/components/receive-asset-selector";
import { initPostHog } from "./lib/posthog";
import { loadLastChain, RuntimeProvider } from "./providers/runtime-context";
import { initGlobalAppKit } from "./providers/web3-provider";
import "./index.css";

const cleanupWalletConnectSubscription = () => {
  try {
    const dbName = "WALLET_CONNECT_V2_INDEXED_DB";
    const deleteRequest = indexedDB.deleteDatabase(dbName);

    deleteRequest.onsuccess = () => {
      console.log(
        "[WalletConnect] Database deleted successfully, will be recreated fresh"
      );
    };

    deleteRequest.onerror = () => {
      console.debug(
        "[WalletConnect] Database deletion failed or DB doesn't exist"
      );
    };

    deleteRequest.onblocked = () => {
      console.debug("[WalletConnect] Database deletion blocked, may be in use");
    };
  } catch (error) {
    console.debug("[WalletConnect] Cleanup skipped:", error);
  }
};

export function bootstrapApp() {
  // Warm the shared Li.quest token cache before wallet and analytics startup.
  // Later callers reuse the same in-memory data or in-flight request.
  preloadReceiveTokens();
  initGlobalAppKit();
  initPostHog();
  cleanupWalletConnectSubscription();

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element with id 'root' was not found.");
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <GooglePageViewTracker />
        <Routes>
          <Route element={<LandingPage />} path="/" />
          <Route element={<AboutPage />} path="/about" />
          <Route element={<AboutPage />} path="/about.html" />
          <Route element={<FAQPage />} path="/faqs" />
          <Route element={<FAQPage />} path="/faq" />
          <Route element={<ContactPage />} path="/contact" />
          <Route element={<GuidesPage />} path="/guides" />
          <Route element={<GuidesPage />} path="/guides.html" />
          <Route
            element={<TopCrossChainBridgesPage />}
            path="/guides/top-cross-chain-bridges"
          />
          <Route
            element={<TopCrossChainBridgesPage />}
            path="/guides/top-cross-chain-bridges/"
          />
          <Route
            element={<TopCrossChainBridgesPage />}
            path="/best-cross-chain-bridge-2026.html"
          />
          <Route
            element={<TopCrossChainBridgesPage />}
            path="/guides/best-cross-chain-bridge-2026"
          />
          <Route
            element={<Navigate replace to="/bnb-smart-chain" />}
            path="/bsc"
          />
          <Route
            element={
              <RuntimeProvider>
                <App />
              </RuntimeProvider>
            }
            path="/:chain"
          />
          <Route element={<RedirectToLastChain />} path="*" />
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
  );
}

function RedirectToLastChain() {
  const lastChain = loadLastChain();
  return <Navigate replace to={`/${lastChain}`} />;
}
