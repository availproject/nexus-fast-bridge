import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// Clean up WalletConnect IndexedDB before app loads to prevent structure errors
const cleanupWalletConnectSubscription = () => {
  try {
    const dbName = "WALLET_CONNECT_V2_INDEXED_DB";

    // Delete the entire database to prevent structure errors
    const deleteRequest = indexedDB.deleteDatabase(dbName);

    deleteRequest.onsuccess = () => {
      console.log(
        "[WalletConnect] Database deleted successfully, will be recreated fresh",
      );
    };

    deleteRequest.onerror = () => {
      console.debug(
        "[WalletConnect] Database deletion failed or DB doesn't exist",
      );
    };

    deleteRequest.onblocked = () => {
      console.debug("[WalletConnect] Database deletion blocked, may be in use");
    };
  } catch (error) {
    // Ignore errors - this is a cleanup operation
    console.debug("[WalletConnect] Cleanup skipped:", error);
  }
};

// Run cleanup before rendering
cleanupWalletConnectSubscription();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
