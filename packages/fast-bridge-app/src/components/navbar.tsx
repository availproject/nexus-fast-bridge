"use client";
import { useAppKit } from "@reown/appkit/react";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { reportConnectWalletConversion } from "@/lib/google-tag";
import { AddressIdenticon } from "./nexus-one/components/address-identicon";

export default function Navbar() {
  const { isConnected, address } = useAccount();
  const { open } = useAppKit();

  const handleWalletClick = () => {
    if (!isConnected) {
      reportConnectWalletConversion();
    }
  };

  const shortAddress = useMemo(() => {
    if (!address) {
      return "";
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  return (
    <nav className="fastbridge-app-nav">
      <div className="fastbridge-app-nav-inner">
        <div className="flex min-w-0 items-center justify-between">
          <div className="flex min-w-0 shrink items-center overflow-hidden">
            <a
              className="fastbridge-app-logo"
              href="/"
              rel="noopener noreferrer"
            >
              <img
                alt="FastBridge"
                className="fastbridge-app-logo-image"
                height={160}
                src="/fastbridge-logo.png"
                width={758}
              />
            </a>
          </div>

          <div
            className="flex shrink-0 items-center"
            onClickCapture={handleWalletClick}
          >
            {isConnected ? (
              <button
                className="fastbridge-wallet-button"
                onClick={() => open()}
                type="button"
              >
                {address && <AddressIdenticon address={address} size={16} />}
                <span>{shortAddress}</span>
              </button>
            ) : (
              <button
                className="fastbridge-wallet-button"
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
