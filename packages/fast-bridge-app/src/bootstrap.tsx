import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initPostHog } from "./lib/posthog";
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
  initPostHog();
  cleanupWalletConnectSubscription();

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
