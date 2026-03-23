"use client";
import { ConnectKitButton } from "connectkit";
import { useAccount } from "wagmi";
import { useRuntime } from "@/providers/runtime-context";
import AvailLogo from "/avail_logo.svg";

export default function Navbar() {
  const { appConfig, chainFeatures } = useRuntime();
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
            {/* Logo area — fixed size container so neighbours don't jump */}
            {/* <div className="relative flex h-10 min-w-0 shrink-0 items-center">
              <AnimatePresence initial={false} mode="wait">
                {appConfig.useChainLogo ? (
                  <motion.img
                    alt={appConfig.chainName}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    className="h-8 w-auto max-w-[130px] object-contain object-left sm:h-10 sm:max-w-none"
                    exit={{ opacity: 0, filter: "blur(4px)" }}
                    height={40}
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    key={appConfig.chainLogoUrl}
                    src={withBasePath(appConfig.chainLogoUrl)}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    width={160}
                  />
                ) : (
                  <motion.div
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    className="truncate font-light text-2xl sm:text-3xl"
                    exit={{ opacity: 0, filter: "blur(4px)" }}
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    key={`text-${appConfig.chainName}`}
                    style={{
                      marginLeft: "10px",
                      textTransform: "uppercase",
                      color: appConfig.primaryColor,
                      letterSpacing: "0.1em",
                    }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                  >
                    {appConfig.chainName}
                  </motion.div>
                )}
              </AnimatePresence>
            </div> */}

            {/* <div
              className="hidden text-xl md:block"
              style={{
                marginLeft: "5px",
                fontWeight: "100",
                paddingTop: "5px",
              }}
            >
              Fast Bridge by
            </div> */}
            <a
              className="flex items-start gap-0.5 font-delight text-[16px] max-md:flex-col md:items-center md:gap-2 md:text-[32px]"
              href="https://availproject.org"
              rel="noopener noreferrer"
              style={{
                fontWeight: "600",
                transition: "color 0.5s ease-in-out",
                color: appConfig.primaryColor,
              }}
              target="_blank"
            >
              <img
                alt="Avail Logo"
                className="h-auto w-6 md:w-8"
                height={24}
                src={AvailLogo}
                width={24}
              />
              <span className="text-[#161615]">avail</span>
              fastbridge
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
