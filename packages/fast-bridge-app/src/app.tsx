"use client";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import FastBridgeShowcase from "@/components/fast-bridge-showcase";
import MaintenanceBanner from "@/components/maintenance-banner";
import Navbar from "@/components/navbar";
import NexusProvider from "@/components/nexus/nexus-provider";
import { Toaster } from "@/components/ui/sonner";
import { useRuntime } from "@/providers/runtime-context";
import Web3Provider from "@/providers/web3-provider";

const NEXUS_PROVIDER_CONFIG = {
  debug: true,
  // this is place to switch between "canary" and "mainnet"
  network: "mainnet",
} as const;

function XSocialIcon() {
  return (
    <svg
      aria-hidden="true"
      height="14"
      viewBox="0 0 16 16"
      width="14"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12.18 1.5h2.36L9.39 7.39l6.06 8.11h-4.75L7.02 10.6l-4.26 4.9H.4l5.5-6.3L.1 1.5h4.87l3.35 4.43L12.18 1.5Zm-.83 12.6h1.31L4.7 2.82H3.3L11.35 14.1Z"
        fill="#1F1F1F"
      />
    </svg>
  );
}

function DiscordSocialIcon() {
  return (
    <svg
      aria-hidden="true"
      height="14"
      viewBox="0 0 20 16"
      width="18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16.93 1.27A16.36 16.36 0 0 0 12.86.01a.06.06 0 0 0-.06.03c-.18.31-.37.72-.5 1.04a15.1 15.1 0 0 0-4.6 0A10.5 10.5 0 0 0 7.2.04.06.06 0 0 0 7.14.01 16.4 16.4 0 0 0 3.07 1.27a.06.06 0 0 0-.03.02C.46 5.18-.24 8.97.1 12.72c0 .02.02.04.03.05a16.5 16.5 0 0 0 4.99 2.52.06.06 0 0 0 .07-.02c.38-.52.73-1.07 1.02-1.65a.06.06 0 0 0-.03-.08 11 11 0 0 1-1.56-.74.06.06 0 0 1-.01-.1c.1-.08.21-.16.31-.24a.06.06 0 0 1 .06 0 11.78 11.78 0 0 0 10.04 0 .06.06 0 0 1 .06 0c.1.08.21.17.31.24a.06.06 0 0 1-.01.1 10.4 10.4 0 0 1-1.56.74.06.06 0 0 0-.03.08c.3.58.65 1.13 1.02 1.65a.06.06 0 0 0 .07.02 16.46 16.46 0 0 0 4.99-2.52.06.06 0 0 0 .03-.05c.4-4.34-.68-8.1-2.93-11.43a.05.05 0 0 0-.03-.02ZM6.68 10.44c-.97 0-1.78-.9-1.78-2s.79-2 1.78-2c1 0 1.8.91 1.78 2 0 1.1-.79 2-1.78 2Zm6.59 0c-.98 0-1.78-.9-1.78-2s.78-2 1.78-2c1 0 1.8.91 1.78 2 0 1.1-.78 2-1.78 2Z"
        fill="#1F1F1F"
      />
    </svg>
  );
}

function TelegramSocialIcon() {
  return (
    <svg
      aria-hidden="true"
      height="14"
      viewBox="0 0 16 16"
      width="14"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm3.69 5.49-1.23 5.82c-.09.4-.34.5-.69.31L8 10.32l-.92.88c-.1.1-.19.19-.39.19l.14-1.98 3.64-3.28c.16-.14-.03-.22-.24-.08L5.74 8.88l-1.94-.6c-.42-.13-.43-.42.09-.62l7.59-2.92c.35-.13.66.08.55.62l-.34.13Z"
        fill="#1F1F1F"
      />
    </svg>
  );
}

