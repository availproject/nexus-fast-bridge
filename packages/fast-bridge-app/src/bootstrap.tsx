import ReactDOM from "react-dom/client";
import App from "./app";
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

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element with id 'root' was not found.");
  }

  ReactDOM.createRoot(rootElement).render(<App />);
}
