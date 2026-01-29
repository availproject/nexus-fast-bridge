import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// Clean up WalletConnect subscription before app loads
const cleanupWalletConnectSubscription = () => {
  try {
    const dbName = "WALLET_CONNECT_V2_INDEXED_DB";
    const storeName = "keyvaluestorage";
    const keyToDelete = "wc@2:core:0.3:subscription";

    const request = indexedDB.open(dbName);

    request.onsuccess = () => {
      const db = request.result;

      // Check if the object store exists before attempting any operations
      if (!db.objectStoreNames.contains(storeName)) {
        console.debug(
          "[WalletConnect] Object store not found, skipping cleanup",
        );
        db.close();
        return;
      }

      try {
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

        getRequest.onerror = () => {
          console.debug("[WalletConnect] Error reading key, skipping cleanup");
        };

        transaction.oncomplete = () => {
          db.close();
        };

        transaction.onerror = () => {
          console.debug("[WalletConnect] Transaction error, skipping cleanup");
          db.close();
        };
      } catch (txError) {
        console.debug("[WalletConnect] Transaction creation failed:", txError);
        db.close();
      }
    };

    request.onerror = () => {
      // DB doesn't exist or error accessing it, ignore
      console.debug("[WalletConnect] Database not found or error accessing it");
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
