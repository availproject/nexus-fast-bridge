import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { initPostHog } from "./lib/posthog";

initPostHog();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
