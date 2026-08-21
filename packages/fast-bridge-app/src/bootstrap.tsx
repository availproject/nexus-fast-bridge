import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { GooglePageViewTracker } from "./components/google-page-view-tracker";
import { initPostHog } from "./lib/posthog";
import { loadLastChain, RuntimeProvider } from "./providers/runtime-context";
import "./index.css";

const LandingPage = React.lazy(() => import("./components/landing-page"));
const AboutPage = React.lazy(() => import("./components/about-page"));
const FAQPage = React.lazy(() => import("./components/faq-page"));
const ContactPage = React.lazy(() => import("./components/contact-page"));
const GuidesPage = React.lazy(() => import("./components/guides-page"));
const GuideDetailPage = React.lazy(
  () => import("./components/guides-page/guide-detail")
);
const TopCrossChainBridgesPage = React.lazy(
  () => import("./components/guides-page/top-cross-chain-bridges")
);
const App = React.lazy(() => import("./app"));

let hasPrefetchedApp = false;
export function prefetchBridgeApp(): void {
  if (hasPrefetchedApp) {
    return;
  }
  hasPrefetchedApp = true;
  import("./app");
  import("./providers/web3-provider").then((m) => m.initGlobalAppKit?.());
  import("./components/nexus-one/components/receive-asset-selector").then((m) =>
    m.preloadReceiveTokens?.()
  );
}

export function bootstrapApp() {
  initPostHog();

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element with id 'root' was not found.");
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <GooglePageViewTracker />
        <Suspense fallback={null}>
          <Routes>
            <Route element={<LandingPage />} path="/" />
            <Route element={<AboutPage />} path="/about" />
            <Route element={<AboutPage />} path="/about.html" />
            <Route element={<FAQPage />} path="/faqs" />
            <Route element={<Navigate replace to="/faqs" />} path="/faq" />
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
            <Route element={<GuideDetailPage />} path="/guides/:slug" />
            <Route
              element={
                <RuntimeProvider>
                  <App />
                </RuntimeProvider>
              }
              path="/app"
            />
            <Route
              element={
                <RuntimeProvider>
                  <App />
                </RuntimeProvider>
              }
              path="/app.html"
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
        </Suspense>
      </BrowserRouter>
    </React.StrictMode>
  );
}

function RedirectToLastChain() {
  const lastChain = loadLastChain();
  return <Navigate replace to={`/${lastChain}`} />;
}
