"use client";
import { useAppKit } from "@reown/appkit/react";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { reportConnectWalletConversion } from "@/lib/google-tag";
import { AddressIdenticon } from "./nexus-one/components/address-identicon";

export default function Navbar() {
  const { isConnected, address } = useAccount();
  const { open } = useAppKit();

  const handleConnectWalletClick = () => {
    reportConnectWalletConversion();
    open({ view: "Connect" });
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

          <div className="flex shrink-0 items-center">
            {isConnected ? (
              <button
                className="fastbridge-wallet-button"
                onClick={() => open()}
                style={{
                  display: "flex",
                  height: "56px",
                  padding: "14.4px 26.4px 16px 24.8px",
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: "12px",
                  border: "1px solid #E8E8E7",
                  background: "#FFFFFE",
                  boxShadow: "0 1px 4px 0 rgba(85, 85, 85, 0.05)",
                  color: "#161615",
                  fontFamily: '"Geist", system-ui, sans-serif',
                  fontSize: "16px",
                  fontStyle: "normal",
                  fontWeight: 400,
                  lineHeight: "18px",
                  gap: "8px",
                  boxSizing: "border-box",
                  cursor: "pointer",
                }}
                type="button"
              >
                {address && <AddressIdenticon address={address} size={20} />}
                <span>{shortAddress}</span>
              </button>
            ) : (
              <button
                className="fastbridge-wallet-button"
                onClick={handleConnectWalletClick}
                style={{
                  display: "flex",
                  height: "56px",
                  padding: "14.4px 26.4px 16px 24.8px",
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: "12px",
                  border: "1px solid #E8E8E7",
                  background: "#FFFFFE",
                  boxShadow: "0 1px 4px 0 rgba(85, 85, 85, 0.05)",
                  color: "#161615",
                  fontFamily: '"Geist", system-ui, sans-serif',
                  fontSize: "16px",
                  fontStyle: "normal",
                  fontWeight: 400,
                  lineHeight: "18px",
                  gap: "8px",
                  boxSizing: "border-box",
                  cursor: "pointer",
                }}
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
