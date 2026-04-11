"use client";
import { useAppKit } from "@reown/appkit/react";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useRuntime } from "@/providers/runtime-context";

export default function Navbar() {
  const { chainFeatures } = useRuntime();
  const { isConnected, address } = useAccount();
  const { open } = useAppKit();

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

  const shortAddress = useMemo(() => {
    if (!address) {
      return "";
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  return (
    <nav className="relative z-10 w-full overflow-x-hidden border-border border-b bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 min-w-0 items-center justify-between">
          <div className="flex min-w-0 shrink items-center overflow-hidden">
            <a
              className="flex items-center"
              href="/"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
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

          <div
            className="flex shrink-0 items-center"
            onClickCapture={handleWalletClick}
          >
            {isConnected ? (
              <button
                className="flex items-center gap-2 rounded bg-gray-100 px-[14px] py-2 font-medium text-[#161615] text-sm transition-colors hover:bg-gray-200"
                onClick={() => open()}
                type="button"
              >
                {shortAddress}
              </button>
            ) : (
              <button
                className="flex items-center gap-2 rounded bg-[#161615] px-[14px] py-2 font-medium text-sm text-white transition-opacity hover:opacity-90"
                onClick={() => open({ view: "Connect" })}
                type="button"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
