"use client";
import { ConnectKitButton } from "connectkit";
import { useAccount } from "wagmi";
import { useRuntime } from "@/providers/runtime-context";

export default function Navbar() {
  const { chainFeatures } = useRuntime();
  const { isConnected } = useAccount();

  const handleWalletClick = () => {
    if (
      !isConnected &&
      chainFeatures.enableGtagOnConnectWallet &&
      typeof window !== "undefined" &&
      // @ts-expect-error - gtag_report_conversion is conditionally added by a global script
      typeof window.gtag_report_conversion === "function"
    ) {
      // @ts-expect-error - expected injected global method
      window.gtag_report_conversion(window.location.href);
    }
  };

  return (
    <nav className="relative z-10 w-full overflow-x-hidden border-border border-b bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 min-w-0 items-center justify-between">
          {/* Left side: chain logo + "Fast Bridge by Avail" */}
          <div className="flex min-w-0 shrink items-center overflow-hidden">
            <a
              className="flex items-center"
              href="https://availproject.org"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
              target="_blank"
            >
              <img
                alt=""
                height={24}
                src="/landing-assets/fastbridge-icon.svg"
                style={{ width: "24px", height: "24px" }}
                width={24}
              />
              <span
                style={{
                  marginLeft: "4px",
                  fontFamily: '"Delight", sans-serif',
                  fontSize: "24px",
                  fontWeight: 600,
                  lineHeight: "29px",
                  color: "#161615",
                  letterSpacing: "0.48px",
                }}
              >
                fastbridge
              </span>
            </a>
          </div>

          {/* Right side - Wallet connect only */}
          <div
            className="flex shrink-0 items-center"
            onClickCapture={handleWalletClick}
          >
            <ConnectKitButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
