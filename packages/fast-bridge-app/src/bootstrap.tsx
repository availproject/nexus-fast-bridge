import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./app";
import LandingPage from "./components/landing-page";
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
        <Routes>
          <Route element={<LandingPage />} path="/" />
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
