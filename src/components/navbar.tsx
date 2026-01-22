"use client";
import { ConnectKitButton } from "connectkit";
import config from "../../config";

export default function Navbar() {
  return (
    <nav className="relative border-b border-border z-10 w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between h-16 min-w-0">
          <div className="flex items-center min-w-0 shrink overflow-hidden">
            {config.useChainLogo && (
              <img
                src="/avail_logo.svg"
                alt={config.chainName}
                width={150}
                height={40}
                className="h-8 w-auto"
              />
            )}
            {!config.useChainLogo && (
              <div
                className="text-2xl sm:text-3xl font-light truncate"
                style={{
                  marginLeft: "10px",
                  textTransform: "uppercase",
                  color: config.primaryColor,
                  letterSpacing: "0.1em",
                }}
              >
                {config.chainName}
              </div>
            )}
            <div
              className="hidden md:block text-xl"
              style={{
                marginLeft: "5px",
                fontWeight: "100",
                paddingTop: "5px",
              }}
            >
              Fast Bridge by
            </div>
            <a
              className="hidden md:block text-xl"
              href="https://availproject.org"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginLeft: "5px",
                fontWeight: "100",
                paddingTop: "5px",
              }}
            >
              <img
                src="/avail_logo.svg"
                alt="Avail Logo"
                width={75}
                height={20}
              />
            </a>
          </div>

          {/* Right side - Wallet connect only */}
          <div className="flex items-center shrink-0">
            <ConnectKitButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