function FastBridgeAppFooter() {
  return (
    <footer className="fastbridge-app-footer">
      <div className="fastbridge-app-footer-left">
        <div className="fastbridge-powered-by">
          <span>Powered by</span>
          <img
            alt="Avail"
            className="fastbridge-footer-avail-logo"
            height={108}
            src="/landing-assets/avail-logo.png"
            width={332}
          />
        </div>
        <div aria-hidden="true" className="fastbridge-footer-divider" />
        <span className="fastbridge-footer-copy">
          © Avail Project. All rights reserved.
        </span>
      </div>

      <div className="fastbridge-app-footer-right">
        <div className="fastbridge-footer-links">
          <Link className="fastbridge-footer-link" to="/faqs">
            FAQ
          </Link>
          <Link className="fastbridge-footer-link" to="/contact">
            Get in touch
          </Link>
          <a
            className="fastbridge-footer-link"
            href="https://widgets.availproject.org/docs/components/swaps"
            rel="noopener noreferrer"
            target="_blank"
          >
            Build
          </a>
        </div>
        <div aria-hidden="true" className="fastbridge-footer-divider" />
        <div className="fastbridge-footer-socials">
          <a
            aria-label="FastBridge on X"
            className="fastbridge-footer-icon-link"
            href="https://x.com/AvailProject"
            rel="noopener noreferrer"
            target="_blank"
          >
            <XSocialIcon />
          </a>
          <a
            aria-label="Avail Discord"
            className="fastbridge-footer-icon-link fastbridge-footer-icon-link-discord"
            href="https://discord.com/invite/AvailProject"
            rel="noopener noreferrer"
            target="_blank"
          >
            <DiscordSocialIcon />
          </a>
          <a
            aria-label="Avail Telegram"
            className="fastbridge-footer-icon-link"
            href="https://t.me/AvailCommunity"
            rel="noopener noreferrer"
            target="_blank"
          >
            <TelegramSocialIcon />
          </a>
        </div>
      </div>
    </footer>
  );
}

const GRADIENT_ASSETS = [
  "/landing-new/assets/chain-gradients/universal-ribbon.png",
  "/landing-new/assets/chain-gradients/citrea-ribbon.png",
  "/landing-new/assets/chain-gradients/ethereum-ribbon.png",
  "/landing-new/assets/chain-gradients/optimism-ribbon.png",
  "/landing-new/assets/chain-gradients/polygon-ribbon.png",
  "/landing-new/assets/chain-gradients/arbitrum-ribbon.png",
  "/landing-new/assets/chain-gradients/avalanche-ribbon.png",
  "/landing-new/assets/chain-gradients/hyperevm-ribbon.png",
  "/landing-new/assets/chain-gradients/monad-ribbon.png",
  "/landing-new/assets/chain-gradients/megaeth-ribbon.png",
  "/landing-new/assets/chain-gradients/base-ribbon.png",
  "/landing-new/assets/chain-gradients/scroll-ribbon.png",
  "/landing-new/assets/chain-gradients/bnb-ribbon.png",
];

const isAppDown =
  import.meta.env.VITE_IS_APP_DOWN === "true" ||
  import.meta.env.VITE_IS_APP_DOWN === "1";

export default function App() {
  const { appConfig } = useRuntime();
  const activeBg =
    appConfig.ribbonPng ||
    "/landing-new/assets/chain-gradients/universal-ribbon.png";

  const [bg1, setBg1] = useState(activeBg);
  const [bg2, setBg2] = useState("");
  const [showBg1, setShowBg1] = useState(true);

  // Preload all gradients in background on mount
  useEffect(() => {
    for (const url of GRADIENT_ASSETS) {
      const img = new Image();
      img.src = url;
    }
  }, []);

  // Double-buffered transition for backgrounds
  useEffect(() => {
    if (activeBg === bg1 || activeBg === bg2) {
      if (activeBg === bg1) {
        setShowBg1(true);
      } else {
        setShowBg1(false);
      }
      return;
    }

    if (showBg1) {
      setBg2(activeBg);
      setShowBg1(false);
    } else {
      setBg1(activeBg);
      setShowBg1(true);
    }
  }, [activeBg, bg1, bg2, showBg1]);

  return (
    <Web3Provider appConfig={appConfig}>
      <NexusProvider config={NEXUS_PROVIDER_CONFIG}>
        <div className="fastbridge-app-shell">
          <div
            className="fastbridge-app-bg"
            style={{
              backgroundImage: `url(${bg1})`,
              opacity: showBg1 ? 1 : 0,
            }}
          />
          <div
            className="fastbridge-app-bg"
            style={{
              backgroundImage: bg2 ? `url(${bg2})` : "none",
              opacity: showBg1 ? 0 : 1,
            }}
          />
          <Navbar />
          {isAppDown ? <MaintenanceBanner /> : null}
          <main className="fastbridge-app-main">
            {isAppDown ? null : <FastBridgeShowcase />}
          </main>
          <FastBridgeAppFooter />
        </div>
        <Toaster />
        {/* Removed CTA from app.tsx root */}
      </NexusProvider>
    </Web3Provider>
  );
}
