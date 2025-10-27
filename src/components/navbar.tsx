"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import config from "../../config";

export default function Navbar() {
  return (
    <nav className="bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <img
              src={config.chainLogoUrl}
              alt={config.chainName}
              width={150}
              height={40}
              className="h-8 w-auto"
            />
            <div
              className="text-xl"
              style={{
                marginLeft: "10px",
                fontWeight: "100",
                paddingTop: "5px",
              }}
            >
              Fast Bridge by
            </div>
            <a
              className="text-xl"
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
          <div className="flex items-center">
            <ConnectButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
