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

// Run cleanup before rendering
cleanupWalletConnectSubscription();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
