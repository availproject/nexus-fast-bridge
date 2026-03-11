"use client";
import { appConfig, chainFeatures } from "@fastbridge/runtime";
import { ConnectKitButton } from "connectkit";
import { useAccount } from "wagmi";
import { withBasePath } from "@/lib/utils";
import AvailLogo from "/avail_logo.svg";

export default function Navbar() {
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
    <nav className="relative z-10 w-full overflow-x-hidden border-border border-b">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 min-w-0 items-center justify-between">
          <div className="flex min-w-0 shrink items-center overflow-hidden">
            {appConfig.useChainLogo && (
              <img
                alt={appConfig.chainName}
                className="h-8 w-auto"
                height={40}
                src={withBasePath(appConfig.chainLogoUrl)}
                width={150}
              />
            )}
            {!appConfig.useChainLogo && (
              <div
                className="truncate font-light text-2xl sm:text-3xl"
                style={{
                  marginLeft: "10px",
                  textTransform: "uppercase",
                  color: appConfig.primaryColor,
                  letterSpacing: "0.1em",
                }}
              >
                {appConfig.chainName}
              </div>
            )}
            <div
              className="hidden text-xl md:block"
              style={{
                marginLeft: "5px",
                fontWeight: "100",
                paddingTop: "5px",
              }}
            >
              Fast Bridge by
            </div>
            <a
              className="hidden text-xl md:block"
              href="https://availproject.org"
              rel="noopener noreferrer"
              style={{
                marginLeft: "5px",
                fontWeight: "100",
                paddingTop: "5px",
              }}
              target="_blank"
            >
              <img alt="Avail Logo" height={20} src={AvailLogo} width={75} />
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
